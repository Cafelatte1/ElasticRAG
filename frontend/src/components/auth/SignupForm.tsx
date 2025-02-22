import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SignupFormProps {
  onClose: () => void;
}

export default function SignupForm({ onClose }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signup } = useAuth();

  const validateEmail = (email: string) => {
    if (email.length > 100) {
      return '이메일은 100자를 초과할 수 없습니다';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return '유효한 이메일 주소를 입력해주세요';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 이메일 유효성 검사
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      await signup(email, password);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      if (err.message.includes('같은 아이디가 존재합니다')) {
        setError('같은 아이디가 존재합니다');
        setEmail('');
        setPassword('');
      } else if (err.message.includes('100자를 초과')) {
        setError('이메일은 100자를 초과할 수 없습니다');
      } else {
        setError('회원가입 중 오류가 발생했습니다');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success ? (
        <div className="text-green-500 text-center py-4">
          회원가입이 완료되었습니다!
          <br />
          로그인 해주세요.
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={100}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">최대 100자</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            회원가입
          </button>
        </>
      )}
    </form>
  );
} 