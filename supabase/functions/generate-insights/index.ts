import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
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

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not configured");
    }

    // 1. Query aggregated statistics from Postgres
    
    // Stats A: Issues by status
    const { data: statusStats } = await supabase
      .from("issues")
      .select("status")
      .then(res => {
        const counts: Record<string, number> = {};
        res.data?.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
        return { data: counts };
      });

    // Stats B: Issues by category
    const { data: categoryStats } = await supabase
      .from("issues")
      .select("category")
      .then(res => {
        const counts: Record<string, number> = {};
        res.data?.forEach(r => { 
          if (r.category) counts[r.category] = (counts[r.category] || 0) + 1; 
        });
        return { data: counts };
      });

    // Stats C: Hotspots (grouping by rounded coordinates to create grid areas of ~1km)
    // We execute this using a raw SQL format or rpc if available. Since raw SQL via client is restricted,
    // we can fetch active issues' lat/long and group them in Javascript! This is robust and client-compatible.
    const { data: activeCoords } = await supabase
      .from("issues")
      .select("latitude, longitude, category")
      .in("status", ["reported", "verified", "assigned", "in_progress"]);

    const grids: Record<string, { lat: number; lon: number; count: number; categories: Record<string, number> }> = {};
    activeCoords?.forEach(c => {
      const latGrid = Math.round(c.latitude * 100) / 100;
      const lonGrid = Math.round(c.longitude * 100) / 100;
      const key = `${latGrid},${lonGrid}`;
      if (!grids[key]) {
        grids[key] = { lat: latGrid, lon: lonGrid, count: 0, categories: {} };
      }
      grids[key].count++;
      if (c.category) {
        grids[key].categories[c.category] = (grids[key].categories[c.category] || 0) + 1;
      }
    });

    // Sort grids to find the top hotspots
    const hotspots = Object.values(grids)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Stats D: Avg resolution times
    // Fetch issues that are resolved, calculate differences
    const { data: resolvedIssues } = await supabase
      .from("issues")
      .select("category, created_at, updated_at")
      .eq("status", "resolved");

    const categoryResolutionTimes: Record<string, { totalHours: number; count: number }> = {};
    resolvedIssues?.forEach(ri => {
      if (ri.category && ri.created_at && ri.updated_at) {
        const durationMs = new Date(ri.updated_at).getTime() - new Date(ri.created_at).getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        if (!categoryResolutionTimes[ri.category]) {
          categoryResolutionTimes[ri.category] = { totalHours: 0, count: 0 };
        }
        categoryResolutionTimes[ri.category].totalHours += durationHours;
        categoryResolutionTimes[ri.category].count++;
      }
    });

    const avgResolutionStats = Object.entries(categoryResolutionTimes).map(([cat, val]) => ({
      category: cat,
      avg_hours: Math.round((val.totalHours / val.count) * 10) / 10,
      total_resolved: val.count
    }));

    // 2. Format findings for Claude
    const statisticsSummary = {
      total_issues_by_status: statusStats || {},
      total_issues_by_category: categoryStats || {},
      active_hotspots: hotspots.map(h => ({
        grid_area: `Grid (${h.lat}, ${h.lon})`,
        active_count: h.count,
        categories: h.categories
      })),
      average_resolution_by_category: avgResolutionStats
    };

    const prompt = `You are a civic analytics AI assistant. You are analyzing infrastructure issues reported by citizens in a local community.

Here are the aggregated statistics of current issues:
${JSON.stringify(statisticsSummary, null, 2)}

Please analyze this data and generate three insights for the city administrator dashboard:
1. A general "weekly_summary" assessing the state of the city (e.g. total volume, most frequent complaints, and resolution speed).
2. A specific "hotspot" warning identifying the coordinate area with the highest concentration of active reports and which issues are concentrated there.
3. A "trend" insight noting category changes or warning about slow-resolving categories.

You must respond ONLY with a valid JSON array of 3 objects matching this structure:
[
  {
    "insight_text": "A clear, professionally phrased sentence outlining the weekly summary.",
    "insight_type": "weekly_summary",
    "related_area": "City-Wide"
  },
  {
    "insight_text": "An insight about hotspots, identifying critical zones and concentrated issue types.",
    "insight_type": "hotspot",
    "related_area": "Grid (latitude, longitude) or Ward sector"
  },
  {
    "insight_text": "An insight noting trend analysis, e.g., category growth or resolution bottleneck details.",
    "insight_type": "trend",
    "related_area": "Category Name"
  }
]`;

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API request failed: ${response.status} - ${errText}`);
    }

    const claudeResult = await response.json();
    const responseText = claudeResult.content[0].text.trim();

    // Parse JSON response
    let insightsArray: any[] = [];
    try {
      const jsonStart = responseText.indexOf("[");
      const jsonEnd = responseText.lastIndexOf("]");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        insightsArray = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
      } else {
        insightsArray = JSON.parse(responseText);
      }
    } catch (e) {
      console.error("Failed to parse JSON response from Claude:", responseText);
      throw new Error("Invalid JSON response from AI model");
    }

    // 3. Write insights into the database
    // Delete old insights first to avoid dashboard clutter (or keep them and append, but clean up is nicer for weekly dashboard)
    await supabase.from("insights").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insertError } = await supabase
      .from("insights")
      .insert(insightsArray);

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, insights: insightsArray }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err: any) {
    console.error("Error in generate-insights function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
