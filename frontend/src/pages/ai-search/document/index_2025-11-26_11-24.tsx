import { useState } from 'react';
import Header from '@/components/common/Header';
import DocumentSidebar from '@/components/ai-search/document/DocumentSidebar';
import DocumentUpload from '@/components/ai-search/document/DocumentManagement';
import DocumentList from '@/components/ai-search/document/DocumentList';
import DocumentDashboard from '@/components/ai-search/document/DocumentDashboard';

type MenuType = 'upload' | 'list' | 'dashboard';

export default function DocumentManagement() {
  const [currentMenu, setCurrentMenu] = useState<MenuType>('upload');

  const renderContent = () => {
    switch (currentMenu) {
      case 'upload':
        return <DocumentUpload />;
      case 'list':
        return <DocumentList />;
      case 'dashboard':
        return <DocumentDashboard />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      
      <div className="flex flex-1 pt-28">
        <div className="w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <DocumentSidebar 
            currentMenu={currentMenu}
            onMenuSelect={setCurrentMenu}
          />
        </div>
        
        <main className="flex-1 flex flex-col h-[calc(100vh-7rem)]">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
} 