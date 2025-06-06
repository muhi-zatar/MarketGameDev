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
      // For development purposes, we'll use existing users from the sample data
      // In a real app, you'd authenticate against the backend
      let userId;
      
      if (userType === 'operator' && username === 'instructor') {
        userId = 'operator_1';
      } else if (userType === 'utility' && username.startsWith('utility_')) {
        userId = username; // utility_1, utility_2, utility_3
      } else {
        throw new Error('Invalid credentials');
      }
      
      // Fetch user details
      const response = await api.get(`/users/${userId}`);
      const userData: User = {
        id: response.data.id,
        username: response.data.username,
        userType: response.data.user_type as 'operator' | 'utility',
        budget: response.data.budget,
        debt: response.data.debt,
        equity: response.data.equity
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
      const response = await api.post('/users', { 
        username, 
        user_type: userType 
      });
      
      const userData: User = {
        id: response.data.id,
        username: response.data.username,
        userType: response.data.user_type as 'operator' | 'utility',
        budget: response.data.budget,
        debt: response.data.debt,
        equity: response.data.equity
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