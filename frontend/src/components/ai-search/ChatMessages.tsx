import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types/chat';

interface CodeComponentProps {
  inline?: boolean;
  children?: React.ReactNode;
  className?: string;
}

interface ChatMessagesProps {
  messages: Message[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full px-8 py-6">
      <div className="max-w-3xl mx-auto w-full space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">💬</div>
              <div className="text-xl font-medium">채팅을 시작하세요</div>
              <div className="mt-2">질문을 입력하시면 AI가 답변해드립니다</div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="space-y-4">
              {/* 사용자 메시지 */}
              <div className="flex justify-end">
                <div className="max-w-[80%] p-4 rounded-lg bg-blue-500 text-white">
                  <div className="whitespace-pre-wrap">{message.user}</div>
                </div>
              </div>
              
              {/* AI 응답 메시지 */}
              {message.assistant && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200">
                    <ReactMarkdown
                      className="prose dark:prose-invert max-w-none"
                      components={{
                        pre: ({ children }) => (
                          <pre className="bg-gray-200 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
                            {children}
                          </pre>
                        ),
                        code: ({ inline, children, className }: CodeComponentProps) => (
                          inline ? (
                            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-900 dark:text-gray-100">
                              {children}
                            </code>
                          ) : (
                            <code className="block text-gray-900 dark:text-gray-100">
                              {children}
                            </code>
                          )
                        ),
                      }}
                    >
                      {message.assistant}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 