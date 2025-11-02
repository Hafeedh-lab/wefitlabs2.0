-- =====================================================
-- WeFit Labs Platform Enhancement Migration
-- Version: 003
-- Description: Link participants to player profiles for ELO tracking
-- =====================================================

-- Add player_profile_id to participants table
-- This allows us to link event participants to their permanent player profiles
-- for rating calculations and stat tracking
ALTER TABLE participants
ADD COLUMN player_profile_id UUID REFERENCES player_profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_participants_player_profile_id ON participants(player_profile_id);

-- Add user_id to participants for easier profile lookup
-- This helps us identify which user checked in, even if they don't have a profile yet
ALTER TABLE participants
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_participants_user_id ON participants(user_id);

-- Create a view that joins participants with their player profiles
CREATE OR REPLACE VIEW participant_profiles AS
SELECT
  p.id as participant_id,
  p.event_id,
  p.first_name,
  p.team_name,
  p.email,
  p.phone,
  p.user_id,
  p.player_profile_id,
  pp.display_name,
  pp.avatar_url,
  pp.skill_rating,
  pp.play_style,
  pp.preferred_position
FROM participants p
LEFT JOIN player_profiles pp ON p.player_profile_id = pp.id;

-- Function to auto-link participant to player profile when user_id is set
CREATE OR REPLACE FUNCTION link_participant_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is set and player_profile_id is not set, try to find and link the profile
  IF NEW.user_id IS NOT NULL AND NEW.player_profile_id IS NULL THEN
    SELECT id INTO NEW.player_profile_id
    FROM player_profiles
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-link participant to profile
CREATE TRIGGER trigger_link_participant_to_profile
BEFORE INSERT OR UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION link_participant_to_profile();

-- Update existing participants to link to their player profiles if they have user_id
UPDATE participants p
SET player_profile_id = pp.id
FROM player_profiles pp
WHERE p.user_id = pp.user_id
AND p.player_profile_id IS NULL;
