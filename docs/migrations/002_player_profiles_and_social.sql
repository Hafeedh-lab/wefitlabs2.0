-- =====================================================
-- WeFit Labs Platform Enhancement Migration
-- Version: 002
-- Description: Player profiles, stats, achievements, and social features
-- =====================================================

-- =====================================================
-- 1. PLAYER PROFILES
-- =====================================================

CREATE TABLE player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  skill_rating INTEGER DEFAULT 1200, -- ELO rating
  play_style TEXT CHECK (play_style IN ('aggressive', 'defensive', 'balanced')),
  preferred_position TEXT CHECK (preferred_position IN ('left', 'right', 'any')),
  member_since TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_profiles_user_id ON player_profiles(user_id);
CREATE INDEX idx_player_profiles_skill_rating ON player_profiles(skill_rating);

-- =====================================================
-- 2. PLAYER STATS
-- =====================================================

CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE UNIQUE,

  -- Match stats
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,

  -- Point stats
  points_scored INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,

  -- Streak stats
  current_win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  current_loss_streak INTEGER DEFAULT 0,

  -- Partner stats
  different_partners_count INTEGER DEFAULT 0,
  favorite_partner_id UUID REFERENCES player_profiles(id),

  -- Performance
  avg_point_differential DECIMAL(5,2) DEFAULT 0.00,
  comeback_wins INTEGER DEFAULT 0, -- Wins when trailing

  -- Activity
  last_played_at TIMESTAMP,
  total_events_attended INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);

-- =====================================================
-- 3. ACHIEVEMENTS
-- =====================================================

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'first_win', 'hot_streak_5'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('wins', 'streaks', 'social', 'special', 'skill')),
  icon TEXT, -- Emoji or icon name
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  points INTEGER DEFAULT 0, -- Achievement points value
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_achievements_category ON achievements(category);

CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress JSONB, -- For multi-step achievements
  metadata JSONB, -- Additional context (e.g., event_id, match_id)
  UNIQUE(player_id, achievement_id)
);

CREATE INDEX idx_player_achievements_player_id ON player_achievements(player_id);
CREATE INDEX idx_player_achievements_unlocked_at ON player_achievements(unlocked_at DESC);

-- =====================================================
-- 4. MATCH COMMENTS & REACTIONS
-- =====================================================

CREATE TABLE match_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID REFERENCES player_profiles(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  reactions JSONB DEFAULT '{"fire": 0, "wow": 0, "clutch": 0, "gg": 0}'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_match_comments_match_id ON match_comments(match_id);
CREATE INDEX idx_match_comments_created_at ON match_comments(created_at DESC);

CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES match_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'wow', 'clutch', 'gg')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- =====================================================
-- 5. PREDICTIONS
-- =====================================================

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID REFERENCES player_profiles(id) ON DELETE SET NULL,
  predicted_winner_team TEXT CHECK (predicted_winner_team IN ('team1', 'team2')),
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 100),
  points_earned INTEGER DEFAULT 0,
  is_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

CREATE INDEX idx_predictions_match_id ON predictions(match_id);
CREATE INDEX idx_predictions_user_id ON predictions(user_id);

-- =====================================================
-- 6. TEAM CHEMISTRY
-- =====================================================

CREATE TABLE team_chemistry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  matches_together INTEGER DEFAULT 0,
  wins_together INTEGER DEFAULT 0,
  losses_together INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,
  chemistry_score DECIMAL(5,2) DEFAULT 0.00, -- Calculated metric 0-100
  last_played_together TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player1_id, player2_id),
  CHECK (player1_id < player2_id) -- Ensure consistent ordering
);

CREATE INDEX idx_team_chemistry_players ON team_chemistry(player1_id, player2_id);
CREATE INDEX idx_team_chemistry_score ON team_chemistry(chemistry_score DESC);

-- =====================================================
-- 7. CHALLENGES
-- =====================================================

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  challenged_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired')),
  message TEXT,
  stakes TEXT, -- Optional: "Loser buys coffee"
  winner_id UUID REFERENCES player_profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX idx_challenges_status ON challenges(status) WHERE status IN ('pending', 'accepted');

-- =====================================================
-- 8. TRAINING DRILLS
-- =====================================================

CREATE TABLE training_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('serve', 'return', 'volley', 'dink', 'strategy', 'fitness')),
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  description TEXT NOT NULL,
  instructions TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  recommended_for_rating INTEGER[], -- Array of rating ranges
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_drills_category ON training_drills(category);
CREATE INDEX idx_training_drills_difficulty ON training_drills(difficulty);

CREATE TABLE player_training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES training_drills(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  performance_score INTEGER CHECK (performance_score BETWEEN 1 AND 5),
  notes TEXT
);

CREATE INDEX idx_player_training_log_player ON player_training_log(player_id);
CREATE INDEX idx_player_training_log_completed ON player_training_log(completed_at DESC);

-- =====================================================
-- 9. PLAYER RELATIONSHIPS (FOLLOWS, BLOCKS)
-- =====================================================

CREATE TABLE player_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('follow', 'block')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id, relationship_type)
);

CREATE INDEX idx_player_relationships_follower ON player_relationships(follower_id);
CREATE INDEX idx_player_relationships_following ON player_relationships(following_id);

-- =====================================================
-- 10. HIGHLIGHTS
-- =====================================================

CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('comeback', 'upset', 'perfect_game', 'close_game', 'milestone')),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_highlights_match_id ON highlights(match_id);
CREATE INDEX idx_highlights_type ON highlights(type);
CREATE INDEX idx_highlights_views ON highlights(views DESC);

-- =====================================================
-- 11. MATCH HISTORY (Enhanced from original matches table)
-- =====================================================

-- Add player references to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team1_player1_id UUID REFERENCES player_profiles(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team1_player2_id UUID REFERENCES player_profiles(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team2_player1_id UUID REFERENCES player_profiles(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team2_player2_id UUID REFERENCES player_profiles(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_highlight BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS highlight_reason TEXT;

-- =====================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Player Profiles: Public read, own profile write
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON player_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON player_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON player_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Player Stats: Public read
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Player stats are viewable by everyone"
  ON player_stats FOR SELECT
  USING (true);

-- Achievements: Public read
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are viewable by everyone"
  ON achievements FOR SELECT
  USING (true);

ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Player achievements are viewable by everyone"
  ON player_achievements FOR SELECT
  USING (true);

-- Comments: Authenticated users can create, read all
ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON match_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON match_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments"
  ON match_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON match_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Predictions: Users can create and read all
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions are viewable by everyone"
  ON predictions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create predictions"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Team Chemistry: Public read
ALTER TABLE team_chemistry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team chemistry is viewable by everyone"
  ON team_chemistry FOR SELECT
  USING (true);

-- Challenges: Viewable by participants
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by everyone"
  ON challenges FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update challenges"
  ON challenges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM player_profiles
      WHERE (player_profiles.id = challenges.challenger_id OR player_profiles.id = challenges.challenged_id)
      AND player_profiles.user_id = auth.uid()
    )
  );

-- Training: Public read, authenticated write
ALTER TABLE training_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training drills are viewable by everyone"
  ON training_drills FOR SELECT
  USING (true);

ALTER TABLE player_training_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training logs are viewable by everyone"
  ON player_training_log FOR SELECT
  USING (true);

CREATE POLICY "Users can log their own training"
  ON player_training_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_profiles
      WHERE player_profiles.id = player_training_log.player_id
      AND player_profiles.user_id = auth.uid()
    )
  );

-- Relationships: Users manage their own
ALTER TABLE player_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Relationships are viewable by everyone"
  ON player_relationships FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own relationships"
  ON player_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM player_profiles
      WHERE player_profiles.id = player_relationships.follower_id
      AND player_profiles.user_id = auth.uid()
    )
  );

-- Highlights: Public read
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlights are viewable by everyone"
  ON highlights FOR SELECT
  USING (true);

-- =====================================================
-- 13. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update player_profiles.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at
  BEFORE UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_chemistry_updated_at
  BEFORE UPDATE ON team_chemistry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create player_stats when profile is created
CREATE OR REPLACE FUNCTION create_player_stats_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_stats (player_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_player_stats_on_profile_creation
  AFTER INSERT ON player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_player_stats_for_new_profile();

-- =====================================================
-- 14. SEED INITIAL ACHIEVEMENTS
-- =====================================================

INSERT INTO achievements (code, name, description, category, icon, rarity, points) VALUES
  -- Wins
  ('first_win', 'First Victory', 'Win your first match', 'wins', '🏆', 'common', 10),
  ('ten_wins', 'Rising Star', 'Win 10 matches', 'wins', '⭐', 'common', 50),
  ('fifty_wins', 'Champion', 'Win 50 matches', 'wins', '👑', 'rare', 200),
  ('hundred_wins', 'Legend', 'Win 100 matches', 'wins', '💎', 'epic', 500),

  -- Streaks
  ('hot_streak_3', 'On Fire', 'Win 3 matches in a row', 'streaks', '🔥', 'common', 25),
  ('hot_streak_5', 'Unstoppable', 'Win 5 matches in a row', 'streaks', '⚡', 'rare', 100),
  ('hot_streak_10', 'Domination', 'Win 10 matches in a row', 'streaks', '💫', 'legendary', 500),

  -- Social
  ('social_butterfly', 'Social Butterfly', 'Play with 10 different partners', 'social', '🦋', 'common', 30),
  ('team_player', 'Team Player', 'Win 25 doubles matches', 'social', '🤝', 'rare', 100),
  ('rivalry', 'Rivalry', 'Play against the same opponent 5 times', 'social', '⚔️', 'rare', 50),

  -- Special
  ('comeback_kid', 'Comeback Kid', 'Win after trailing by 5+ points', 'special', '💪', 'rare', 75),
  ('perfect_game', 'Flawless Victory', 'Win without losing a single point (11-0)', 'special', '✨', 'epic', 200),
  ('tournament_champion', 'Tournament Champion', 'Win a tournament', 'special', '🥇', 'epic', 250),
  ('underdog', 'Giant Slayer', 'Defeat an opponent rated 200+ points higher', 'special', '🗡️', 'epic', 150),

  -- Skill
  ('skill_improvement', 'Improving', 'Gain 100 rating points', 'skill', '📈', 'rare', 100),
  ('elite_player', 'Elite Player', 'Reach 1600 rating', 'skill', '🎯', 'epic', 300),
  ('master', 'Master', 'Reach 1800 rating', 'skill', '🏅', 'legendary', 1000);

-- =====================================================
-- 15. SEED TRAINING DRILLS
-- =====================================================

INSERT INTO training_drills (name, category, difficulty, description, instructions, duration_minutes, recommended_for_rating) VALUES
  ('Dinking Consistency', 'dink', 2, 'Practice consistent dinking to control the kitchen', 'Rally at the kitchen line focusing on soft touch and placement. Aim for 20+ consecutive dinks.', 15, ARRAY[1000, 1400]),
  ('Third Shot Drop', 'strategy', 3, 'Master the crucial third shot drop', 'Practice hitting soft drops from baseline to the kitchen after the return of serve.', 20, ARRAY[1200, 1600]),
  ('Serve Placement', 'serve', 2, 'Improve serve accuracy and variety', 'Target specific zones: deep corners, short angles, and body serves.', 15, ARRAY[1000, 1800]),
  ('Volley Reactions', 'volley', 3, 'Develop quick reflexes at the net', 'Partner feeds fast balls at the net. Focus on short backswing and quick reactions.', 20, ARRAY[1200, 1800]),
  ('Court Movement', 'fitness', 2, 'Improve footwork and court coverage', 'Shadow drills covering all four corners. Focus on split-step and ready position.', 25, ARRAY[1000, 1800]);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
