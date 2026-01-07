
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Verify session via ProfileView (/api/auth/profile/)
          const profile = await apiRequest('/api/auth/profile/');
          setUser(profile);
        } catch (e) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: any) => {
    // Note: Django SimpleJWT typically expects 'username', 
    // but some configurations use 'email'. Providing both for safety.
    const data = await apiRequest('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        username: credentials.email, 
        password: credentials.password
      }),
    });
    
    if (data.access) {
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      // Fetch profile immediately after successful token acquisition
      const profile = await apiRequest('/api/auth/profile/');
      setUser(profile);
    } else {
      throw new Error("Invalid response from login server");
    }
  };

  const register = async (regData: any) => {
    // Mapping camelCase from frontend to the fields expected by RegisterSerializer
    // backend expects email, password, password2, first_name, last_name
    const payload = {
      first_name: regData.firstName,
      last_name: regData.lastName,
      email: regData.email,
      password: regData.password,
      password2: regData.confirmPassword
    };

    await apiRequest('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    try {
      if (refresh) {
        // Blacklist token on backend (/api/auth/logout/)
        await apiRequest('/api/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      }
    } catch (e) {
      console.error('Logout error at backend service', e);
    } finally {
      // Always clear local state even if backend call fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
