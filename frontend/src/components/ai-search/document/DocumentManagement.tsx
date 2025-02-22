import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

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

type SortField = 'type' | 'title' | 'created_at' | 'progress';
type SortOrder = 'asc' | 'desc';

interface Filters {
  type: string[];
  progress: number[];
}

interface PlainTextInput {
  title: string;
  content: string;
}

interface DocumentUploadProps {
  isPlainTextModalOpen: boolean;
  setIsPlainTextModalOpen: (isOpen: boolean) => void;
}

interface PlainTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
  isUploading: boolean;
}

const PlainTextModal = ({ isOpen, onClose, onSubmit, isUploading }: PlainTextModalProps) => {
  const [input, setInput] = useState({ title: '', content: '' });
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    await onSubmit(input.title, input.content);
    setInput({ title: '', content: '' }); // 성공 후 입력 초기화
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">직접 입력</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                제목
              </label>
              <input
                type="text"
                value={input.title}
                onChange={(e) => setInput(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="문서 제목을 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                내용
              </label>
              <textarea
                value={input.content}
                onChange={(e) => setInput(prev => ({ ...prev, content: e.target.value }))}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="내용을 입력하세요"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isUploading || !input.title.trim() || !input.content.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:opacity-50"
            >
              {isUploading ? '저장중...' : '문서로 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentUpload = forwardRef((props: DocumentUploadProps, ref) => {
  const { isPlainTextModalOpen, setIsPlainTextModalOpen } = props;
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<GroupedDocuments>({
    text: [],
    image: [],
    plain: []
  });
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<Filters>({
    type: [],
    progress: []
  });
  const [plainTextInput, setPlainTextInput] = useState<PlainTextInput>({
    title: '',
    content: ''
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

    await handleFileUpload(files, 'text');
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
    const baseClasses = "inline-flex px-2 py-1 text-xs rounded-full items-center justify-center min-w-[60px]";
    
    if (progress === 100) {
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>완료</span>;
    } else if (progress === -1) {
      return <span className={`${baseClasses} bg-red-100 text-red-800`}>실패</span>;
    } else if (progress === 0) {
      return <span className={`${baseClasses} bg-red-50 text-red-600`}>대기</span>;
    } else {
      return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>{progress}%</span>;
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
                      {new Date(doc.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
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

  const handleDelete = async (docId: number) => {
    if (!confirm('정말 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/delete-document/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doc_id: docId }),
      });

      if (!response.ok) throw new Error('Failed to delete document');
      
      alert('문서가 삭제되었습니다.');
      fetchDocuments();  // 문서 목록 갱신
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('문서 삭제에 실패했습니다.');
    }
  };

  // 정렬 함수 추가
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 정렬된 문서 목록을 반환하는 함수 수정
  const getFilteredAndSortedDocuments = (allDocs: [string, Document[]][]) => {
    let documents = allDocs.flatMap(([type, docs]) => 
      docs.map(doc => ({...doc, type}))
    );

    // 필터 적용
    if (filters.type.length > 0) {
      documents = documents.filter(doc => filters.type.includes(doc.type));
    }

    if (filters.progress.length > 0) {
      documents = documents.filter(doc => 
        filters.progress.includes(
          doc.progress === 100 ? 100 : 
          doc.progress === -1 ? -1 : 
          doc.progress === 0 ? 0 : 1
        )
      );
    }

    // 정렬 적용
    documents.sort((a, b) => {
      if (sortField === 'type') {
        const typeOrder = {
          text: 1,
          image: 2,
          plain: 3
        };
        const orderA = typeOrder[a.type as keyof typeof typeOrder];
        const orderB = typeOrder[b.type as keyof typeof typeOrder];
        return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
      }
      if (sortField === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      if (sortField === 'created_at') {
        return sortOrder === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortField === 'progress') {
        return sortOrder === 'asc'
          ? a.progress - b.progress
          : b.progress - a.progress;
      }
      return 0;
    });

    return documents;
  };

  // 필터 토글 함수
  const toggleFilter = (category: 'type' | 'progress', value: string | number) => {
    setFilters(prev => {
      const currentFilters = prev[category];
      const newFilters = currentFilters.includes(value as never)
        ? currentFilters.filter(v => v !== value)
        : [...currentFilters, value];
      
      return {
        ...prev,
        [category]: newFilters
      };
    });
  };

  // FilterIcon 컴포넌트 추가 (파일 맨 아래 다른 아이콘들과 함께)
  const FilterIcon = ({ className }: { className?: string }) => (
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
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
      />
    </svg>
  );

  // FilterDropdown 컴포넌트 수정
  const FilterDropdown = ({ 
    category,
    options
  }: { 
    category: 'type' | 'progress',
    options: { label: string; value: string | number }[]
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <FilterIcon className="w-4 h-4" />
        </button>
        
        {isOpen && (
          <div className="absolute z-10 mt-1 left-0 min-w-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div className="py-2">
              {options.map(({ label, value }) => (
                <label key={value} className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters[category].includes(value as never)}
                    onChange={() => toggleFilter(category, value)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-500 mr-3"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // SortHeader 컴포넌트 수정
  const SortHeader = ({ field, title, className, filter }: { 
    field: SortField, 
    title: string,
    className?: string,
    filter?: {
      category: 'type' | 'progress',
      options: { label: string; value: string | number }[]
    }
  }) => (
    <th className={`sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}>
      <div className="flex items-center space-x-2">
        <div 
          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 px-2 py-1 rounded"
          onClick={() => handleSort(field)}
        >
          <div className="flex items-center space-x-1">
            <span>{title}</span>
            <span className="text-gray-400">
              {sortField === field && (
                sortOrder === 'asc' ? '↑' : '↓'
              )}
            </span>
          </div>
        </div>
        {filter && (
          <FilterDropdown
            category={filter.category}
            options={filter.options}
          />
        )}
      </div>
    </th>
  );

  // 직접 입력 처리 함수 수정
  const handlePlainTextSubmit = async (title: string, content: string) => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      setIsUploading(true);

      // 텍스트 내용을 Blob으로 변환
      const textBlob = new Blob([content], { type: 'text/plain' });
      
      // FormData 생성 및 파일 추가
      const formData = new FormData();
      formData.append('files', textBlob, `${title}.txt`);
      formData.append('proc_type', 'plain');

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      alert('문서가 성공적으로 업로드되었습니다.');
      
      // 입력 초기화 및 모달 닫기
      setPlainTextInput({ title: '', content: '' });
      setIsPlainTextModalOpen(false);
      
      // 문서 목록 갱신
      await fetchDocuments();

    } catch (error) {
      console.error('Error uploading plain text:', error);
      alert('문서 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 외부에서 접근할 메서드 노출
  useImperativeHandle(ref, () => ({
    handleFileUpload,
    handlePlainTextSubmit
  }));

  // 모달 렌더링
  return (
    <div className="space-y-8">
      {/* 파일 input */}
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

      {/* 문서 목록 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <SortHeader 
                field="type" 
                title="유형" 
                className="w-[20%]"
                filter={{
                  category: 'type',
                  options: [
                    { label: '텍스트', value: 'text' },
                    { label: '이미지', value: 'image' },
                    { label: '직접 입력', value: 'plain' }
                  ]
                }}
              />
              <SortHeader 
                field="title" 
                title="문서명" 
                className="w-[35%]"
              />
              <SortHeader 
                field="created_at" 
                title="등록일" 
                className="w-[20%]"
              />
              <SortHeader 
                field="progress" 
                title="상태"
                className="w-[15%] text-center"
                filter={{
                  category: 'progress',
                  options: [
                    { label: '대기', value: 0 },
                    { label: '진행', value: 1 },
                    { label: '완료', value: 100 },
                    { label: '실패', value: -1 }
                  ]
                }}
              />
              <th className="sticky top-0 px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%]">
                <div className="flex items-center space-x-2">
                  <div className="px-2 py-1 rounded">
                    <div className="flex items-center space-x-1">
                      <span>작업</span>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
        </table>
        <div className="overflow-y-auto max-h-[600px]">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {getFilteredAndSortedDocuments(Object.entries(documents)).map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4 whitespace-nowrap w-[20%] border-r border-gray-200 dark:border-gray-600">
                    <div className="flex items-center">
                      {doc.type === 'text' && <TextIcon className="w-5 h-5 text-blue-500" />}
                      {doc.type === 'image' && <ImageIcon className="w-5 h-5 text-green-500" />}
                      {doc.type === 'plain' && <PlusIcon className="w-5 h-5 text-purple-500" />}
                      <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                        {doc.type === 'text' ? '텍스트' : doc.type === 'image' ? '이미지' : '직접 입력'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap w-[35%] border-r border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-900 dark:text-gray-100">{doc.title}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap w-[20%] border-r border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(doc.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap w-[15%] border-r border-gray-200 dark:border-gray-600 text-center">
                    <ProgressBadge progress={doc.progress} />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap w-[10%] text-center">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="inline-flex text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PlainTextModal 
        isOpen={isPlainTextModalOpen}
        onClose={() => setIsPlainTextModalOpen(false)}
        onSubmit={handlePlainTextSubmit}
        isUploading={isUploading}
      />
    </div>
  );
});

export default DocumentUpload;

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