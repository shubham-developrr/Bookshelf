# 🚀 SUPABASE IMPLEMENTATION GUIDE
## Real-time User Progress Synchronization

### 🎯 **IMPLEMENTATION OVERVIEW**

This guide implements a complete Supabase backend for the educational platform, enabling:
- **Real-time cross-device synchronization** of user progress and highlights
- **Offline-first architecture** with intelligent sync
- **User authentication** with social providers
- **Complete data isolation** using Row Level Security

---

## 📋 **PHASE 1: IMMEDIATE SETUP (Today)**

### ✅ **Step 1: Supabase Project Setup**
1. Create new Supabase project
2. Get project URL and anon key
3. Configure environment variables

### ✅ **Step 2: Database Schema**
Run the following SQL in Supabase SQL Editor:

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
```

### ✅ **Step 3: Row Level Security**
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
```

### ✅ **Step 4: Triggers & Functions**
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

### ✅ **Step 5: Enable Realtime**
```sql
-- Enable realtime for user-specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_highlights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
```

---

## 📦 **PHASE 2: INSTALL DEPENDENCIES**

### ✅ **Install Supabase Client**
```bash
npm install @supabase/supabase-js
```

### ✅ **Environment Variables**
Create/update `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🔧 **PHASE 3: SERVICE IMPLEMENTATION**

Files to create:
1. `src/services/supabaseClient.ts` - Supabase client configuration
2. `src/services/SupabaseUserService.ts` - Service implementation
3. `src/services/RealtimeManager.ts` - Real-time subscriptions
4. Update `src/contexts/UserContext.tsx` - Replace mock service

---

## 🧪 **PHASE 4: TESTING CHECKLIST**

- [ ] User registration and login
- [ ] Profile creation and updates
- [ ] Progress tracking across devices
- [ ] Highlight synchronization
- [ ] Real-time updates
- [ ] Offline functionality

---

## 🚨 **IMMEDIATE ACTION ITEMS**

1. **Create Supabase project** → Get credentials
2. **Run database setup** → Execute SQL scripts
3. **Install dependencies** → Add Supabase client
4. **Environment setup** → Add credentials to .env.local
5. **Service implementation** → Replace UserService

---

## 📞 **NEED HELP WITH:**

- Supabase project credentials (URL + anon key)
- Authentication provider preferences (email, Google, GitHub?)
- Specific testing scenarios you want prioritized

**Ready to start implementation immediately!** 🚀
