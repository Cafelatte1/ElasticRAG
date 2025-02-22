import { useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import Sidebar from '@/components/ai-search/Sidebar';
import ChatInput from '@/components/ai-search/ChatInput';
import ChatMessages from '@/components/ai-search/ChatMessages';
import { Message, Chat } from '@/types/chat';

export default function AISearch() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  useEffect(() => {
    const loadChatsFromDB = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/ai-search/load-chat', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to load chats');
        
        const data = await response.json();
        const formattedChats: Chat[] = data.map((chat: any) => ({
          id: chat.chat_id.toString(),
          title: chat.title,
          date: chat.created_at.split('T')[0] + ' ' + chat.created_at.split('T')[1].split('.')[0],
          messages: chat.messages.map((msg: any) => ({
            user: msg.user,
            assistant: msg.assistant,
            doc_ids: msg.doc_ids,
            chunk_ids: msg.chunk_ids
          }))
        }));

        setChats(formattedChats);
        
        if (formattedChats.length > 0) {
          setCurrentChatId(formattedChats[0].id);
          setMessages(formattedChats[0].messages);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    };

    loadChatsFromDB();
  }, []);

  const createNewChat = async (initialMessage?: string) => {
    try {
      if (chats.length >= 50) {
        alert('채팅은 최대 50개까지만 생성할 수 있습니다. 기존 채팅을 삭제해 주세요.');
        return null;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/save-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: initialMessage?.slice(0, 30) || '새로운 채팅',
          messages: []
        })
      });

      if (!response.ok) throw new Error('Failed to save chat');
      
      const data = await response.json();
      const newChat: Chat = {
        id: data.chat_id.toString(),
        title: initialMessage?.slice(0, 30) || '새로운 채팅',
        date: data.created_at.split('T')[0] + ' ' + data.created_at.split('T')[1].split('.')[0],
        messages: []
      };

      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      setMessages([]);
      return newChat.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('채팅 생성에 실패했습니다.');
      return null;
    }
  };

  const updateChatMessages = (chatId: string, newMessages: Message[]) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages: newMessages }
        : chat
    ));
  };

  const handleSendMessage = async (message: string) => {
    try {
      setIsLoading(true);
      
      if (!currentChatId) {
        const newChatId = await createNewChat(message);
        if (!newChatId) {
          throw new Error('Failed to create new chat');
        }
        setCurrentChatId(newChatId);
      }

      const newMessage: Message = { user: message };
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      updateChatMessages(currentChatId!, updatedMessages);

      const response = await fetch('http://localhost:8000/api/ai-search/stream-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ 
          chat_id: parseInt(currentChatId!),
          messages: updatedMessages
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Reader not available');

      let fullContent = '';
      let doc_ids: number[] | null = null;
      let chunk_ids: string[] | null = null;
      let isParsingMetadata = false;
      let metadataBuffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        
        for (const char of text) {
          if (char === '|') {
            isParsingMetadata = true;
            metadataBuffer = '';
            continue;
          }
          
          if (isParsingMetadata) {
            metadataBuffer += char;
          } else {
            fullContent += char;
          }
        }
        
        if (!isParsingMetadata) {
          const latestMessages = updatedMessages.map((msg, idx) => 
            idx === updatedMessages.length - 1 
              ? { ...msg, assistant: fullContent }
              : msg
          );
          setMessages(latestMessages);
          updateChatMessages(currentChatId!, latestMessages);
        }
      }

      // 스트리밍이 끝난 후
      // 메타데이터 파싱
      console.log('metadataBuffer:', metadataBuffer);
      const metadataParts = metadataBuffer.split('</s>');
      console.log('metadataParts:', metadataParts);

      for (const part of metadataParts) {
        if (part.startsWith('doc_ids=')) {
          const ids = part.replace('doc_ids=', '').split(',');
          doc_ids = ids.length === 0 || ids.some(id => isNaN(parseInt(id.trim())))
            ? null 
            : ids.map(id => parseInt(id.trim()));
        } else if (part.startsWith('chunk_ids=')) {
          const ids = part.replace('chunk_ids=', '').split(',');
          chunk_ids = ids.length === 0 || ids[0] === ''
            ? null
            : ids.map(id => id.trim());
        }
      }

      console.log('Parsed IDs:', { doc_ids, chunk_ids });

      // 메타데이터 파싱 후 최종 메시지 업데이트
      const finalMessages = updatedMessages.map((msg, idx) => 
        idx === updatedMessages.length - 1 
          ? { 
              ...msg, 
              assistant: fullContent,
              doc_ids: doc_ids,
              chunk_ids: chunk_ids
            }
          : msg
      );
      setMessages(finalMessages);
      updateChatMessages(currentChatId!, finalMessages);

    } catch (error) {
      console.error('Error:', error);
      alert('서버에 연결할 수 없습니다. 관리자에게 문의하세요.');
      const revertedMessages = messages.slice(0, -1);
      setMessages(revertedMessages);
      if (currentChatId) {
        updateChatMessages(currentChatId, revertedMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateChatTitle = async (chatId: string, newTitle: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/update-chat-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chat_id: parseInt(chatId),
          title: newTitle
        })
      });

      if (!response.ok) throw new Error('Failed to update chat title');

      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: newTitle }
          : chat
      ));
    } catch (error) {
      console.error('Error updating chat title:', error);
      alert('채팅 제목 변경에 실패했습니다.');
    }
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      setMessages(selectedChat.messages);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/delete-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chat_id: parseInt(chatId)
        })
      });

      if (!response.ok) throw new Error('Failed to delete chat');

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('채팅 삭제에 실패했습니다.');
    }
  };

  const handleDeleteAllChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/ai-search/delete-all-chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete all chats');

      setChats([]);
      setCurrentChatId(null);
      setMessages([]);
    } catch (error) {
      console.error('Error deleting all chats:', error);
      alert('채팅 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      
      <div className="flex flex-1 pt-28">
        <div className="w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <Sidebar 
            chats={chats}
            currentChatId={currentChatId}
            onNewChat={() => createNewChat()}
            onSelectChat={handleSelectChat}
            onUpdateTitle={updateChatTitle}
            onDeleteChat={handleDeleteChat}
            onDeleteAllChats={handleDeleteAllChats}
          />
        </div>
        
        <main className="flex-1 flex flex-col h-[calc(100vh-7rem)]">
          <div className="flex-1 overflow-y-auto">
            <ChatMessages messages={messages} />
          </div>
          
          <div className="px-8 py-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
          </div>
        </main>
      </div>
    </div>
  );
} 