import React, { createContext, useContext, useState, useEffect } from 'react';

interface Role {
  id: number;
  name: string;
  permissions: Record<string, boolean>;
}

interface UserDocument {
  id: number;
  filename: string;
  filepath: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  location?: string;
  roleId: number;
  division?: string;
  bio?: string;
  skills?: string;
  qualifications?: string;
  needsPasswordChange: boolean;
  role: Role;
  userDocuments?: UserDocument[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwtToken'));
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async (currentToken: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        logout(); // Token invalid
      }
    } catch (error) {
      console.error("Failed to fetch current user", error);
    } finally {
      setLoading(false);
    }
  };

  const setAuth = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('jwtToken', newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('token');
  };

  const hasPermission = (key: string) => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Administrator') return true; // Super admin bypass
    return !!user.role.permissions[key];
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, setAuth, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
