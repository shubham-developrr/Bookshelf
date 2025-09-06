import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

/**
 * @interface User
 * @description Represents the structure of a user object in the application.
 * @property {string} id - The user's unique identifier.
 * @property {string} email - The user's email address.
 * @property {string} username - The user's username.
 * @property {string} fullName - The user's full name.
 * @property {string} [avatarUrl] - URL to the user's avatar image.
 * @property {'student' | 'educator' | 'admin'} role - The user's role.
 * @property {UserPreferences} preferences - The user's application preferences.
 * @property {string} createdAt - ISO string of when the user was created.
 * @property {string} [lastLogin] - ISO string of the user's last login.
 */
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

/**
 * @interface UserPreferences
 * @description Defines the structure for user-specific application preferences.
 * @property {'light' | 'dark' | 'ocean-blue' | 'amoled'} theme - The selected theme.
 * @property {'small' | 'medium' | 'large'} fontSize - The selected font size.
 * @property {boolean} autoSaveHighlights - Whether highlights are saved automatically.
 * @property {boolean} emailNotifications - Whether email notifications are enabled.
 * @property {boolean} progressTracking - Whether progress tracking is enabled.
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'ocean-blue' | 'amoled';
  fontSize: 'small' | 'medium' | 'large';
  autoSaveHighlights: boolean;
  emailNotifications: boolean;
  progressTracking: boolean;
}

/**
 * @interface UserProgress
 * @description Represents a user's progress within a specific chapter of a book.
 * @property {string} bookId - The ID of the book.
 * @property {string} chapterId - The ID of the chapter.
 * @property {number} progressPercentage - The user's progress percentage.
 * @property {number} timeSpent - The time spent in minutes.
 * @property {string} lastAccessed - ISO string of the last access date.
 * @property {string} [completedAt] - ISO string of the completion date.
 * @property {string} [notes] - User's notes for this chapter.
 */
export interface UserProgress {
  bookId: string;
  chapterId: string;
  progressPercentage: number;
  timeSpent: number; // in minutes
  lastAccessed: string;
  completedAt?: string;
  notes?: string;
}

/**
 * @interface UserHighlight
 * @description Represents a user's highlight within a chapter.
 * @property {string} id - The unique ID of the highlight.
 * @property {string} bookId - The ID of the book.
 * @property {string} chapterId - The ID of the chapter.
 * @property {string} text - The highlighted text content.
 * @property {'yellow' | 'green' | 'blue' | 'red'} color - The color of the highlight.
 * @property {object} position - The start and end position of the highlight.
 * @property {string} [note] - A note associated with the highlight.
 * @property {string} createdAt - ISO string of the creation date.
 * @property {string} updatedAt - ISO string of the last update date.
 */
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

/**
 * @interface UserState
 * @description Defines the shape of the state managed by the userReducer.
 * @property {User | null} user - The current user object, or null if not authenticated.
 * @property {boolean} isAuthenticated - Whether the user is currently authenticated.
 * @property {boolean} isLoading - Whether a user-related operation is in progress.
 * @property {object} progress - A map of user's progress, nested by book and chapter ID.
 * @property {UserHighlight[]} highlights - An array of the user's highlights.
 * @property {string | null} error - An error message, if any.
 */
interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  progress: { [bookId: string]: { [chapterId: string]: UserProgress } };
  highlights: UserHighlight[];
  error: string | null;
}

/**
 * @type UserAction
 * @description A discriminated union type representing all possible actions for the userReducer.
 */
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

/**
 * @description The reducer function for managing the user state.
 * @param {UserState} state - The current state.
 * @param {UserAction} action - The dispatched action.
 * @returns {UserState} The new state.
 */
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

/**
 * @interface UserContextType
 * @description Defines the shape of the context value, including the state and an actions object.
 * @property {UserState} state - The current user state.
 * @property {object} actions - An object containing all the actions to interact with the user state.
 */
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

/**
 * @description A provider that manages all user-related state and logic, including API calls and real-time updates.
 * @param {{ children: ReactNode }} props - The component's props.
 * @returns {React.FC} The UserProvider component.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Initialize user on app start
  useEffect(() => {
    initializeUser();
  }, []);

  // Sync data when user logs in and set up real-time subscriptions
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

/**
 * @description The primary custom hook for accessing the full UserContext (both state and actions).
 * It must be used within a UserProvider.
 * @returns {UserContextType} The user context value.
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

/**
 * @description A convenience hook for accessing authentication-related state and actions.
 * @returns {object} An object containing user, isAuthenticated, isLoading, error, and auth actions.
 */
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

/**
 * @description A convenience hook for accessing user progress state and actions.
 * Can be scoped to a specific book and/or chapter.
 * @param {string} [bookId] - The ID of the book to get progress for.
 * @param {string} [chapterId] - The ID of the chapter to get progress for.
 * @returns {object} An object containing the progress data and the updateProgress action.
 */
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

/**
 * @description A convenience hook for accessing user highlight state and actions.
 * Can be filtered by book and/or chapter.
 * @param {string} [bookId] - The ID of the book to filter highlights by.
 * @param {string} [chapterId] - The ID of the chapter to filter highlights by.
 * @returns {object} An object containing the filtered highlights and highlight-related actions.
 */
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
