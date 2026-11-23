import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi, getApiBaseUrl, setApiBaseUrl, isMockModeActive, setMockModeActive } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiBaseUrl: string;
  isMockMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateApiBaseUrl: (url: string) => void;
  toggleMockMode: (active: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('localeflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('localeflow_token');
  });
  const [isLoading, setIsLoading] = useState(true);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getApiBaseUrl());
  const [isMockMode, setIsMockModeState] = useState<boolean>(isMockModeActive());

  // Listen for unauthorized events from Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('localeflow_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('localeflow_unauthorized', handleUnauthorized);
  }, []);

  // Validate session on boot if token exists
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await authApi.getMe();
        setUser(profile);
        localStorage.setItem('localeflow_user', JSON.stringify(profile));
      } catch {
        // If profile fetch fails on backend, fallback to stored user or clear if invalid
        if (!user) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const profile: User = {
      userId: res.userId,
      email: res.email,
      fullName: res.fullName,
    };
    setToken(res.token);
    setUser(profile);
    localStorage.setItem('localeflow_token', res.token);
    localStorage.setItem('localeflow_user', JSON.stringify(profile));
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await authApi.register({ fullName, email, password });
    const profile: User = {
      userId: res.userId,
      email: res.email,
      fullName: res.fullName,
    };
    setToken(res.token);
    setUser(profile);
    localStorage.setItem('localeflow_token', res.token);
    localStorage.setItem('localeflow_user', JSON.stringify(profile));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('localeflow_token');
    localStorage.removeItem('localeflow_user');
  };

  const updateApiBaseUrl = (url: string) => {
    const cleaned = url.replace(/\/+$/, '');
    setApiBaseUrl(cleaned);
    setApiBaseUrlState(cleaned);
  };

  const toggleMockMode = (active: boolean) => {
    setMockModeActive(active);
    setIsMockModeState(active);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        apiBaseUrl,
        isMockMode,
        login,
        register,
        logout,
        updateApiBaseUrl,
        toggleMockMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
