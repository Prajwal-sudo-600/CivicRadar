import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request payload (either database webhook payload or direct client request)
    const payload = await req.json();
    let issue: any = null;

    if (payload.record) {
      // Database Webhook structure
      issue = payload.record;
    } else {
      // Direct client call
      issue = payload;
    }

    if (!issue || !issue.id) {
      throw new Error("Missing issue record details");
    }

    const { id, media_url, description, latitude, longitude } = issue;
    if (!media_url) {
      return new Response(JSON.stringify({ error: "No media url provided for classification" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Fetch nearby open issues within a bounding box (roughly 150m radius)
    // 0.0015 degrees is roughly 150 meters
    const latDelta = 0.0015;
    const lonDelta = 0.0015;
    
    const { data: nearbyIssues, error: nearbyError } = await supabase
      .from("issues")
      .select("id, description, category, ai_summary, status")
      .neq("id", id)
      .in("status", ["reported", "verified", "assigned", "in_progress"])
      .gte("latitude", latitude - latDelta)
      .lte("latitude", latitude + latDelta)
      .gte("longitude", longitude - lonDelta)
      .lte("longitude", longitude + lonDelta);

    if (nearbyError) {
      console.error("Error fetching nearby issues:", nearbyError);
    }

    // 2. Query Gemini API with vision capability
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }

    // Prepare nearby issues description for Claude duplicate check
    const nearbyListText = nearbyIssues && nearbyIssues.length > 0 
      ? nearbyIssues.map((ni, idx) => `${idx + 1}. ID: ${ni.id}, Category: ${ni.category}, Summary: ${ni.ai_summary}, Desc: ${ni.description || "none"}`).join("\n")
      : "No nearby open issues found.";

    const prompt = `You are a civic infrastructure analysis assistant. Your job is to analyze the user's uploaded image of an infrastructure issue, categorize it, score its severity, and determine if it is a duplicate of any existing nearby reports.

Here are the nearby issues already reported:
${nearbyListText}

Perform the following tasks:
1. Classify the main issue in the image into one of these categories: "pothole", "water_leakage", "streetlight", "waste_management", "road_damage", "drainage", "public_property_damage", or "other".
2. Assess its severity level: "low", "medium", "high", "critical" (e.g. critical is immediate danger to life/limb, such as a major collapsed road or exposed high-voltage wiring).
3. Provide a confidence score between 0.0 and 1.0.
4. Generate a clear one-sentence "ai_summary" describing what is visibly wrong.
5. Determine if this report is a duplicate suspect (i.e. it describes and shows the exact same physical issue as one of the listed nearby issues). Set "is_duplicate_suspect" to true if there is a highly likely match.

You must respond ONLY with a valid JSON object matching the following structure:
{
  "category": "pothole" | "water_leakage" | "streetlight" | "waste_management" | "road_damage" | "drainage" | "public_property_damage" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "confidence_score": 0.95,
  "ai_summary": "A large, deep pothole in the middle of a two-lane asphalt road.",
  "is_duplicate_suspect": false
}`;

    // Fetch the image and convert to base64 for Claude Vision
    const imageResponse = await fetch(media_url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${media_url}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: contentType,
                  data: base64Image,
                },
              },
              {
                text: `${prompt}\n\nUser Description: ${description || "No description provided."}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API request failed: ${response.status} - ${errText}`);
    }

    const geminiResult = await response.json();
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
      throw new Error("Gemini API returned no candidates");
    }
    const responseText = geminiResult.candidates[0].content.parts[0].text.trim();
    
    // Parse the JSON response
    let aiData;
    try {
      // Find JSON block if Gemini wrapped it in markdown
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        aiData = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
      } else {
        aiData = JSON.parse(responseText);
      }
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", responseText);
      throw new Error("Invalid JSON response from AI model");
    }

    // 3. Update the issues table in Supabase
    // If confidence score is below 0.6, mark status as pending_manual_category (or just log it)
    const updateData: any = {
      category: aiData.category,
      severity: aiData.severity,
      ai_summary: aiData.ai_summary,
      ai_confidence_score: aiData.confidence_score,
      is_duplicate_suspect: aiData.is_duplicate_suspect,
    };

    if (aiData.confidence_score < 0.6) {
      updateData.ai_summary = `[AI Low Confidence] ${aiData.ai_summary}`;
    }

    const { error: updateError } = await supabase
      .from("issues")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, data: updateData }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err: any) {
    console.error("Error in categorize-issue function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
