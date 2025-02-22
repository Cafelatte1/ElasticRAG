import { useState, useRef } from 'react';
import Header from '@/components/common/Header';
import DocumentUpload from '@/components/ai-search/document/DocumentManagement';
import DocumentDashboard from '@/components/ai-search/document/DocumentDashboard';

type MenuType = 'management' | 'dashboard';

export default function DocumentManagement() {
  const [currentMenu, setCurrentMenu] = useState<MenuType>('management');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlainTextModalOpen, setIsPlainTextModalOpen] = useState(false);
  const documentUploadRef = useRef<{ 
    handleFileUpload?: (files: FileList, procType: string) => Promise<void>;
    handlePlainTextSubmit?: (title: string, content: string) => Promise<void>;
  }>({});

  // 파일 선택 핸들러
  const handleTextFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 파일 형식 검사
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const allowedTypes = ['.txt', '.pdf'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        alert(`지원하지 않는 파일 형식입니다: ${file.name} (지원 형식: TXT, PDF)`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    if (documentUploadRef.current.handleFileUpload) {
      await documentUploadRef.current.handleFileUpload(files, 'text');
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 파일 형식 검사
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const allowedTypes = ['.pptx', '.pdf', '.jpg', '.png'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        alert(`지원하지 않는 파일 형식입니다: ${file.name} (지원 형식: PPTX, PDF, JPG, PNG)`);
        if (imageFileInputRef.current) imageFileInputRef.current.value = '';
        return;
      }
    }

    if (documentUploadRef.current.handleFileUpload) {
      await documentUploadRef.current.handleFileUpload(files, 'image');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      
      <main className="flex-1 pt-28 px-8">
        <div className="max-w-5xl mx-auto">
          {/* 상단 메뉴 영역 */}
          <div className="flex justify-between items-center mb-8">
            {/* 업로드 버튼 영역 */}
            <div className="flex items-center space-x-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleTextFileChange} 
                accept=".txt,.pdf" 
                multiple 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={imageFileInputRef} 
                onChange={handleImageFileChange} 
                accept=".pptx,.pdf,.jpg,.png" 
                multiple 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50"
              >
                <TextIcon className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">텍스트 문서</span>
              </button>
              <button
                onClick={() => imageFileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">이미지 문서</span>
              </button>
              <button
                onClick={() => setIsPlainTextModalOpen(true)}
                disabled={isUploading}
                className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50"
              >
                <PlusIcon className="w-5 h-5 text-purple-500 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">직접 입력</span>
              </button>
            </div>

            {/* 메인 메뉴 */}
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentMenu('management')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentMenu === 'management'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Management
              </button>
              <button
                onClick={() => setCurrentMenu('dashboard')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentMenu === 'dashboard'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* 컨텐츠 영역 */}
          {currentMenu === 'management' ? (
            <DocumentUpload 
              ref={documentUploadRef}
              isPlainTextModalOpen={isPlainTextModalOpen}
              setIsPlainTextModalOpen={setIsPlainTextModalOpen}
            />
          ) : (
            <DocumentDashboard />
          )}
        </div>
      </main>
    </div>
  );
}

// 아이콘 컴포넌트들
const TextIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
); 