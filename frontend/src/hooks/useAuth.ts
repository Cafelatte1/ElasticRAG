import React, { useState, useEffect, createContext, useContext } from 'react';

interface User {
  username: string;  // 단일 식별자로 username만 사용
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 백엔드의 토큰 검증 API 호출
      fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Invalid token');
      })
      .then(userData => {
        setUser(userData);
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
      });
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', username);  // OAuth2는 'username' 필드를 사용
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        body: formData  // JSON 대신 FormData 사용
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.detail === "Incorrect email or password") {
          throw new Error('이메일 또는 비밀번호가 잘못되었습니다');
        }
        throw new Error('로그인 실패');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      
      // 사용자 정보 가져오기
      const userResponse = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const signup = async (username: string, password: string) => {
    // 이메일 유효성 검사
    if (username.length > 100) {
      throw new Error('이메일은 100자를 초과할 수 없습니다');
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.detail === "Email already registered") {
          throw new Error('같은 아이디가 존재합니다');
        }
        throw new Error('회원가입 실패');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  return React.createElement(AuthContext.Provider, 
    { value: { user, isAuthenticated, login, logout, signup } },
    children
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
