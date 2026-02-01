import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

const USER_ID_KEY = 'voice-todo-user-id';

export interface AuthState {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Get or create a local user ID (fallback when Firebase is not configured)
function getLocalUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = 'local-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// Sign in anonymously to Firebase
export async function signInAnonymousUser(): Promise<User | null> {
  if (!isFirebaseConfigured() || !auth) {
    return null;
  }

  try {
    const result = await signInAnonymously(auth);
    // Store the Firebase UID locally for consistency
    localStorage.setItem(USER_ID_KEY, result.user.uid);
    return result.user;
  } catch (error) {
    console.error('Anonymous sign-in failed:', error);
    return null;
  }
}

// Get the current user ID (Firebase UID or local fallback)
export function getCurrentUserId(): string {
  if (isFirebaseConfigured() && auth?.currentUser) {
    return auth.currentUser.uid;
  }
  return getLocalUserId();
}

// Subscribe to auth state changes
export function subscribeToAuthState(
  callback: (state: AuthState) => void
): () => void {
  if (!isFirebaseConfigured() || !auth) {
    // Return local-only state
    callback({
      user: null,
      userId: getLocalUserId(),
      isLoading: false,
      error: null
    });
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    callback({
      user,
      userId: user?.uid || getLocalUserId(),
      isLoading: false,
      error: null
    });
  });
}
