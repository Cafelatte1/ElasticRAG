import { useState, useRef, useEffect } from 'react';

interface Document {
  id: number;
  title: string;
  extension: string;
  created_at: string;
  progress: number;
}

interface GroupedDocuments {
  text: Document[];
  image: Document[];
  plain: Document[];
}

export default function DocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<GroupedDocuments>({
    text: [],
    image: [],
    plain: []
  });

  const handleTextUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = () => {
    imageFileInputRef.current?.click();
  };

  const MAX_FILES = 2;

  const handleFileUpload = async (files: FileList, procType: string) => {
    if (files.length > MAX_FILES) {
      alert(`최대 ${MAX_FILES}개의 파일만 선택할 수 있습니다.`);
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('proc_type', procType);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      alert(`${data.documents.length}개의 문서가 성공적으로 업로드되었습니다.`);
      
      // 파일 입력 초기화
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';

      // 업로드 성공 시 문서 목록 갱신
      await fetchDocuments();

    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('문서 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > MAX_FILES) {
      alert(`최대 ${MAX_FILES}개의 파일만 선택할 수 있습니다.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 모든 파일 검사
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

    await handleFileUpload(files, 'text');
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > MAX_FILES) {
      alert(`최대 ${MAX_FILES}개의 파일만 선택할 수 있습니다.`);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
      return;
    }

    // 모든 파일 검사
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

    await handleFileUpload(files, 'image');
  };

  // 문서 목록 조회
  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/get-documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // 컴포넌트 마운트 시와 업로드 성공 시 문서 목록 갱신
  useEffect(() => {
    fetchDocuments();
  }, []);

  // 문서 상태에 따른 배지 컴포넌트
  const ProgressBadge = ({ progress }: { progress: number }) => {
    if (progress === 100) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">완료</span>;
    } else if (progress === -1) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">실패</span>;
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{progress}%</span>;
    }
  };

  // 문서 목록 카드 컴포넌트
  const DocumentCard = ({ title, type, documents }: { title: string, type: 'text' | 'image' | 'plain', documents: Document[] }) => {
    const handleDelete = async (docId: number) => {
      if (!confirm('정말 이 문서를 삭제하시겠습니까?')) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/ai-search/delete-document/${docId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to delete document');
        
        alert('문서가 삭제되었습니다.');
        fetchDocuments();  // 문서 목록 갱신
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('문서 삭제에 실패했습니다.');
      }
    };

    return (
      <div className="flex flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        <div className="flex-1 overflow-y-auto max-h-60">
          {documents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">등록된 문서가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBadge progress={doc.progress} />
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                      title="삭제"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        문서 등록
      </h1>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 텍스트 형식 카드 */}
        <button 
          onClick={handleTextUpload}
          disabled={isUploading}
          className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <TextIcon className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {isUploading ? '업로드 중...' : '텍스트 형식'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
            TXT, PDF<br />텍스트 문서
          </p>
        </button>

        {/* 이미지 형식 카드 */}
        <button 
          onClick={handleImageUpload}
          disabled={isUploading}
          className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {isUploading ? '업로드 중...' : '이미지 형식'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
            PPTX, PDF, JPG, PNG<br />도식화 문서
          </p>
        </button>

        {/* 직접 추가 카드 */}
        <button className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 group">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusIcon className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">직접 추가</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
            텍스트를 직접 입력하여<br />내용 추가
          </p>
        </button>
      </div>

      {/* 문서 목록 */}
      <div className="mt-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          문서 조회
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DocumentCard 
            title="텍스트 문서" 
            type="text" 
            documents={documents.text} 
          />
          <DocumentCard 
            title="이미지 문서" 
            type="image" 
            documents={documents.image} 
          />
          <DocumentCard 
            title="직접 입력" 
            type="plain" 
            documents={documents.plain} 
          />
        </div>
      </div>
    </div>
  );
}

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

const TrashIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
    />
  </svg>
); 