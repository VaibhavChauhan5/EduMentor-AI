import { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Sidebar from './components/Sidebar';
import LiveEventsView from './components/LiveEventsView';
import { Message, ContentType } from './types';
import { sendMessage } from './api';
import { useAuth } from './contexts/AuthContext';

const gradientAnimation = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  width: 100%;
`;

const ChatSection = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: linear-gradient(
    135deg,
    #0f172a 0%,
    #1e293b 25%,
    #334155 50%,
    #1e293b 75%,
    #0f172a 100%
  );
  background-size: 400% 400%;
  animation: ${gradientAnimation} 15s ease infinite;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background-image: 
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 80px,
        rgba(255, 255, 255, 0.02) 80px,
        rgba(255, 255, 255, 0.02) 81px
      );
    pointer-events: none;
    z-index: 0;
  }
  
  > * {
    position: relative;
    z-index: 1;
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  min-height: 0;
  
  @media (max-width: 768px) {
    padding: 0.8rem 0;
  }
  
  @media (max-width: 480px) {
    padding: 0.6rem 0;
  }
  
  /* Custom scrollbar for modern browsers */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #aaa;
  }
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 20px;
  gap: 16px;
`;

const ExamplePromptsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  max-width: 100%;
  margin: 0 auto;
  gap: 20px;
  overflow: hidden;
`;

const ExamplePromptsTitle = styled.h3`
  color: #94a3b8;
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const scrollAnimation = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-33.33%);
  }
`;

const ExamplePromptsGrid = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  animation: ${scrollAnimation} 40s linear infinite;
  width: fit-content;
  
  &:hover {
    animation-play-state: paused;
  }
`;

const rotateAnimation = keyframes`
  0% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-3px) rotate(-2deg);
  }
  50% {
    transform: translateY(-5px) rotate(0deg);
  }
  75% {
    transform: translateY(-3px) rotate(2deg);
  }
  100% {
    transform: translateY(0) rotate(0deg);
  }
`;

const ExamplePromptCard = styled.button`
  background: rgba(30, 41, 59, 0.8);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  color: #e2e8f0;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  flex-shrink: 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  
  &:hover {
    border-color: rgba(59, 130, 246, 0.6);
    background: rgba(51, 65, 85, 0.9);
    box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
    transform: translateY(-2px);
    animation: ${rotateAnimation} 1s ease-in-out infinite;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const PromptIcon = styled.span`
  font-size: 32px;
  flex-shrink: 0;
  line-height: 1;
`;

const PromptText = styled.span`
  line-height: 1.4;
  flex: 1;
  text-align: center;
  font-size: 13px;
`;

function App() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  console.log('🚀 App render - Auth state:', { isAuthenticated, authLoading, user });

  // Store separate message history for each content type
  const [messagesByType, setMessagesByType] = useState<Record<ContentType, Message[]>>({
    'all': [
      {
        id: '1',
        role: 'assistant',
        content: 'Welcome to O\'Reilly Learning Assistant! How can I help you find resources today?',
        timestamp: new Date()
      }
    ],
    'books': [
      {
        id: 'books-1',
        role: 'assistant',
        content: 'Welcome to O\'Reilly Books! Search for any book you\'d like to explore.',
        timestamp: new Date()
      }
    ],
    'courses': [
      {
        id: 'courses-1',
        role: 'assistant',
        content: 'Welcome to O\'Reilly Courses! Find the perfect course to advance your skills.',
        timestamp: new Date()
      }
    ],
    'audiobooks': [
      {
        id: 'audiobooks-1',
        role: 'assistant',
        content: 'Welcome to O\'Reilly Audiobooks! Listen to books on the go.',
        timestamp: new Date()
      }
    ],
    'live-event-series': [
      {
        id: 'live-event-series-1',
        role: 'assistant',
        content: 'Welcome to O\'Reilly Live Event Series! Join live training and events.',
        timestamp: new Date()
      }
    ]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeContentType, setActiveContentType] = useState<ContentType>('all');
  const enableTypewriter = true; // Typewriter effect always enabled
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get messages for current content type
  const messages = messagesByType[activeContentType] || [];

  console.log('Messages length:', messages.length, 'isLoading:', isLoading);
  console.log('Should show examples:', messages.length === 1 && !isLoading);

  // Content-type-specific example prompts
  const allContentExamples = [
    { icon: '🐍', text: 'Python programming resources' },
    { icon: '⚛️', text: 'React and modern web development' },
    { icon: '🤖', text: 'Machine learning and AI' },
    { icon: '☁️', text: 'Cloud computing with AWS' },
    { icon: '🔒', text: 'Cybersecurity fundamentals' },
    { icon: '📊', text: 'Data science and analytics' },
    { icon: '🎨', text: 'UI/UX design principles' },
    { icon: '🐳', text: 'Docker and containerization' },
    { icon: '🔧', text: 'DevOps best practices' },
    { icon: '📱', text: 'Mobile app development' },
    { icon: '🗄️', text: 'Database design and SQL' },
    { icon: '🚀', text: 'Kubernetes for beginners' }
  ];

  const booksExamples = [
    { icon: '📚', text: 'Learning Python 5th Edition' },
    { icon: '📘', text: 'JavaScript: The Definitive Guide' },
    { icon: '📕', text: 'Clean Code by Robert Martin' },
    { icon: '📗', text: 'Design Patterns book' },
    { icon: '📙', text: 'You Don\'t Know JS series' },
    { icon: '📔', text: 'Head First Design Patterns' },
    { icon: '📖', text: 'Fluent Python' },
    { icon: '📚', text: 'The Pragmatic Programmer' },
    { icon: '📘', text: 'Effective Java' },
    { icon: '📕', text: 'Introduction to Algorithms' },
    { icon: '📗', text: 'Python Crash Course' },
    { icon: '📙', text: 'Hands-On Machine Learning' }
  ];

  const coursesExamples = [
    { icon: '🎓', text: 'Complete Python Bootcamp' },
    { icon: '💻', text: 'Web Development Masterclass' },
    { icon: '🎯', text: 'AWS Certified Solutions Architect' },
    { icon: '🔧', text: 'Docker and Kubernetes course' },
    { icon: '📊', text: 'Data Science with Python' },
    { icon: '⚛️', text: 'React - The Complete Guide' },
    { icon: '🤖', text: 'Machine Learning A-Z' },
    { icon: '🔒', text: 'Ethical Hacking course' },
    { icon: '📱', text: 'iOS Development course' },
    { icon: '🎨', text: 'UX/UI Design Fundamentals' },
    { icon: '🗄️', text: 'SQL and Database Design' },
    { icon: '☁️', text: 'Cloud Computing Essentials' }
  ];

  const audiobooksExamples = [
    { icon: '🎧', text: 'Learning Python audiobook' },
    { icon: '🎙️', text: 'Clean Code audiobook' },
    { icon: '🎧', text: 'The Pragmatic Programmer' },
    { icon: '🎙️', text: 'You Don\'t Know JS audio' },
    { icon: '🎧', text: 'Design Patterns audiobook' },
    { icon: '🎙️', text: 'Effective Java audio' },
    { icon: '🎧', text: 'Head First Design Patterns' },
    { icon: '🎙️', text: 'JavaScript: The Good Parts' },
    { icon: '🎧', text: 'Fluent Python audiobook' },
    { icon: '🎙️', text: 'Introduction to Algorithms' },
    { icon: '🎧', text: 'Code Complete audiobook' },
    { icon: '🎙️', text: 'Refactoring audio edition' }
  ];

  const liveEventSeriesExamples = [
    { icon: '📡', text: 'Python live training events' },
    { icon: '🎙️', text: 'React masterclass live' },
    { icon: '📡', text: 'AWS certification bootcamp' },
    { icon: '🎙️', text: 'Kubernetes live workshop' },
    { icon: '📡', text: 'Machine learning live series' },
    { icon: '🎙️', text: 'DevOps live training' },
    { icon: '📡', text: 'Cloud architecture live event' },
    { icon: '🎙️', text: 'Data science live bootcamp' },
    { icon: '📡', text: 'Cybersecurity live training' },
    { icon: '🎙️', text: 'Microservices live workshop' },
    { icon: '📡', text: 'AI/ML live event series' },
    { icon: '🎙️', text: 'Full stack live bootcamp' }
  ];

  // Get examples based on active content type
  const getExamplePrompts = () => {
    switch (activeContentType) {
      case 'books':
        return booksExamples;
      case 'courses':
        return coursesExamples;
      case 'audiobooks':
        return audiobooksExamples;
      case 'live-event-series':
        return liveEventSeriesExamples;
      default:
        return allContentExamples;
    }
  };

  const examplePrompts = getExamplePrompts();

  // Preload live events data on app startup
  useEffect(() => {
    const preloadLiveEvents = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        console.log('Preloading live events data...');
        await fetch(`${apiUrl}/live-events`);
        console.log('Live events preloaded successfully');
      } catch (error) {
        console.error('Failed to preload live events:', error);
      }
    };

    // Preload after a short delay to not block initial render
    const timeoutId = setTimeout(preloadLiveEvents, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  // Send heartbeat to backend to keep session alive while user has tab open
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const sessionId = localStorage.getItem('sessionId') || 'default';
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 2 minutes while tab is open
    const heartbeatInterval = setInterval(sendHeartbeat, 2 * 60 * 1000);

    // Cleanup on unmount (when user closes tab)
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    const chatContainer = messagesEndRef.current?.parentElement;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const getLoadingMessage = (userMessage: string): string => {
    // Analyze the user message to determine appropriate loading text
    const message = userMessage.toLowerCase();

    // Check for learning/resource-related keywords
    const learningKeywords = [
      'find', 'search', 'looking for', 'need', 'want to learn', 'show me', 'recommend',
      'book', 'course', 'tutorial', 'video', 'learning path', 'training',
      'python', 'javascript', 'java', 'react', 'node', 'docker', 'kubernetes',
      'machine learning', 'ai', 'data science', 'web development', 'programming',
      'learn', 'study', 'understand', 'master', 'practice', 'guide', 'introduction',
      'how to', 'what is', 'explain', 'teach me', 'help me with'
    ];

    const hasLearningIntent = learningKeywords.some(keyword => message.includes(keyword));
    const isQuestion = userMessage.trim().endsWith('?');
    const isLearningQuestion = isQuestion && ['learn', 'tutorial', 'course', 'book'].some(word => message.includes(word));

    if (hasLearningIntent || isLearningQuestion) {
      return 'Searching O\'Reilly resources...';
    } else {
      return 'Thinking...';
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message to the chat for current content type
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      contentType: activeContentType
    };

    // Add temporary loading message with dynamic content
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: getLoadingMessage(content),
      isLoading: true,
      timestamp: new Date()
    };

    // Update messages for the current content type
    setMessagesByType(prev => ({
      ...prev,
      [activeContentType]: [...prev[activeContentType], userMessage, loadingMessage]
    }));
    setIsLoading(true);

    try {
      // Send message to API and get response
      const response = await sendMessage(content, activeContentType);

      // Format the response - replace any cover links with markdown images
      let formattedMessage = response.message;

      // Add assistant response to the chat - replace the loading message
      const assistantMessage: Message = {
        id: loadingMessage.id,
        role: 'assistant',
        content: formattedMessage,
        timestamp: new Date()
      };

      setMessagesByType(prev => ({
        ...prev,
        [activeContentType]: prev[activeContentType].map(msg =>
          msg.id === loadingMessage.id ? assistantMessage : msg
        )
      }));
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message to chat - replace the loading message
      const errorMessage: Message = {
        id: loadingMessage.id,
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        isError: true,
        timestamp: new Date()
      };

      setMessagesByType(prev => ({
        ...prev,
        [activeContentType]: prev[activeContentType].map(msg =>
          msg.id === loadingMessage.id ? errorMessage : msg
        )
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking on example prompts
  const handleExampleClick = (promptText: string) => {
    if (!isLoading) {
      handleSendMessage(promptText);
    }
  };

  // Handle resetting the chat for current content type
  const handleResetChat = () => {
    const welcomeMessages: Record<ContentType, string> = {
      'all': 'Welcome to O\'Reilly Learning Assistant! How can I help you find resources today?',
      'books': 'Welcome to O\'Reilly Books! Search for any book you\'d like to explore.',
      'courses': 'Welcome to O\'Reilly Courses! Find the perfect course to advance your skills.',
      'audiobooks': 'Welcome to O\'Reilly Audiobooks! Listen to books on the go.',
      'live-event-series': 'Welcome to O\'Reilly Live Event Series! Join live training and events.'
    };

    setMessagesByType(prev => ({
      ...prev,
      [activeContentType]: [
        {
          id: `${activeContentType}-${Date.now()}`,
          role: 'assistant',
          content: welcomeMessages[activeContentType],
          timestamp: new Date()
        }
      ]
    }));
  };

  return (
    <AppContainer>
      <Header
        onResetChat={handleResetChat}
      />
      <MainContent>
        <Sidebar
          activeSection={activeContentType}
          onSectionChange={setActiveContentType}
        />
        <ChatSection>
          {activeContentType === 'live-event-series' ? (
            <LiveEventsView />
          ) : (
            <>
              <ChatContainer>
                <MessageGroup>
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message.content}
                      role={message.role}
                      isLatest={index === messages.length - 1}
                      useTypewriter={enableTypewriter}
                      isLoading={message.isLoading}
                      typingSpeed={200}
                    />
                  ))}

                  {/* Show example prompts only when there's just the welcome message */}
                  {messages.length === 1 && !isLoading && (
                    <ExamplePromptsContainer>
                      <ExamplePromptsTitle>Try asking about:</ExamplePromptsTitle>
                      <ExamplePromptsGrid>
                        {/* Render prompts 3 times for truly seamless infinite scroll */}
                        {[...examplePrompts, ...examplePrompts, ...examplePrompts].map((prompt, index) => (
                          <ExamplePromptCard
                            key={index}
                            onClick={() => handleExampleClick(prompt.text)}
                            aria-label={`Search for ${prompt.text}`}
                            title={prompt.text}
                          >
                            <PromptIcon>{prompt.icon}</PromptIcon>
                            <PromptText>{prompt.text}</PromptText>
                          </ExamplePromptCard>
                        ))}
                      </ExamplePromptsGrid>
                    </ExamplePromptsContainer>
                  )}

                  <div ref={messagesEndRef} />
                </MessageGroup>
              </ChatContainer>
              <ChatInput
                key={activeContentType}
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                activeContentType={activeContentType}
              />
            </>
          )}
        </ChatSection>
      </MainContent>
    </AppContainer>
  );
}

export default App;