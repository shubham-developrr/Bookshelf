import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file.'
  );
}

// Create Supabase client with optimized configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
});

// Database type definitions for TypeScript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: 'student' | 'educator' | 'admin';
          preferences: {
            theme: string;
            fontSize: string;
            autoSaveHighlights: boolean;
            emailNotifications: boolean;
            progressTracking: boolean;
          };
          created_at: string;
          last_login: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'student' | 'educator' | 'admin';
          preferences?: {
            theme?: string;
            fontSize?: string;
            autoSaveHighlights?: boolean;
            emailNotifications?: boolean;
            progressTracking?: boolean;
          };
          last_login?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'student' | 'educator' | 'admin';
          preferences?: {
            theme?: string;
            fontSize?: string;
            autoSaveHighlights?: boolean;
            emailNotifications?: boolean;
            progressTracking?: boolean;
          };
          last_login?: string | null;
        };
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          chapter_id: string;
          progress_percentage: number;
          time_spent: number;
          last_accessed: string;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          chapter_id: string;
          progress_percentage?: number;
          time_spent?: number;
          last_accessed?: string;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          chapter_id?: string;
          progress_percentage?: number;
          time_spent?: number;
          last_accessed?: string;
          completed_at?: string | null;
          notes?: string | null;
        };
      };
      user_highlights: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          chapter_id: string;
          text: string;
          color: 'yellow' | 'green' | 'blue' | 'red';
          position: {
            start: number;
            end: number;
          };
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          chapter_id: string;
          text: string;
          color?: 'yellow' | 'green' | 'blue' | 'red';
          position: {
            start: number;
            end: number;
          };
          note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          chapter_id?: string;
          text?: string;
          color?: 'yellow' | 'green' | 'blue' | 'red';
          position?: {
            start: number;
            end: number;
          };
          note?: string | null;
        };
      };
    };
  };
}

export type SupabaseClient = typeof supabase;
