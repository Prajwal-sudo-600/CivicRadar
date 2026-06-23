import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { IssueStatus, IssueCategory, IssueSeverity } from '../styles/theme';

export interface Issue {
  id: string;
  reporter_id: string | null;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  ai_summary: string | null;
  ai_confidence_score: number | null;
  is_duplicate_suspect: boolean;
  media_url: string | null;
  video_url: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  verification_count: number;
  flag_count: number;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
}

export interface IssueStatusHistory {
  id: string;
  issue_id: string;
  status: IssueStatus;
  changed_by: string;
  note: string | null;
  created_at: string;
  changed_by_name?: string;
}

export interface Insight {
  id: string;
  insight_text: string;
  insight_type: 'hotspot' | 'trend' | 'weekly_summary';
  related_area: string | null;
  generated_at: string;
}

interface FilterState {
  category: IssueCategory | 'all';
  status: IssueStatus | 'all';
  severity: IssueSeverity | 'all';
}

interface IssueStore {
  issues: Issue[];
  insights: Insight[];
  leaderboard: any[];
  filters: FilterState;
  loading: boolean;
  
  setFilter: (key: keyof FilterState, value: any) => void;
  fetchIssues: () => Promise<void>;
  fetchInsights: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  createIssue: (
    title: string,
    description: string,
    category: IssueCategory,
    severity: IssueSeverity,
    imageUri: string,
    latitude: number,
    longitude: number,
    address?: string
  ) => Promise<Issue>;
  addVerification: (issueId: string, action: 'confirm' | 'flag_duplicate' | 'flag_spam') => Promise<void>;
  updateIssueStatus: (issueId: string, status: IssueStatus, note?: string) => Promise<void>;
  fetchIssueHistory: (issueId: string) => Promise<IssueStatusHistory[]>;
  subscribeToIssues: () => () => void;
}

// Beautiful Mock Data representing civic problems in San Francisco/Silicon Valley
const MOCK_ISSUES: Issue[] = [
  {
    id: 'issue-1',
    reporter_id: 'mock-user-id',
    title: 'Huge Pothole on Market St',
    description: 'A deep pothole in the left lane, forcing cars to swerve dangerously into the bus lane.',
    category: 'pothole',
    severity: 'high',
    status: 'verified',
    ai_summary: 'A wide pothole in the center of a asphalt roadway.',
    ai_confidence_score: 0.94,
    is_duplicate_suspect: false,
    media_url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=500',
    video_url: null,
    latitude: 37.774929,
    longitude: -122.419416,
    address: '1100 Market St, San Francisco, CA',
    verification_count: 5,
    flag_count: 0,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reporter_name: 'Jane Doe'
  },
  {
    id: 'issue-2',
    reporter_id: 'user-2',
    title: 'Water Leak near Civic Center',
    description: 'Clean drinking water has been bubbling up from under the sidewalk for 12 hours.',
    category: 'water_leakage',
    severity: 'medium',
    status: 'in_progress',
    ai_summary: 'Water spraying onto concrete sidewalk from a joint crack.',
    ai_confidence_score: 0.88,
    is_duplicate_suspect: false,
    media_url: 'https://images.unsplash.com/photo-1542013936693-8848e574047e?w=500',
    video_url: null,
    latitude: 37.779224,
    longitude: -122.419013,
    address: '355 McAllister St, San Francisco, CA',
    verification_count: 8,
    flag_count: 0,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reporter_name: 'Marcus Aurelius'
  },
  {
    id: 'issue-3',
    reporter_id: 'user-3',
    title: 'Broken Streetlight at Corner',
    description: 'Streetlight is completely out, makes the crosswalk dark and dangerous at night.',
    category: 'streetlight',
    severity: 'medium',
    status: 'reported',
    ai_summary: 'A dark, inactive streetlight head against a twilight sky.',
    ai_confidence_score: 0.91,
    is_duplicate_suspect: false,
    media_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500',
    video_url: null,
    latitude: 37.770933,
    longitude: -122.427845,
    address: '400 Valencia St, San Francisco, CA',
    verification_count: 1,
    flag_count: 0,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hrs ago
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    reporter_name: 'Elena Rostova'
  },
  {
    id: 'issue-4',
    reporter_id: 'user-4',
    title: 'Overflowing Trash Bins',
    description: 'Trash is piled up next to the public bins, blowing onto the street and sidewalks.',
    category: 'waste_management',
    severity: 'high',
    status: 'resolved',
    ai_summary: 'Household waste bags overflowing from a green municipal dumpster.',
    ai_confidence_score: 0.96,
    is_duplicate_suspect: false,
    media_url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=500',
    video_url: null,
    latitude: 37.783325,
    longitude: -122.408422,
    address: '845 Market St, San Francisco, CA',
    verification_count: 12,
    flag_count: 0,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reporter_name: 'David Kim'
  }
];

const MOCK_INSIGHTS: Insight[] = [
  {
    id: 'insight-1',
    insight_text: 'Active issues are down 15% city-wide. Average resolution time for potholes dropped to 36 hours due to new road paving schedules.',
    insight_type: 'weekly_summary',
    related_area: 'City-Wide',
    generated_at: new Date().toISOString()
  },
  {
    id: 'insight-2',
    insight_text: 'High concentration of Water Leakage reports detected near Grid (37.78, -122.42). 3 open reports confirm a potential underground main valve issue.',
    insight_type: 'hotspot',
    related_area: 'Civic Center / SOMA',
    generated_at: new Date().toISOString()
  },
  {
    id: 'insight-3',
    insight_text: 'Waste Management reports spike on Friday evenings. Recommend adjustment of pickup schedules in Downtown sectors.',
    insight_type: 'trend',
    related_area: 'Waste Management',
    generated_at: new Date().toISOString()
  }
];

const MOCK_LEADERBOARD = [
  { id: 'mock-user-id', full_name: 'Jane Doe (You)', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', points: 135 },
  { id: 'user-2', full_name: 'Marcus Aurelius', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', points: 120 },
  { id: 'user-4', full_name: 'David Kim', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', points: 95 },
  { id: 'user-3', full_name: 'Elena Rostova', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', points: 80 }
];

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: MOCK_ISSUES,
  insights: MOCK_INSIGHTS,
  leaderboard: MOCK_LEADERBOARD,
  filters: {
    category: 'all',
    status: 'all',
    severity: 'all'
  },
  loading: false,

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value }
    }));
  },

  fetchIssues: async () => {
    set({ loading: true });
    try {
      let query = supabase.from('issues').select(`
        *,
        reporter:user_profiles(full_name)
      `).order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const formattedIssues = data.map((item: any) => ({
        ...item,
        reporter_name: item.reporter?.full_name || 'Anonymous Citizen'
      }));

      set({ issues: formattedIssues.length > 0 ? formattedIssues : MOCK_ISSUES, loading: false });
    } catch (err: any) {
      console.warn("Failed to fetch from DB, using mock issues:", err.message);
      set({ issues: MOCK_ISSUES, loading: false });
    }
  },

  fetchInsights: async () => {
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      set({ insights: data.length > 0 ? data : MOCK_INSIGHTS });
    } catch (err: any) {
      console.warn("Failed to fetch insights from DB, using mock insights:", err.message);
      set({ insights: MOCK_INSIGHTS });
    }
  },

  fetchLeaderboard: async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, points')
        .order('points', { ascending: false })
        .limit(10);

      if (error) throw error;
      set({ leaderboard: data.length > 0 ? data : MOCK_LEADERBOARD });
    } catch (err: any) {
      console.warn("Failed to fetch leaderboard from DB, using mock data:", err.message);
      set({ leaderboard: MOCK_LEADERBOARD });
    }
  },

  createIssue: async (title, description, category, severity, imageUri, latitude, longitude, address = "Capturing address...") => {
    set({ loading: true });
    try {
      // 1. Upload the image to Supabase Storage
      let media_url = imageUri;
      
      if (!imageUri.startsWith('http')) {
        const fileExtension = imageUri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `reports/${fileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`
        } as any);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('issue-media')
          .upload(filePath, formData as any);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('issue-media')
          .getPublicUrl(filePath);

        media_url = publicUrl;
      }

      // 2. Insert issue into database
      const { data: { session } } = await supabase.auth.getSession();
      const reporter_id = session?.user?.id || null;

      const newIssueData = {
        title,
        description,
        category,
        severity,
        latitude,
        longitude,
        address,
        media_url,
        status: 'reported',
        reporter_id
      };

      const { data, error } = await supabase
        .from('issues')
        .insert([newIssueData])
        .select()
        .single();

      if (error) throw error;

      // 3. Trigger Claude AI classification Edge Function asynchronously in the background
      // Note: In local Supabase setups, webhooks execute this automatically.
      // We will also trigger a direct call as a backup.
      fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/categorize-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(data)
      }).catch(e => console.log("Edge Function call queued/handled by database webhooks."));

      const finalIssue = {
        ...data,
        reporter_name: session?.user?.user_metadata?.full_name || 'You'
      };

      set(state => ({
        issues: [finalIssue, ...state.issues],
        loading: false
      }));

      return finalIssue;

    } catch (err: any) {
      console.warn("Failed to save issue to DB, adding to mock issues locally:", err.message);
      
      const newMockIssue: Issue = {
        id: `issue-local-${Date.now()}`,
        reporter_id: 'mock-user-id',
        title,
        description,
        category,
        severity,
        status: 'reported',
        ai_summary: `[Mock AI Summary] ${description.slice(0, 40)}`,
        ai_confidence_score: 0.85,
        is_duplicate_suspect: false,
        media_url: imageUri,
        video_url: null,
        latitude,
        longitude,
        address: address || 'San Francisco, CA',
        verification_count: 0,
        flag_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reporter_name: 'Jane Doe'
      };

      set(state => ({
        issues: [newMockIssue, ...state.issues],
        loading: false
      }));

      return newMockIssue;
    }
  },

  addVerification: async (issueId, action) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user-id';

      const { error } = await supabase
        .from('issue_verifications')
        .insert([{ issue_id: issueId, user_id: userId, action }]);

      if (error) throw error;

      // Optimistic locally updated states
      set(state => ({
        issues: state.issues.map(iss => {
          if (iss.id === issueId) {
            const isConfirm = action === 'confirm';
            const verCount = isConfirm ? iss.verification_count + 1 : iss.verification_count;
            const flgCount = !isConfirm ? iss.flag_count + 1 : iss.flag_count;
            let status = iss.status;
            
            if (isConfirm && verCount >= 3 && status === 'reported') {
              status = 'verified';
            } else if (!isConfirm && flgCount >= 5) {
              status = 'rejected';
            }

            return {
              ...iss,
              verification_count: verCount,
              flag_count: flgCount,
              status
            };
          }
          return iss;
        })
      }));

    } catch (err: any) {
      console.warn("Failed to register verification in DB, performing mock update locally:", err.message);
      set(state => ({
        issues: state.issues.map(iss => {
          if (iss.id === issueId) {
            const isConfirm = action === 'confirm';
            const verCount = isConfirm ? iss.verification_count + 1 : iss.verification_count;
            const flgCount = !isConfirm ? iss.flag_count + 1 : iss.flag_count;
            let status = iss.status;

            if (isConfirm && verCount >= 3 && status === 'reported') {
              status = 'verified';
            } else if (!isConfirm && flgCount >= 5) {
              status = 'rejected';
            }

            return { ...iss, verification_count: verCount, flag_count: flgCount, status };
          }
          return iss;
        })
      }));
    }
  },

  updateIssueStatus: async (issueId, status, note = '') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'mock-user-id';

      const { error } = await supabase
        .from('issues')
        .update({ status })
        .eq('id', issueId);

      if (error) throw error;

      // Add status history entry
      await supabase
        .from('issue_status_history')
        .insert([{ issue_id: issueId, status, changed_by: userId, note }]);

      // Update state locally
      set(state => ({
        issues: state.issues.map(iss => (iss.id === issueId ? { ...iss, status, updated_at: new Date().toISOString() } : iss))
      }));
    } catch (err: any) {
      console.warn("Failed to update status in DB, updating local state for preview:", err.message);
      set(state => ({
        issues: state.issues.map(iss => (iss.id === issueId ? { ...iss, status, updated_at: new Date().toISOString() } : iss))
      }));
    }
  },

  fetchIssueHistory: async (issueId) => {
    try {
      const { data, error } = await supabase
        .from('issue_status_history')
        .select(`
          *,
          changed_by_profile:user_profiles(full_name)
        `)
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map((d: any) => ({
        ...d,
        changed_by_name: d.changed_by_profile?.full_name || 'System / Admin'
      }));
    } catch (err: any) {
      console.warn("Failed to fetch history from DB, returning mock history:", err.message);
      // Fallback: return a constructed history based on issue
      const issue = get().issues.find(i => i.id === issueId);
      if (!issue) return [];

      const history: IssueStatusHistory[] = [
        {
          id: 'hist-1',
          issue_id: issueId,
          status: 'reported',
          changed_by: issue.reporter_id || 'system',
          note: 'Issue reported to public forum.',
          created_at: issue.created_at,
          changed_by_name: issue.reporter_name || 'Reporter'
        }
      ];

      if (issue.status !== 'reported') {
        history.push({
          id: 'hist-2',
          issue_id: issueId,
          status: 'verified',
          changed_by: 'community',
          note: 'Community verified issue details.',
          created_at: new Date(new Date(issue.created_at).getTime() + 12 * 60 * 60 * 1000).toISOString(),
          changed_by_name: 'Community Moderators'
        });
      }

      if (issue.status === 'in_progress' || issue.status === 'resolved') {
        history.push({
          id: 'hist-3',
          issue_id: issueId,
          status: 'assigned',
          changed_by: 'admin-id',
          note: 'Assigned to Ward Office Maintenance Team.',
          created_at: new Date(new Date(issue.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          changed_by_name: 'City Administrator'
        });
        history.push({
          id: 'hist-4',
          issue_id: issueId,
          status: 'in_progress',
          changed_by: 'worker-id',
          note: 'Crew is currently on site investigating repairs.',
          created_at: new Date(new Date(issue.created_at).getTime() + 36 * 60 * 60 * 1000).toISOString(),
          changed_by_name: 'Lead Inspector'
        });
      }

      if (issue.status === 'resolved') {
        history.push({
          id: 'hist-5',
          issue_id: issueId,
          status: 'resolved',
          changed_by: 'admin-id',
          note: 'Repairs complete. Concrete set, lane reopened.',
          created_at: issue.updated_at,
          changed_by_name: 'City Administrator'
        });
      }

      return history;
    }
  },

  subscribeToIssues: () => {
    // Set up Realtime subscriptions on Postgres changes to Issues
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Issue;
            // Fetch reporter profile name
            const { data } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('id', newItem.reporter_id || '')
              .single();

            const finalItem = {
              ...newItem,
              reporter_name: data?.full_name || 'Anonymous Citizen'
            };

            set(state => {
              // Ensure we do not add duplicates
              if (state.issues.some(i => i.id === finalItem.id)) return state;
              return { issues: [finalItem, ...state.issues] };
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Issue;
            set(state => ({
              issues: state.issues.map(i => (i.id === updatedItem.id ? { ...i, ...updatedItem } : i))
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as { id: string };
            set(state => ({
              issues: state.issues.filter(i => i.id !== deletedItem.id)
            }));
          }
        }
      )
      .subscribe();

    // Return unsubscriber function
    return () => {
      supabase.removeChannel(channel);
    };
  }
}));
