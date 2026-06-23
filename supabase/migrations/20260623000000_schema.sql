-- Create user profiles table
create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text default 'citizen' check (role in ('citizen', 'moderator', 'admin')),
  points integer default 0,
  created_at timestamptz default now()
);

-- Enable RLS for profiles
alter table public.user_profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone" on public.user_profiles
  for select using (true);

create policy "Users can update their own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- Create issues table
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.user_profiles(id) on delete set null,
  title text,
  description text,
  category text, -- pothole, water_leakage, streetlight, waste_management, road_damage, drainage, public_property_damage, other
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  status text default 'reported' check (status in ('reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected')),
  ai_summary text,
  ai_confidence_score float,
  is_duplicate_suspect boolean default false,
  media_url text,
  video_url text,
  latitude float not null,
  longitude float not null,
  address text,
  verification_count integer default 0,
  flag_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for issues
alter table public.issues enable row level security;

-- Issues Policies
create policy "Issues are viewable by everyone" on public.issues
  for select using (true);

create policy "Authenticated users can report issues" on public.issues
  for insert with check (auth.role() = 'authenticated' and (reporter_id = auth.uid() or reporter_id is null));

create policy "Reporters or Admins can update issues" on public.issues
  for update using (
    auth.uid() = reporter_id or 
    exists (
      select 1 from public.user_profiles 
      where user_profiles.id = auth.uid() and user_profiles.role in ('admin', 'moderator')
    )
  );

-- Create issue verifications table
create table public.issue_verifications (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.issues(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete cascade,
  action text check (action in ('confirm', 'flag_duplicate', 'flag_spam', 'flag_inaccurate')),
  created_at timestamptz default now(),
  unique(issue_id, user_id)
);

-- Enable RLS for verifications
alter table public.issue_verifications enable row level security;

-- Verifications Policies
create policy "Verifications are viewable by everyone" on public.issue_verifications
  for select using (true);

create policy "Authenticated users can verify once per issue" on public.issue_verifications
  for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "Users can delete their own verification" on public.issue_verifications
  for delete using (auth.uid() = user_id);

-- Create status history table
create table public.issue_status_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.issues(id) on delete cascade,
  status text check (status in ('reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected')),
  changed_by uuid references public.user_profiles(id) on delete set null,
  note text,
  created_at timestamptz default now()
);

-- Enable RLS for status history
alter table public.issue_status_history enable row level security;

-- Status History Policies
create policy "Status history is viewable by everyone" on public.issue_status_history
  for select using (true);

create policy "Admins/Moderators/Reporters can insert history" on public.issue_status_history
  for insert with check (auth.role() = 'authenticated');

-- Create user badges table
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  badge_name text not null,
  awarded_at timestamptz default now()
);

-- Enable RLS for badges
alter table public.user_badges enable row level security;

-- Badges Policies
create policy "Badges are viewable by everyone" on public.user_badges
  for select using (true);

-- Create insights table
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  insight_text text not null,
  insight_type text check (insight_type in ('hotspot', 'trend', 'weekly_summary')),
  related_area text,
  generated_at timestamptz default now()
);

-- Enable RLS for insights
alter table public.insights enable row level security;

-- Insights Policies
create policy "Insights are viewable by everyone" on public.insights
  for select using (true);

create policy "Only admins/system can insert insights" on public.insights
  for insert with check (
    exists (
      select 1 from public.user_profiles 
      where user_profiles.id = auth.uid() and user_profiles.role = 'admin'
    )
  );


-----------------------------------------
-- TRIGGERS & FUNCTIONS
-----------------------------------------

-- 1. Create a profile automatically when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url, role, points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'citizen'),
    0
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Log status changes in history and trigger point additions
create or replace function public.handle_issue_status_change()
returns trigger as $$
begin
  -- Insert into history if status has changed
  if (tg_op = 'INSERT') then
    insert into public.issue_status_history (issue_id, status, changed_by, note)
    values (new.id, new.status, new.reporter_id, 'Issue reported.');
    
    -- Award +10 points to reporter
    if (new.reporter_id is not null) then
      update public.user_profiles
      set points = points + 10
      where id = new.reporter_id;
    end if;

  elsif (tg_op = 'UPDATE' and old.status <> new.status) then
    insert into public.issue_status_history (issue_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), 'Status updated.');
    
    -- Award +20 points to reporter when issue is resolved
    if (new.status = 'resolved' and old.status <> 'resolved' and new.reporter_id is not null) then
      update public.user_profiles
      set points = points + 20
      where id = new.reporter_id;
      
      -- Award badge check: if reporter has 5+ resolved reports, give them "Problem Solver"
      if (select count(*) from public.issues where reporter_id = new.reporter_id and status = 'resolved') >= 5 then
        if not exists (select 1 from public.user_badges where user_id = new.reporter_id and badge_name = 'Problem Solver') then
          insert into public.user_badges (user_id, badge_name) values (new.reporter_id, 'Problem Solver');
        end if;
      end if;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_issue_status_change
  after insert or update on public.issues
  for each row execute procedure public.handle_issue_status_change();


-- 3. Update verifications counts, toggle auto-verification, award verification points
create or replace function public.handle_verification()
returns trigger as $$
declare
  issue_rec record;
begin
  -- Get active issue counts
  select * into issue_rec from public.issues where id = new.issue_id;

  if (new.action = 'confirm') then
    -- Increment verification count
    update public.issues
    set verification_count = verification_count + 1,
        -- Auto-verify if reaches threshold (e.g., 3 confirmations)
        status = case 
          when status = 'reported' and (verification_count + 1) >= 3 then 'verified'::text 
          else status 
        end
    where id = new.issue_id;

    -- Award +5 points to the verifier
    update public.user_profiles
    set points = points + 5
    where id = new.user_id;

    -- Award badge check: "Community Watchdog" badge for 10+ verifications
    if (select count(*) from public.issue_verifications where user_id = new.user_id and action = 'confirm') >= 10 then
      if not exists (select 1 from public.user_badges where user_id = new.user_id and badge_name = 'Community Watchdog') then
        insert into public.user_badges (user_id, badge_name) values (new.user_id, 'Community Watchdog');
      end if;
    end if;

    -- Award badge check: "First Report" badge on first activity (either reporting or confirming)
    if not exists (select 1 from public.user_badges where user_id = new.user_id and badge_name = 'First Milestone') then
      insert into public.user_badges (user_id, badge_name) values (new.user_id, 'First Milestone');
    end if;

  elsif (new.action in ('flag_duplicate', 'flag_spam', 'flag_inaccurate')) then
    -- Increment flag count
    update public.issues
    set flag_count = flag_count + 1,
        -- Auto-reject/hide if flags >= 5
        status = case 
          when (flag_count + 1) >= 5 then 'rejected'::text 
          else status 
        end
    where id = new.issue_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_verification_added
  after insert on public.issue_verifications
  for each row execute procedure public.handle_verification();


-- 4. Timestamp updater for issues
create or replace function public.update_modified_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_issue_modtime 
  before update on public.issues 
  for each row execute procedure public.update_modified_column();
