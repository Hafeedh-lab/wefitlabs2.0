export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          date: string;
          location: string | null;
          status: 'upcoming' | 'live' | 'completed';
          sponsor_name: string | null;
          sponsor_logo_url: string | null;
          sponsor_cta_text: string | null;
          sponsor_cta_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['events']['Row']>;
        Update: Partial<Database['public']['Tables']['events']['Row']>;
      };
      participants: {
        Row: {
          id: string;
          event_id: string;
          first_name: string;
          team_name: string;
          email: string | null;
          phone: string | null;
          consent_marketing: boolean | null;
          checked_in_at: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['participants']['Row']>;
        Update: Partial<Database['public']['Tables']['participants']['Row']>;
      };
      matches: {
        Row: {
          id: string;
          event_id: string;
          round_number: number;
          match_number: number;
          court_number: number | null;
          team1_id: string | null;
          team2_id: string | null;
          team1_score: number;
          team2_score: number;
          winner_id: string | null;
          status: 'pending' | 'in_progress' | 'completed';
          started_at: string | null;
          completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['matches']['Row']>;
        Update: Partial<Database['public']['Tables']['matches']['Row']>;
      };
      analytics_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          session_id: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['analytics_events']['Row']>;
        Update: Partial<Database['public']['Tables']['analytics_events']['Row']>;
      };
      sponsor_interactions: {
        Row: {
          id: string;
          event_id: string;
          interaction_type: 'view' | 'click' | 'redemption';
          session_id: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['sponsor_interactions']['Row']>;
        Update: Partial<Database['public']['Tables']['sponsor_interactions']['Row']>;
      };
      reminder_signups: {
        Row: {
          id: string;
          event_id: string;
          email: string | null;
          phone: string | null;
          signed_up_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['reminder_signups']['Row']>;
        Update: Partial<Database['public']['Tables']['reminder_signups']['Row']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
