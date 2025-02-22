import Header from '@/components/common/Header';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // 기능별 활성화 상태 관리
  const featureFlags = {
    aiSearch: true,
    aiDocument: false
  };

  const handleCardClick = (e: React.MouseEvent, path: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-6 pt-40">
        <h1 className="text-4xl font-bold text-center mb-16">
          {/* 펭귄 AI Platform */}
          untitled
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <a href="/ai-search" 
             onClick={(e) => handleCardClick(e, '/ai-search')}
             className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <SearchIcon className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">AI Search</h2>
          </a>

          <a href="/ai-document" 
             onClick={(e) => handleCardClick(e, '/ai-document')}
             className="flex flex-col items-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <DocumentIcon className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">AI Document Automation</h2>
          </a>
        </div>
      </main>
    </div>
  );
}

// 아이콘 컴포넌트 (heroicons 사용)
const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const DocumentIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
