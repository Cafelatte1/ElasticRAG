import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import AuthModal from '../auth/AuthModal';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'signup'>('login');
  const isSignupDisabled = true;

  // 기능별 활성화 상태 관리
  const featureFlags = {
    aiSearch: true,  // AI Search 기능 비활성화
    aiDocument: false // AI Document 기능 비활성화
  };

  const openModal = (mode: 'login' | 'signup') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleProtectedLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    
    // 기능별 활성화 상태 체크
    if (path === '/ai-search' && !featureFlags.aiSearch) {
      alert('현재 개발중인 기능입니다.');
      return;
    }
    if (path === '/ai-document' && !featureFlags.aiDocument) {
      alert('현재 개발중인 기능입니다.');
      return;
    }

    if (!isAuthenticated) {
      alert('로그인을 먼저 해주세요.');
      return;
    }
    router.push(path);
  };

  const handleSignupClick = () => {
    if (isSignupDisabled) {
      alert('직접 회원가입은 현재 불가능합니다. 관리자에게 문의해 주세요.');
      return;
    }
    openModal('signup');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');  // 홈으로 리다이렉트
  };

  return (
    <>
      <header className="fixed w-full bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center">
              {/* <Image 
                src="/images/logos/penguin.jpg" 
                alt="Company Logo" 
                width={150} 
                height={60} 
                className="mr-6"
              /> */}
              <Link href="/" 
                 className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                Home
              </Link>
              <div className="h-6 w-[2px] bg-gray-300 mx-2"></div>
              <a href="/ai-search" 
                onClick={(e) => handleProtectedLink(e, '/ai-search')}
                className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                AI Search
              </a>
              <div className="h-6 w-[2px] bg-gray-300 mx-2"></div>
              <a href="/ai-document" 
                onClick={(e) => handleProtectedLink(e, '/ai-document')}
                className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                AI Document Automation
              </a>
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">{user?.username}</span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openModal('login')}
                    className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    로그인
                  </button>
                  <button
                    onClick={handleSignupClick}
                    className="text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialMode={modalMode}
      />
    </>
  );
} 