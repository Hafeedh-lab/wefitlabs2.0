/**
 * Extended Database Types
 * Additional types for player profiles, stats, achievements, and social features
 */

import type { Database } from './database';

// Extend the existing Database type with new tables
export interface ExtendedDatabase extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      player_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          skill_rating: number;
          play_style: 'aggressive' | 'defensive' | 'balanced' | null;
          preferred_position: 'left' | 'right' | 'any' | null;
          member_since: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          skill_rating?: number;
          play_style?: 'aggressive' | 'defensive' | 'balanced' | null;
          preferred_position?: 'left' | 'right' | 'any' | null;
          member_since?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['player_profiles']['Insert']>;
      };

      player_stats: {
        Row: {
          id: string;
          player_id: string;
          matches_played: number;
          matches_won: number;
          matches_lost: number;
          points_scored: number;
          points_against: number;
          current_win_streak: number;
          best_win_streak: number;
          current_loss_streak: number;
          different_partners_count: number;
          favorite_partner_id: string | null;
          avg_point_differential: number;
          comeback_wins: number;
          last_played_at: string | null;
          total_events_attended: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          matches_played?: number;
          matches_won?: number;
          matches_lost?: number;
          points_scored?: number;
          points_against?: number;
          current_win_streak?: number;
          best_win_streak?: number;
          current_loss_streak?: number;
          different_partners_count?: number;
          favorite_partner_id?: string | null;
          avg_point_differential?: number;
          comeback_wins?: number;
          last_played_at?: string | null;
          total_events_attended?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['player_stats']['Insert']>;
      };

      achievements: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          category: 'wins' | 'streaks' | 'social' | 'special' | 'skill';
          icon: string | null;
          rarity: 'common' | 'rare' | 'epic' | 'legendary' | null;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          category: 'wins' | 'streaks' | 'social' | 'special' | 'skill';
          icon?: string | null;
          rarity?: 'common' | 'rare' | 'epic' | 'legendary' | null;
          points?: number;
          created_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['achievements']['Insert']>;
      };

      player_achievements: {
        Row: {
          id: string;
          player_id: string;
          achievement_id: string;
          unlocked_at: string;
          progress: Json | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          achievement_id: string;
          unlocked_at?: string;
          progress?: Json | null;
          metadata?: Json | null;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['player_achievements']['Insert']>;
      };

      match_comments: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          player_id: string | null;
          comment: string;
          reactions: Json;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          player_id?: string | null;
          comment: string;
          reactions?: Json;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['match_comments']['Insert']>;
      };

      comment_reactions: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          reaction_type: 'fire' | 'wow' | 'clutch' | 'gg';
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          reaction_type: 'fire' | 'wow' | 'clutch' | 'gg';
          created_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['comment_reactions']['Insert']>;
      };

      predictions: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          player_id: string | null;
          predicted_winner_team: 'team1' | 'team2';
          confidence: number;
          points_earned: number;
          is_correct: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          player_id?: string | null;
          predicted_winner_team: 'team1' | 'team2';
          confidence: number;
          points_earned?: number;
          is_correct?: boolean | null;
          created_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['predictions']['Insert']>;
      };

      team_chemistry: {
        Row: {
          id: string;
          player1_id: string;
          player2_id: string;
          matches_together: number;
          wins_together: number;
          losses_together: number;
          points_scored: number;
          points_against: number;
          chemistry_score: number;
          last_played_together: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player1_id: string;
          player2_id: string;
          matches_together?: number;
          wins_together?: number;
          losses_together?: number;
          points_scored?: number;
          points_against?: number;
          chemistry_score?: number;
          last_played_together?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['team_chemistry']['Insert']>;
      };

      challenges: {
        Row: {
          id: string;
          challenger_id: string;
          challenged_id: string;
          event_id: string | null;
          match_id: string | null;
          status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
          message: string | null;
          stakes: string | null;
          winner_id: string | null;
          expires_at: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          challenger_id: string;
          challenged_id: string;
          event_id?: string | null;
          match_id?: string | null;
          status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
          message?: string | null;
          stakes?: string | null;
          winner_id?: string | null;
          expires_at?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['challenges']['Insert']>;
      };

      training_drills: {
        Row: {
          id: string;
          name: string;
          category: 'serve' | 'return' | 'volley' | 'dink' | 'strategy' | 'fitness';
          difficulty: number;
          description: string;
          instructions: string | null;
          video_url: string | null;
          duration_minutes: number | null;
          recommended_for_rating: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: 'serve' | 'return' | 'volley' | 'dink' | 'strategy' | 'fitness';
          difficulty: number;
          description: string;
          instructions?: string | null;
          video_url?: string | null;
          duration_minutes?: number | null;
          recommended_for_rating?: number[] | null;
          created_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['training_drills']['Insert']>;
      };

      player_training_log: {
        Row: {
          id: string;
          player_id: string;
          drill_id: string;
          completed_at: string;
          performance_score: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          drill_id: string;
          completed_at?: string;
          performance_score?: number | null;
          notes?: string | null;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['player_training_log']['Insert']>;
      };

      player_relationships: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          relationship_type: 'follow' | 'block';
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          relationship_type: 'follow' | 'block';
          created_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['player_relationships']['Insert']>;
      };

      highlights: {
        Row: {
          id: string;
          match_id: string;
          type: 'comeback' | 'upset' | 'perfect_game' | 'close_game' | 'milestone';
          title: string;
          description: string | null;
          thumbnail_url: string | null;
          video_url: string | null;
          views: number;
          shares: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          type: 'comeback' | 'upset' | 'perfect_game' | 'close_game' | 'milestone';
          title: string;
          description?: string | null;
          thumbnail_url?: string | null;
          video_url?: string | null;
          views?: number;
          shares?: number;
          created_at?: string;
        };
        Update: Partial<ExtendedDatabase['public']['Tables']['highlights']['Insert']>;
      };
    };
  };
}

// Helper type for JSON fields
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Convenient type aliases
export type PlayerProfile = ExtendedDatabase['public']['Tables']['player_profiles']['Row'];
export type PlayerStats = ExtendedDatabase['public']['Tables']['player_stats']['Row'];
export type Achievement = ExtendedDatabase['public']['Tables']['achievements']['Row'];
export type PlayerAchievement = ExtendedDatabase['public']['Tables']['player_achievements']['Row'];
export type MatchComment = ExtendedDatabase['public']['Tables']['match_comments']['Row'];
export type Prediction = ExtendedDatabase['public']['Tables']['predictions']['Row'];
export type TeamChemistry = ExtendedDatabase['public']['Tables']['team_chemistry']['Row'];
export type Challenge = ExtendedDatabase['public']['Tables']['challenges']['Row'];
export type TrainingDrill = ExtendedDatabase['public']['Tables']['training_drills']['Row'];
export type Highlight = ExtendedDatabase['public']['Tables']['highlights']['Row'];
