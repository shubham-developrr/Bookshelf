import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  role: 'student' | 'educator' | 'admin';
  preferences: UserPreferences;
  createdAt: string;
  lastLogin?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'ocean-blue' | 'amoled';
  fontSize: 'small' | 'medium' | 'large';
  autoSaveHighlights: boolean;
  emailNotifications: boolean;
  progressTracking: boolean;
}

export interface UserProgress {
  bookId: string;
  chapterId: string;
  progressPercentage: number;
  timeSpent: number; // in minutes
  lastAccessed: string;
  completedAt?: string;
  notes?: string;
}

export interface UserHighlight {
  id: string;
  bookId: string;
  chapterId: string;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'red';
  position: {
    start: number;
    end: number;
  };
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// State management
interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  progress: { [bookId: string]: { [chapterId: string]: UserProgress } };
  highlights: UserHighlight[];
  error: string | null;
}

type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_PROGRESS'; payload: UserProgress }
  | { type: 'ADD_HIGHLIGHT'; payload: UserHighlight }
  | { type: 'UPDATE_HIGHLIGHT'; payload: { id: string; updates: Partial<UserHighlight> } }
  | { type: 'REMOVE_HIGHLIGHT'; payload: string }
  | { type: 'SET_HIGHLIGHTS'; payload: UserHighlight[] }
  | { type: 'SET_PROGRESS'; payload: UserProgress[] }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> };

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  progress: {},
  highlights: [],
  error: null
};

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'UPDATE_PROGRESS':
      const { bookId, chapterId } = action.payload;
      return {
        ...state,
        progress: {
          ...state.progress,
          [bookId]: {
            ...state.progress[bookId],
            [chapterId]: action.payload
          }
        }
      };
    
    case 'SET_PROGRESS':
      const progressMap: { [bookId: string]: { [chapterId: string]: UserProgress } } = {};
      action.payload.forEach(progress => {
        if (!progressMap[progress.bookId]) {
          progressMap[progress.bookId] = {};
        }
        progressMap[progress.bookId][progress.chapterId] = progress;
      });
      return { ...state, progress: progressMap };
    
    case 'ADD_HIGHLIGHT':
      return {
        ...state,
        highlights: [...state.highlights, action.payload]
      };
    
    case 'UPDATE_HIGHLIGHT':
      return {
        ...state,
        highlights: state.highlights.map(highlight =>
          highlight.id === action.payload.id
            ? { ...highlight, ...action.payload.updates }
            : highlight
        )
      };
    
    case 'REMOVE_HIGHLIGHT':
      return {
        ...state,
        highlights: state.highlights.filter(highlight => highlight.id !== action.payload)
      };
    
    case 'SET_HIGHLIGHTS':
      return { ...state, highlights: action.payload };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        user: state.user ? {
          ...state.user,
          preferences: { ...state.user.preferences, ...action.payload }
        } : null
      };
    
    default:
      return state;
  }
}

// API service - Updated to use Supabase
import { supabaseUserService } from '../services/SupabaseUserService';
import { realtimeManager } from '../services/RealtimeManager';

const userService = supabaseUserService;

// Context
interface UserContextType {
  state: UserState;
  actions: {
    login: (email: string, password: string) => Promise<void>;
    register: (userData: { email: string; password: string; username: string; fullName: string }) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
    updateProgress: (progress: Omit<UserProgress, 'lastAccessed'>) => Promise<void>;
    addHighlight: (highlight: Omit<UserHighlight, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateHighlight: (id: string, updates: Partial<UserHighlight>) => Promise<void>;
    removeHighlight: (id: string) => Promise<void>;
    updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  };
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Initialize user on app start
  useEffect(() => {
    initializeUser();
  }, []);

  // Sync data when user logs in
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      syncUserData();
      setupRealtimeSubscriptions();
    } else {
      // Clean up subscriptions when user logs out
      realtimeManager.cleanup();
    }
  }, [state.isAuthenticated]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      realtimeManager.cleanup();
    };
  }, []);

  const initializeUser = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const user = await userService.getCurrentUser();
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize user session' });
    }
  };

  const syncUserData = async () => {
    try {
      const [progress, highlights] = await Promise.all([
        userService.getProgress(),
        userService.getHighlights()
      ]);
      dispatch({ type: 'SET_PROGRESS', payload: progress });
      dispatch({ type: 'SET_HIGHLIGHTS', payload: highlights });
    } catch (error) {
      console.error('Failed to sync user data:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!state.user?.id) return;

    // Initialize real-time subscriptions for the user
    realtimeManager.initializeForUser(state.user.id);

    // Subscribe to progress updates
    realtimeManager.onProgressUpdate((progress, event) => {
      dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
    });

    // Subscribe to highlight updates
    realtimeManager.onHighlightUpdate((highlight, event) => {
      if (event === 'INSERT') {
        dispatch({ type: 'ADD_HIGHLIGHT', payload: highlight });
      } else if (event === 'UPDATE') {
        dispatch({ type: 'UPDATE_HIGHLIGHT', payload: { id: highlight.id, updates: highlight } });
      }
    });

    // Subscribe to highlight deletions
    realtimeManager.onHighlightDelete((highlightId) => {
      dispatch({ type: 'REMOVE_HIGHLIGHT', payload: highlightId });
    });
  };

  const actions = {
    login: async (email: string, password: string) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const user = await userService.login(email, password);
        dispatch({ type: 'SET_USER', payload: user });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
      }
    },

    register: async (userData: { email: string; password: string; username: string; fullName: string }) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const user = await userService.register(userData);
        dispatch({ type: 'SET_USER', payload: user });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Registration failed' });
      }
    },

    logout: async () => {
      try {
        await userService.logout();
        realtimeManager.cleanup(); // Clean up real-time subscriptions
        dispatch({ type: 'SET_USER', payload: null });
      } catch (error) {
        console.error('Logout failed:', error);
        // Still clear local state and subscriptions even if API call fails
        realtimeManager.cleanup();
        dispatch({ type: 'SET_USER', payload: null });
      }
    },

    updateProfile: async (updates: Partial<User>) => {
      try {
        const updatedUser = await userService.updateProfile(updates);
        dispatch({ type: 'SET_USER', payload: updatedUser });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Profile update failed' });
      }
    },

    updateProgress: async (progress: Omit<UserProgress, 'lastAccessed'>) => {
      try {
        const updatedProgress = await userService.updateProgress(progress);
        dispatch({ type: 'UPDATE_PROGRESS', payload: updatedProgress });
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    },

    addHighlight: async (highlight: Omit<UserHighlight, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newHighlight = await userService.addHighlight(highlight);
        dispatch({ type: 'ADD_HIGHLIGHT', payload: newHighlight });
      } catch (error) {
        console.error('Failed to add highlight:', error);
      }
    },

    updateHighlight: async (id: string, updates: Partial<UserHighlight>) => {
      try {
        const updatedHighlight = await userService.updateHighlight(id, updates);
        dispatch({ type: 'UPDATE_HIGHLIGHT', payload: { id, updates: updatedHighlight } });
      } catch (error) {
        console.error('Failed to update highlight:', error);
      }
    },

    removeHighlight: async (id: string) => {
      try {
        await userService.removeHighlight(id);
        dispatch({ type: 'REMOVE_HIGHLIGHT', payload: id });
      } catch (error) {
        console.error('Failed to remove highlight:', error);
      }
    },

    updatePreferences: async (preferences: Partial<UserPreferences>) => {
      try {
        const updatedUser = await userService.updateProfile({ 
          preferences: { ...state.user!.preferences, ...preferences } 
        });
        dispatch({ type: 'SET_USER', payload: updatedUser });
      } catch (error) {
        console.error('Failed to update preferences:', error);
      }
    }
  };

  return (
    <UserContext.Provider value={{ state, actions }}>
      {children}
    </UserContext.Provider>
  );
}

// Hook for using the user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Helper hooks for common operations
export function useAuth() {
  const { state, actions } = useUser();
  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login: actions.login,
    register: actions.register,
    logout: actions.logout
  };
}

export function useProgress(bookId?: string, chapterId?: string) {
  const { state, actions } = useUser();
  
  const getProgress = (book?: string, chapter?: string) => {
    if (!book) return state.progress;
    if (!chapter) return state.progress[book] || {};
    return state.progress[book]?.[chapter];
  };

  return {
    progress: getProgress(bookId, chapterId),
    updateProgress: actions.updateProgress
  };
}

export function useHighlights(bookId?: string, chapterId?: string) {
  const { state, actions } = useUser();
  
  const filteredHighlights = state.highlights.filter(highlight => {
    if (bookId && highlight.bookId !== bookId) return false;
    if (chapterId && highlight.chapterId !== chapterId) return false;
    return true;
  });

  return {
    highlights: filteredHighlights,
    addHighlight: actions.addHighlight,
    updateHighlight: actions.updateHighlight,
    removeHighlight: actions.removeHighlight
  };
}
