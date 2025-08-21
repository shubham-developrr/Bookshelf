# 🚀 SUPABASE BACKEND IMPLEMENTATION PLAN
## Complete User Progress Synchronization & Real-time Data Management

### 📊 **CURRENT STATE ANALYSIS**

#### ✅ **Architectural Strengths**
- **UserContext System**: Robust state management with useReducer pattern
- **Type Safety**: Well-defined interfaces (User, UserProgress, UserHighlight, UserPreferences)
- **Service Layer**: Clean abstraction with UserService interface ready for Supabase swap
- **Component Integration**: App.tsx prepared with UserProvider wrapper
- **Data Flow**: Comprehensive actions for auth, progress tracking, and highlight management

#### 🔄 **Current Mock Implementation**
```typescript
// Current UserService targets non-existent API
class UserService {
  private baseUrl = 'http://localhost:3001/api'; // ← Replace with Supabase
  
  // All methods ready for Supabase integration:
  async login(email, password) → Supabase Auth
  async getProgress() → Supabase postgres_changes
  async addHighlight() → Real-time sync
  async updateProgress() → Cross-device updates
}
```

---

## 🏗️ **PHASE 1: SUPABASE INFRASTRUCTURE SETUP**

### 📋 **Implementation Checklist**

#### ✅ **1.1 Database Schema Creation**

```sql
-- Enable RLS on auth schema
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- User Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin')),
  preferences JSONB DEFAULT '{
    "theme": "dark",
    "fontSize": "medium", 
    "autoSaveHighlights": true,
    "emailNotifications": true,
    "progressTracking": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Progress Table  
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent INTEGER DEFAULT 0, -- minutes
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, book_id, chapter_id)
);

-- User Highlights Table
CREATE TABLE public.user_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'red')),
  position JSONB NOT NULL, -- {start: number, end: number}
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book Modules Table (Community Content)
CREATE TABLE public.book_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  author_id UUID REFERENCES auth.users(id),
  content JSONB NOT NULL, -- Full book module data
  assets JSONB DEFAULT '[]'::jsonb, -- Asset references
  is_public BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Book Installations
CREATE TABLE public.user_book_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_module_id UUID REFERENCES book_modules(id) ON DELETE CASCADE,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, book_module_id)
);
```

#### ✅ **1.2 Row Level Security Policies**

```sql
-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles  
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Progress RLS  
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

-- Highlights RLS
ALTER TABLE public.user_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own highlights" ON public.user_highlights
  FOR ALL USING (auth.uid() = user_id);

-- Book Modules RLS
ALTER TABLE public.book_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public book modules" ON public.book_modules
  FOR SELECT USING (is_public = true);

CREATE POLICY "Authors can manage their own modules" ON public.book_modules
  FOR ALL USING (auth.uid() = author_id);

-- Book Installations RLS  
ALTER TABLE public.user_book_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own installations" ON public.user_book_installations
  FOR ALL USING (auth.uid() = user_id);
```

#### ✅ **1.3 Real-time Subscriptions Setup**

```sql
-- Enable realtime for user-specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_highlights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
```

#### ✅ **1.4 Database Functions & Triggers**

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_highlights_updated_at
  BEFORE UPDATE ON public.user_highlights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## 🔧 **PHASE 2: SUPABASE SERVICE IMPLEMENTATION**

### ✅ **2.1 Environment Configuration**

```typescript
// .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### ✅ **2.2 Supabase Client Setup**

```typescript
// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Database type definitions
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'student' | 'educator' | 'admin'
          preferences: UserPreferences
          created_at: string
          last_login: string | null
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username?: string
          full_name?: string
          avatar_url?: string
          role?: 'student' | 'educator' | 'admin'
          preferences?: UserPreferences
        }
        Update: {
          username?: string
          full_name?: string
          avatar_url?: string
          preferences?: UserPreferences
          last_login?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          book_id: string
          chapter_id: string
          progress_percentage: number
          time_spent: number
          last_accessed: string
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          book_id: string
          chapter_id: string
          progress_percentage?: number
          time_spent?: number
          notes?: string
        }
        Update: {
          progress_percentage?: number
          time_spent?: number
          notes?: string
          completed_at?: string
        }
      }
      user_highlights: {
        Row: {
          id: string
          user_id: string
          book_id: string
          chapter_id: string
          text: string
          color: 'yellow' | 'green' | 'blue' | 'red'
          position: { start: number; end: number }
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          book_id: string
          chapter_id: string
          text: string
          color?: 'yellow' | 'green' | 'blue' | 'red'
          position: { start: number; end: number }
          note?: string
        }
        Update: {
          text?: string
          color?: 'yellow' | 'green' | 'blue' | 'red'
          position?: { start: number; end: number }
          note?: string
        }
      }
    }
  }
}
```

### ✅ **2.3 SupabaseUserService Implementation**

```typescript
// src/services/SupabaseUserService.ts
import { supabase } from './supabaseClient'
import type { User, UserProgress, UserHighlight, UserPreferences } from '../contexts/UserContext'

export class SupabaseUserService {
  // Authentication Methods
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Login failed')

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)

    return this.mapSupabaseUserToUser(data.user)
  }

  async register(userData: {
    email: string
    password: string
    username: string
    fullName: string
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
    })

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Registration failed')

    return this.mapSupabaseUserToUser(data.user)
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return null

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
    }
  }

  // Profile Management
  async updateProfile(updates: Partial<User>): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

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
      .single()

    if (error) throw new Error(error.message)

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
    }
  }

  // Progress Management
  async getProgress(): Promise<UserProgress[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed', { ascending: false })

    if (error) throw new Error(error.message)

    return data.map(row => ({
      bookId: row.book_id,
      chapterId: row.chapter_id,
      progressPercentage: row.progress_percentage,
      timeSpent: row.time_spent,
      lastAccessed: row.last_accessed,
      completedAt: row.completed_at,
      notes: row.notes
    }))
  }

  async updateProgress(progress: Omit<UserProgress, 'lastAccessed'>): Promise<UserProgress> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

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
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      bookId: data.book_id,
      chapterId: data.chapter_id,
      progressPercentage: data.progress_percentage,
      timeSpent: data.time_spent,
      lastAccessed: data.last_accessed,
      completedAt: data.completed_at,
      notes: data.notes
    }
  }

  // Highlights Management
  async getHighlights(): Promise<UserHighlight[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_highlights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

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
    }))
  }

  async addHighlight(highlight: Omit<UserHighlight, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserHighlight> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

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
      .single()

    if (error) throw new Error(error.message)

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
    }
  }

  async updateHighlight(id: string, updates: Partial<UserHighlight>): Promise<UserHighlight> {
    const { data, error } = await supabase
      .from('user_highlights')
      .update({
        text: updates.text,
        color: updates.color,
        position: updates.position,
        note: updates.note
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

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
    }
  }

  async removeHighlight(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_highlights')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  // Helper Methods
  private mapSupabaseUserToUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      username: supabaseUser.user_metadata?.username || '',
      fullName: supabaseUser.user_metadata?.full_name || '',
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      role: 'student', // Default role
      preferences: {
        theme: 'dark',
        fontSize: 'medium',
        autoSaveHighlights: true,
        emailNotifications: true,
        progressTracking: true
      },
      createdAt: supabaseUser.created_at,
      lastLogin: supabaseUser.last_sign_in_at
    }
  }
}
```

---

## ⚡ **PHASE 3: REAL-TIME SYNCHRONIZATION**

### ✅ **3.1 Real-time Subscription Manager**

```typescript
// src/services/RealtimeManager.ts
import { supabase } from './supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscribers: Map<string, Set<Function>> = new Map()

  // Subscribe to user progress changes
  subscribeToUserProgress(userId: string, callback: (payload: any) => void): () => void {
    const channelName = `user_progress_${userId}`
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_progress',
            filter: `user_id=eq.${userId}`
          },
          callback
        )
        .subscribe()

      this.channels.set(channelName, channel)
      this.subscribers.set(channelName, new Set())
    }

    const subs = this.subscribers.get(channelName)!
    subs.add(callback)

    // Return unsubscribe function
    return () => {
      subs.delete(callback)
      if (subs.size === 0) {
        const channel = this.channels.get(channelName)
        if (channel) {
          supabase.removeChannel(channel)
          this.channels.delete(channelName)
          this.subscribers.delete(channelName)
        }
      }
    }
  }

  // Subscribe to user highlights changes
  subscribeToUserHighlights(userId: string, callback: (payload: any) => void): () => void {
    const channelName = `user_highlights_${userId}`
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_highlights',
            filter: `user_id=eq.${userId}`
          },
          callback
        )
        .subscribe()

      this.channels.set(channelName, channel)
      this.subscribers.set(channelName, new Set())
    }

    const subs = this.subscribers.get(channelName)!
    subs.add(callback)

    return () => {
      subs.delete(callback)
      if (subs.size === 0) {
        const channel = this.channels.get(channelName)
        if (channel) {
          supabase.removeChannel(channel)
          this.channels.delete(channelName)
          this.subscribers.delete(channelName)
        }
      }
    }
  }

  // User presence tracking
  subscribeToUserPresence(roomId: string, userId: string, userInfo: any): () => void {
    const channel = supabase
      .channel(`presence_${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        console.log('Updated presence:', presenceState)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Users joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Users left:', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userInfo
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Cleanup all subscriptions
  cleanup(): void {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
    this.subscribers.clear()
  }
}

export const realtimeManager = new RealtimeManager()
```

### ✅ **3.2 Enhanced UserContext with Real-time**

```typescript
// src/contexts/EnhancedUserContext.tsx
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { SupabaseUserService } from '../services/SupabaseUserService'
import { realtimeManager } from '../services/RealtimeManager'
import { User, UserProgress, UserHighlight, UserPreferences } from './UserContext'

const supabaseUserService = new SupabaseUserService()

// Enhanced Provider with real-time subscriptions
export function EnhancedUserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState)

  // Real-time subscriptions
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      const userId = state.user.id

      // Subscribe to progress changes
      const unsubProgress = realtimeManager.subscribeToUserProgress(userId, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const progress = mapDatabaseToProgress(payload.new)
          dispatch({ type: 'UPDATE_PROGRESS', payload: progress })
        }
      })

      // Subscribe to highlight changes
      const unsubHighlights = realtimeManager.subscribeToUserHighlights(userId, (payload) => {
        if (payload.eventType === 'INSERT') {
          const highlight = mapDatabaseToHighlight(payload.new)
          dispatch({ type: 'ADD_HIGHLIGHT', payload: highlight })
        } else if (payload.eventType === 'UPDATE') {
          const highlight = mapDatabaseToHighlight(payload.new)
          dispatch({ type: 'UPDATE_HIGHLIGHT', payload: { id: highlight.id, updates: highlight } })
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'REMOVE_HIGHLIGHT', payload: payload.old.id })
        }
      })

      // Track user presence
      const unsubPresence = realtimeManager.subscribeToUserPresence(
        'main_app',
        userId,
        {
          username: state.user.username,
          avatar_url: state.user.avatarUrl
        }
      )

      return () => {
        unsubProgress()
        unsubHighlights()
        unsubPresence()
      }
    }
  }, [state.isAuthenticated, state.user?.id])

  // Enhanced actions with optimistic updates
  const actions = {
    // ... existing actions enhanced with real-time updates
    
    addHighlight: async (highlight: Omit<UserHighlight, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Optimistic update
      const optimisticHighlight: UserHighlight = {
        ...highlight,
        id: `temp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      dispatch({ type: 'ADD_HIGHLIGHT', payload: optimisticHighlight })

      try {
        const newHighlight = await supabaseUserService.addHighlight(highlight)
        // Replace optimistic with real data
        dispatch({ type: 'UPDATE_HIGHLIGHT', payload: { 
          id: optimisticHighlight.id, 
          updates: newHighlight 
        }})
      } catch (error) {
        // Rollback optimistic update
        dispatch({ type: 'REMOVE_HIGHLIGHT', payload: optimisticHighlight.id })
        throw error
      }
    }
  }

  return (
    <UserContext.Provider value={{ state, actions }}>
      {children}
    </UserContext.Provider>
  )
}

// Helper mapping functions
function mapDatabaseToProgress(dbProgress: any): UserProgress {
  return {
    bookId: dbProgress.book_id,
    chapterId: dbProgress.chapter_id,
    progressPercentage: dbProgress.progress_percentage,
    timeSpent: dbProgress.time_spent,
    lastAccessed: dbProgress.last_accessed,
    completedAt: dbProgress.completed_at,
    notes: dbProgress.notes
  }
}

function mapDatabaseToHighlight(dbHighlight: any): UserHighlight {
  return {
    id: dbHighlight.id,
    bookId: dbHighlight.book_id,
    chapterId: dbHighlight.chapter_id,
    text: dbHighlight.text,
    color: dbHighlight.color,
    position: dbHighlight.position,
    note: dbHighlight.note,
    createdAt: dbHighlight.created_at,
    updatedAt: dbHighlight.updated_at
  }
}
```

---

## 📱 **PHASE 4: OFFLINE-FIRST IMPLEMENTATION**

### ✅ **4.1 Offline Storage Manager**

```typescript
// src/services/OfflineStorageManager.ts
interface CachedData {
  data: any
  timestamp: number
  version: number
}

interface PendingOperation {
  id: string
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  data: any
  timestamp: number
  retryCount: number
}

export class OfflineStorageManager {
  private readonly CACHE_PREFIX = 'bookshelf_cache_'
  private readonly PENDING_PREFIX = 'bookshelf_pending_'
  private readonly MAX_RETRY_COUNT = 3
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  // Cache management
  setCache(key: string, data: any, version: number = 1): void {
    const cachedData: CachedData = {
      data,
      timestamp: Date.now(),
      version
    }
    localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cachedData))
  }

  getCache(key: string): any | null {
    const cached = localStorage.getItem(this.CACHE_PREFIX + key)
    if (!cached) return null

    const cachedData: CachedData = JSON.parse(cached)
    
    // Check if cache is expired
    if (Date.now() - cachedData.timestamp > this.CACHE_DURATION) {
      this.removeCache(key)
      return null
    }

    return cachedData.data
  }

  removeCache(key: string): void {
    localStorage.removeItem(this.CACHE_PREFIX + key)
  }

  // Pending operations management
  addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = crypto.randomUUID()
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0
    }

    const existing = this.getPendingOperations()
    existing.push(pendingOp)
    
    localStorage.setItem(this.PENDING_PREFIX + 'operations', JSON.stringify(existing))
    return id
  }

  getPendingOperations(): PendingOperation[] {
    const pending = localStorage.getItem(this.PENDING_PREFIX + 'operations')
    return pending ? JSON.parse(pending) : []
  }

  removePendingOperation(id: string): void {
    const existing = this.getPendingOperations()
    const filtered = existing.filter(op => op.id !== id)
    localStorage.setItem(this.PENDING_PREFIX + 'operations', JSON.stringify(filtered))
  }

  incrementRetryCount(id: string): void {
    const existing = this.getPendingOperations()
    const operation = existing.find(op => op.id === id)
    if (operation) {
      operation.retryCount++
      localStorage.setItem(this.PENDING_PREFIX + 'operations', JSON.stringify(existing))
    }
  }

  // Sync pending operations when online
  async syncPendingOperations(supabaseService: SupabaseUserService): Promise<void> {
    const pending = this.getPendingOperations()
    const syncPromises = pending.map(async (operation) => {
      try {
        await this.executePendingOperation(operation, supabaseService)
        this.removePendingOperation(operation.id)
      } catch (error) {
        if (operation.retryCount < this.MAX_RETRY_COUNT) {
          this.incrementRetryCount(operation.id)
        } else {
          console.error('Max retries reached for operation:', operation)
          this.removePendingOperation(operation.id)
        }
      }
    })

    await Promise.allSettled(syncPromises)
  }

  private async executePendingOperation(
    operation: PendingOperation, 
    supabaseService: SupabaseUserService
  ): Promise<void> {
    switch (operation.table) {
      case 'user_highlights':
        if (operation.type === 'INSERT') {
          await supabaseService.addHighlight(operation.data)
        } else if (operation.type === 'UPDATE') {
          await supabaseService.updateHighlight(operation.data.id, operation.data)
        } else if (operation.type === 'DELETE') {
          await supabaseService.removeHighlight(operation.data.id)
        }
        break

      case 'user_progress':
        if (operation.type === 'INSERT' || operation.type === 'UPDATE') {
          await supabaseService.updateProgress(operation.data)
        }
        break

      default:
        throw new Error(`Unknown table: ${operation.table}`)
    }
  }
}

export const offlineStorageManager = new OfflineStorageManager()
```

### ✅ **4.2 Connection State Manager**

```typescript
// src/services/ConnectionStateManager.ts
import { supabase } from './supabaseClient'
import { offlineStorageManager } from './OfflineStorageManager'

type ConnectionStatus = 'online' | 'offline' | 'reconnecting'

export class ConnectionStateManager {
  private status: ConnectionStatus = 'online'
  private listeners: Set<(status: ConnectionStatus) => void> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor() {
    this.initializeListeners()
  }

  private initializeListeners(): void {
    // Browser online/offline events
    window.addEventListener('online', () => {
      this.handleOnline()
    })

    window.addEventListener('offline', () => {
      this.handleOffline()
    })

    // Supabase connection monitoring
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.handleOnline()
      }
    })

    // Initial status check
    this.checkConnectionStatus()
  }

  private async checkConnectionStatus(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      
      this.setStatus('online')
    } catch (error) {
      this.setStatus('offline')
    }
  }

  private handleOnline(): void {
    this.setStatus('reconnecting')
    this.attemptReconnection()
  }

  private handleOffline(): void {
    this.setStatus('offline')
    this.reconnectAttempts = 0
  }

  private async attemptReconnection(): Promise<void> {
    try {
      // Test connection with a simple query
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      this.setStatus('online')
      this.reconnectAttempts = 0
      
      // Sync pending operations when reconnected
      const { SupabaseUserService } = await import('./SupabaseUserService')
      const supabaseService = new SupabaseUserService()
      await offlineStorageManager.syncPendingOperations(supabaseService)
      
    } catch (error) {
      this.reconnectAttempts++
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.attemptReconnection()
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
      } else {
        this.setStatus('offline')
      }
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status
      this.notifyListeners()
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.status))
  }

  // Public API
  getStatus(): ConnectionStatus {
    return this.status
  }

  isOnline(): boolean {
    return this.status === 'online'
  }

  addListener(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export const connectionStateManager = new ConnectionStateManager()
```

---

## 🔄 **PHASE 5: INTEGRATION & TESTING**

### ✅ **5.1 Update UserContext Integration**

```typescript
// src/contexts/UserContext.tsx - Updated imports
import { SupabaseUserService } from '../services/SupabaseUserService'
import { connectionStateManager } from '../services/ConnectionStateManager'
import { offlineStorageManager } from '../services/OfflineStorageManager'

// Replace the mock service
const userService = new SupabaseUserService()

// Enhanced actions with offline support
const actions = {
  addHighlight: async (highlight: Omit<UserHighlight, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (connectionStateManager.isOnline()) {
        const newHighlight = await userService.addHighlight(highlight)
        dispatch({ type: 'ADD_HIGHLIGHT', payload: newHighlight })
      } else {
        // Offline: add to local cache and pending operations
        const tempHighlight: UserHighlight = {
          ...highlight,
          id: `offline_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        dispatch({ type: 'ADD_HIGHLIGHT', payload: tempHighlight })
        
        offlineStorageManager.addPendingOperation({
          type: 'INSERT',
          table: 'user_highlights',
          data: highlight
        })
      }
    } catch (error) {
      console.error('Failed to add highlight:', error)
      throw error
    }
  }
  
  // Similar pattern for other operations...
}
```

### ✅ **5.2 App.tsx Integration**

```typescript
// src/components/App.tsx - Updated to use enhanced UserProvider
import { EnhancedUserProvider } from '../contexts/EnhancedUserContext'
import { ConnectionStateIndicator } from './ConnectionStateIndicator'

export default function App() {
  return (
    <EnhancedUserProvider>
      <ThemeProvider>
        <div className="theme-bg min-h-screen theme-transition">
          <ConnectionStateIndicator />
          <AppContent />
        </div>
      </ThemeProvider>
    </EnhancedUserProvider>
  )
}
```

### ✅ **5.3 Connection State UI Component**

```typescript
// src/components/ConnectionStateIndicator.tsx
import React from 'react'
import { connectionStateManager } from '../services/ConnectionStateManager'

export function ConnectionStateIndicator() {
  const [status, setStatus] = React.useState(connectionStateManager.getStatus())

  React.useEffect(() => {
    return connectionStateManager.addListener(setStatus)
  }, [])

  if (status === 'online') return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 text-center py-2 text-sm font-medium ${
      status === 'offline' 
        ? 'bg-red-500 text-white' 
        : 'bg-yellow-500 text-black'
    }`}>
      {status === 'offline' && '⚠️ You are offline. Changes will sync when reconnected.'}
      {status === 'reconnecting' && '🔄 Reconnecting...'}
    </div>
  )
}
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### 🚀 **Phase 1: Infrastructure (Week 1)**
- [ ] **Create Supabase project and configure environment variables**
- [ ] **Run database schema creation scripts**
- [ ] **Set up Row Level Security policies**
- [ ] **Configure authentication providers (email, GitHub, Google)**
- [ ] **Test database connections and RLS**

### 🔧 **Phase 2: Service Layer (Week 2)**
- [ ] **Implement SupabaseUserService class**
- [ ] **Create type definitions for database schema**
- [ ] **Test all CRUD operations with RLS**
- [ ] **Implement error handling and validation**
- [ ] **Test authentication flows**

### ⚡ **Phase 3: Real-time Features (Week 3)**
- [ ] **Implement RealtimeManager for subscriptions**
- [ ] **Add presence tracking functionality**
- [ ] **Test cross-device synchronization**
- [ ] **Implement optimistic updates**
- [ ] **Test real-time conflict resolution**

### 📱 **Phase 4: Offline Support (Week 4)**
- [ ] **Implement OfflineStorageManager**
- [ ] **Create ConnectionStateManager**
- [ ] **Add pending operations queue**
- [ ] **Test offline/online transitions**
- [ ] **Implement data conflict resolution**

### 🔄 **Phase 5: Integration (Week 5)**
- [ ] **Update UserContext to use Supabase service**
- [ ] **Replace mock service calls throughout app**
- [ ] **Add connection state UI indicators**
- [ ] **Test complete user flows**
- [ ] **Performance optimization and caching**

### 🧪 **Phase 6: Testing & Validation (Week 6)**
- [ ] **Cross-device testing (multiple browsers/devices)**
- [ ] **Offline scenario testing**
- [ ] **Real-time synchronization stress testing**
- [ ] **Data integrity validation**
- [ ] **Performance benchmarking**
- [ ] **Security penetration testing**

---

## 🎯 **SUCCESS METRICS**

### 📊 **Technical Metrics**
- **Authentication Response Time**: < 2 seconds
- **Real-time Update Latency**: < 500ms
- **Offline-to-Online Sync Time**: < 5 seconds
- **Cross-device Sync Accuracy**: 99.9%
- **Data Consistency**: 100% (no data loss)

### 👤 **User Experience Metrics**
- **Seamless cross-device access to highlights and progress**
- **Real-time collaboration indicators**
- **Offline reading with automatic sync**
- **Zero data loss during connection issues**
- **Instant highlight synchronization across devices**

### 🔒 **Security & Privacy**
- **Complete user data isolation via RLS**
- **Secure authentication with social providers**
- **No unauthorized access to user highlights/progress**
- **GDPR-compliant data handling**

---

## 🚀 **NEXT STEPS**

1. **Start with Phase 1**: Set up Supabase infrastructure and database schema
2. **Incremental Implementation**: Deploy each phase independently with testing
3. **User Feedback Integration**: Gather feedback during Phase 5 integration
4. **Performance Monitoring**: Implement analytics for optimization
5. **Community Features**: Prepare for book module sharing in future phases

This implementation transforms the current educational platform into a fully synchronized, real-time collaborative learning environment while maintaining all existing functionality and ensuring zero data loss during the transition.
