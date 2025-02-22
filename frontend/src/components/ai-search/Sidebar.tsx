import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';

interface SidebarProps {
  chats: Array<{id: string, title: string, date: string}>;
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onUpdateTitle: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
  onDeleteAllChats: () => void;
}

export default function Sidebar({ 
  chats, 
  currentChatId, 
  onNewChat, 
  onSelectChat,
  onUpdateTitle,
  onDeleteChat,
  onDeleteAllChats 
}: SidebarProps) {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  console.log(user);

  const handleEditStart = (chat: {id: string, title: string}) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleEditSubmit = (chatId: string) => {
    if (editTitle.trim()) {
      onUpdateTitle(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      handleEditSubmit(chatId);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon />
            새로운 채팅
          </button>
          <button
            onClick={() => {
              if (window.confirm('모든 채팅이 삭제됩니다. 계속하시겠습니까?')) {
                onDeleteAllChats();
              }
            }}
            className="bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      
      <div className="h-[calc(100vh-24rem)] overflow-y-auto">
        <div className="p-4 space-y-2">
          {chats.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              새로운 채팅을 시작해보세요
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => editingChatId !== chat.id && onSelectChat(chat.id)}
                className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors dark:text-gray-200 ${
                  currentChatId === chat.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <div className="flex items-start justify-between group">
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleEditSubmit(chat.id)}
                        onKeyDown={(e) => handleKeyDown(e, chat.id)}
                        className="w-full bg-white dark:bg-gray-700 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{chat.title}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{chat.date}</div>
                        </div>
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity ml-2 space-y-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(chat);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('정말로 이 채팅을 삭제하시겠습니까?')) {
                                onDeleteChat(chat.id);
                              }
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {user?.username.split('@')[0] === 'admin' && (
          <button 
            onClick={() => router.push('/ai-search/document')}
            className="w-full py-2 px-4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <DocumentIcon />
            문서 관리
          </button>
        )}
        <button className="w-full py-2 px-4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2">
          <SettingsIcon />
          검색 설정
        </button>
        <button className="w-full py-2 px-4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2">
          <InfoIcon />
          검색 정보
        </button>
      </div>
    </div>
  );
}

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"></path>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);