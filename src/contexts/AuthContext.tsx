import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

type User = {
  id: string;
  username: string;
  userType: 'operator' | 'utility';
  budget?: number;
  debt?: number;
  equity?: number;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, userType: 'operator' | 'utility') => Promise<void>;
  register: (username: string, userType: 'operator' | 'utility') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, userType: 'operator' | 'utility') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For development purposes, create mock user data without API call
      // This avoids the need for the backend to be running during development
      let userData: User;
      
      if (userType === 'operator' && username === 'instructor') {
        userData = {
          id: 'operator_1',
          username: 'instructor',
          userType: 'operator',
          budget: 10000000000,
          debt: 0,
          equity: 10000000000
        };
      } else if (userType === 'utility' && username.startsWith('utility_')) {
        userData = {
          id: username,
          username: username,
          userType: 'utility',
          budget: 2000000000,
          debt: 0,
          equity: 2000000000
        };
      } else {
        throw new Error('Invalid credentials');
      }
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Navigate based on user type
      if (userData.userType === 'operator') {
        navigate('/operator');
      } else {
        navigate('/utility');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, userType: 'operator' | 'utility') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For development, create mock user without API call
      const userData: User = {
        id: userType === 'operator' ? 'operator_new' : `utility_new_${Date.now()}`,
        username: username,
        userType: userType,
        budget: userType === 'operator' ? 10000000000 : 2000000000,
        debt: 0,
        equity: userType === 'operator' ? 10000000000 : 2000000000
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Navigate based on user type
      if (userData.userType === 'operator') {
        navigate('/operator');
      } else {
        navigate('/utility');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}