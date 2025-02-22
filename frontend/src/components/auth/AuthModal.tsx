import { useState, useEffect } from 'react';
import LoginForm from '../auth/LoginForm';
import SignupForm from '../auth/SignupForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'login' ? (
          <LoginForm onClose={onClose} />
        ) : (
          <SignupForm onClose={onClose} />
        )}

        <div className="mt-4 text-center">
          {mode === 'login' ? (
            <button
              onClick={() => setMode('signup')}
              className="text-blue-500 hover:text-blue-600"
            >
              계정이 없으신가요? 회원가입
            </button>
          ) : (
            <button
              onClick={() => setMode('login')}
              className="text-blue-500 hover:text-blue-600"
            >
              이미 계정이 있으신가요? 로그인
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 