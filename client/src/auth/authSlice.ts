import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
}

export const MAX_SESSION_MS = 10 * 60 * 60 * 1000; // 10 hours

function isSessionExpired(): boolean {
  const loggedInAt = localStorage.getItem('logged_in_at');
  if (!loggedInAt) return false;
  const elapsed = Date.now() - Number(loggedInAt);
  return elapsed > MAX_SESSION_MS;
}

function readStoredUser(): User | null {
  if (isSessionExpired()) return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  if (isSessionExpired()) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('logged_in_at');
    return null;
  }
  return localStorage.getItem('access_token');
}

const initialState: AuthState = {
  user: readStoredUser(),
  token: readStoredToken(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('access_token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      if (!localStorage.getItem('logged_in_at')) {
        localStorage.setItem('logged_in_at', Date.now().toString());
      }
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('logged_in_at');
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export { isSessionExpired };
export default authSlice.reducer;
