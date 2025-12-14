-- Add agent_teams and agent_team_members tables to Supabase Realtime publication
-- This enables real-time subscriptions for team membership changes

-- Add agent_teams table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE agent_teams;

-- Add agent_team_members table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE agent_team_members;
