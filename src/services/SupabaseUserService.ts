import { supabase } from './supabaseClient';
import type { User, UserProgress, UserHighlight, UserPreferences } from '../contexts/UserContext';

/**
 * @class SupabaseUserService
 * @description Provides a complete backend implementation for user management, including authentication,
 * profile, progress, and highlights, using Supabase.
 */
export class SupabaseUserService {
  // ==================== AUTHENTICATION METHODS ====================
  
  /**
   * @description Logs a user in with their email and password.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<User>} A promise that resolves with the full user object.
   */
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Login failed');

    // Update last login timestamp in profile
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id);

    return this.getCurrentUser() as Promise<User>;
  }

  /**
   * @description Handles the OAuth callback to finalize the session and retrieve user data.
   * @returns {Promise<User | null>} The user object if successful, otherwise null.
   */
  async handleOAuthCallback(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('OAuth callback error:', error);
        return null;
      }

      if (data.session?.user) {
        // Ensure user profile exists for OAuth users
        await this.ensureUserProfile(data.session.user);
        return this.getCurrentUser();
      }

      return null;
    } catch (error) {
      console.error('OAuth callback handling error:', error);
      return null;
    }
  }

  /**
   * @description Ensures a user profile exists in the database, creating one if it doesn't.
   * This is crucial for new users signing up via OAuth.
   * @private
   * @param {any} user - The user object from Supabase auth.
   */
  private async ensureUserProfile(user: any): Promise<void> {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          });

        if (error) {
          console.error('Failed to create user profile:', error);
        }
      } else {
        // Update last login for existing OAuth users
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Profile creation error:', error);
    }
  }

  /**
   * @description Initiates the Google OAuth login flow.
   * @returns {Promise<User>} A promise that resolves with the user object after successful login and redirection.
   */
  async loginWithGoogle(): Promise<User> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw new Error(error.message);
    
    // The user will be redirected to Google and back
    // We'll handle the session in the auth callback
    return new Promise((resolve, reject) => {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            authListener.subscription.unsubscribe();
            const user = await this.getCurrentUser();
            if (user) {
              resolve(user);
            } else {
              reject(new Error('Failed to get user after Google login'));
            }
          }
        }
      );
    });
  }

  /**
   * @description Registers a new user with email, password, and profile data.
   * @param {object} userData - The user's registration data.
   * @returns {Promise<User>} A promise that resolves with the new user's data.
   */
  async register(userData: {
    email: string;
    password: string;
    username: string;
    fullName: string;
  }): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          username: userData.username,
          full_name: userData.fullName
        }
      }
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Registration failed');

    // Note: Profile is auto-created via database trigger
    return this.getCurrentUser() as Promise<User>;
  }

  /**
   * @description Logs the current user out.
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  /**
   * @description Retrieves the current authenticated user's session and profile data.
   * @returns {Promise<User | null>} The full user object, or null if not authenticated.
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get profile data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      username: profile.username || '',
      fullName: profile.full_name || '',
      avatarUrl: profile.avatar_url,
      role: profile.role,
      preferences: profile.preferences,
      createdAt: profile.created_at,
      lastLogin: profile.last_login
    };
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * @description Updates the current user's profile data.
   * @param {Partial<User>} updates - An object with the user properties to update.
   * @returns {Promise<User>} The updated user object.
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
        preferences: updates.preferences
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      email: data.email,
      username: data.username || '',
      fullName: data.full_name || '',
      avatarUrl: data.avatar_url,
      role: data.role,
      preferences: data.preferences,
      createdAt: data.created_at,
      lastLogin: data.last_login
    };
  }

  // ==================== PROGRESS MANAGEMENT ====================

  /**
   * @description Fetches all progress records for the current user.
   * @returns {Promise<UserProgress[]>} An array of user progress objects.
   */
  async getProgress(): Promise<UserProgress[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed', { ascending: false });

    if (error) throw new Error(error.message);

    return data.map(row => ({
      bookId: row.book_id,
      chapterId: row.chapter_id,
      progressPercentage: row.progress_percentage,
      timeSpent: row.time_spent,
      lastAccessed: row.last_accessed,
      completedAt: row.completed_at,
      notes: row.notes
    }));
  }

  /**
   * @description Creates or updates a progress record for a specific chapter.
   * @param {Omit<UserProgress, 'lastAccessed'>} progress - The progress data to save.
   * @returns {Promise<UserProgress>} The updated progress object.
   */
  async updateProgress(progress: Omit<UserProgress, 'lastAccessed'>): Promise<UserProgress> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        book_id: progress.bookId,
        chapter_id: progress.chapterId,
        progress_percentage: progress.progressPercentage,
        time_spent: progress.timeSpent,
        notes: progress.notes,
        completed_at: progress.completedAt,
        last_accessed: new Date().toISOString()
      }, { 
        onConflict: 'user_id,book_id,chapter_id' 
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      bookId: data.book_id,
      chapterId: data.chapter_id,
      progressPercentage: data.progress_percentage,
      timeSpent: data.time_spent,
      lastAccessed: data.last_accessed,
      completedAt: data.completed_at,
      notes: data.notes
    };
  }

  // ==================== HIGHLIGHTS MANAGEMENT ====================

  /**
   * @description Fetches all highlights for the current user.
   * @returns {Promise<UserHighlight[]>} An array of user highlight objects.
   */
  async getHighlights(): Promise<UserHighlight[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_highlights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return data.map(row => ({
      id: row.id,
      bookId: row.book_id,
      chapterId: row.chapter_id,
      text: row.text,
      color: row.color,
      position: row.position,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * @description Adds a new highlight for the current user.
   * @param {Omit<UserHighlight, 'id' | 'createdAt' | 'updatedAt'>} highlight - The highlight data to add.
   * @returns {Promise<UserHighlight>} The newly created highlight object.
   */
  async addHighlight(highlight: Omit<UserHighlight, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserHighlight> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_highlights')
      .insert({
        user_id: user.id,
        book_id: highlight.bookId,
        chapter_id: highlight.chapterId,
        text: highlight.text,
        color: highlight.color,
        position: highlight.position,
        note: highlight.note
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      bookId: data.book_id,
      chapterId: data.chapter_id,
      text: data.text,
      color: data.color,
      position: data.position,
      note: data.note,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * @description Updates an existing highlight for the current user.
   * @param {string} id - The ID of the highlight to update.
   * @param {Partial<UserHighlight>} updates - The fields to update.
   * @returns {Promise<UserHighlight>} The updated highlight object.
   */
  async updateHighlight(id: string, updates: Partial<UserHighlight>): Promise<UserHighlight> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_highlights')
      .update({
        text: updates.text,
        color: updates.color,
        position: updates.position,
        note: updates.note
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this highlight
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      bookId: data.book_id,
      chapterId: data.chapter_id,
      text: data.text,
      color: data.color,
      position: data.position,
      note: data.note,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * @description Removes a highlight for the current user.
   * @param {string} id - The ID of the highlight to remove.
   */
  async removeHighlight(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_highlights')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns this highlight

    if (error) throw new Error(error.message);
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * @description Subscribes to real-time updates for user progress.
   * @param {(progress: UserProgress) => void} callback - The function to call on update.
   * @returns {any} The Supabase subscription object.
   */
  subscribeToProgressUpdates(callback: (progress: UserProgress) => void) {
    return supabase
      .channel('user_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}`
        },
        (payload: any) => {
          if (payload.new) {
            const progress: UserProgress = {
              bookId: payload.new.book_id,
              chapterId: payload.new.chapter_id,
              progressPercentage: payload.new.progress_percentage,
              timeSpent: payload.new.time_spent,
              lastAccessed: payload.new.last_accessed,
              completedAt: payload.new.completed_at,
              notes: payload.new.notes
            };
            callback(progress);
          }
        }
      )
      .subscribe();
  }

  /**
   * @description Subscribes to real-time updates for user highlights.
   * @param {(highlight: UserHighlight, event: 'INSERT' | 'UPDATE' | 'DELETE') => void} callback - The function to call on update.
   * @returns {any} The Supabase subscription object.
   */
  subscribeToHighlightUpdates(callback: (highlight: UserHighlight, event: 'INSERT' | 'UPDATE' | 'DELETE') => void) {
    return supabase
      .channel('user_highlights_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_highlights',
          filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}`
        },
        (payload: any) => {
          if (payload.new) {
            const highlight: UserHighlight = {
              id: payload.new.id,
              bookId: payload.new.book_id,
              chapterId: payload.new.chapter_id,
              text: payload.new.text,
              color: payload.new.color,
              position: payload.new.position,
              note: payload.new.note,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at
            };
            callback(highlight, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE');
          }
        }
      )
      .subscribe();
  }

  /**
   * @description Unsubscribes from all real-time channels.
   */
  unsubscribeAll() {
    supabase.removeAllChannels();
  }
}

/**
 * @const supabaseUserService
 * @description The exported singleton instance of the SupabaseUserService class.
 */
export const supabaseUserService = new SupabaseUserService();
