import { FC, useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import ReactMarkdown from 'react-markdown';
import TypewriterEffect from './TypewriterEffect';

// Animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// Styled Components
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #ddd;
  border-top: 2px solid #007acc;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.span`
  font-style: italic;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

// Skeleton Loader for Sources
const SkeletonCard = styled.div`
  padding: 12px;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 1000px 100%;
  animation: ${shimmer} 2s infinite;
  border-radius: 8px;
  margin-bottom: 12px;
  height: 100px;
`;

interface ChatMessageProps {
  message: string;
  role: 'user' | 'assistant';
  isLatest?: boolean;
  useTypewriter?: boolean;
  typingSpeed?: number;
  isLoading?: boolean;
}

interface ProcessedContent {
  content: string;
  books: BookInfo[];
}

interface BookInfo {
  title: string;
  author?: string;
  type?: string;
  description?: string;
  coverUrl: string;
  bookUrl: string;
  duration?: string;
  level?: string;
}

const MessageContainer = styled.div<{ role: string }>`
  width: 100%;
  max-width: ${props => props.role === 'user' ? '80%' : '100%'};
  border-radius: 12px;
  padding: 16px 20px;
  margin: ${props => props.role === 'user' ? '8px 0 8px auto' : '8px 0'};
  background-color: ${props => props.role === 'user' ? '#007aff' : '#f9f9f9'};
  color: ${props => props.role === 'user' ? 'white' : '#333'};
  position: relative;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  animation: ${fadeIn} 0.3s ease-out;
  
  @media (max-width: 768px) {
    max-width: ${props => props.role === 'user' ? '90%' : '100%'};
    padding: 12px 16px;
    font-size: 0.95rem;
  }
  
  a {
    color: ${props => props.role === 'user' ? 'white' : '#0066cc'};
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  p {
    margin: 0 0 12px 0;
    line-height: 1.5;
  }
  
  code {
    background: ${props => props.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.85em;
  }
  
  pre {
    background: ${props => props.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 10px 0;
    position: relative;
    
    code {
      background: none;
      padding: 0;
    }
  }
`;

const ContentWithImages = styled.div`
  display: flex;
  gap: 24px;
  width: 100%;
  align-items: flex-start;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
  max-height: 80vh;
  overflow-y: auto;
  padding-right: 8px;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.05);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #007acc;
    border-radius: 10px;
    
    &:hover {
      background: #005a9e;
    }
  }
  
  @media (max-width: 768px) {
    max-height: none;
  }
`;

const SourcesSection = styled.div`
  width: 350px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  border-left: 4px solid #007acc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  max-height: 80vh;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.05);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #007acc;
    border-radius: 10px;
    
    &:hover {
      background: #005a9e;
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    max-height: none;
  }
`;

const SourcesTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 700;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:before {
    content: '📚';
    font-size: 24px;
  }
`;

const SourceItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid transparent;
  
  &:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 8px 16px rgba(0,122,204,0.15);
    border-color: #007acc;
  }
  
  &:active {
    transform: translateY(0) scale(0.99);
  }
`;

const SourceNumber = styled.div`
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,122,204,0.3);
`;

const BookCover = styled.img`
  width: 70px;
  height: 95px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  flex-shrink: 0;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const BookCoverPlaceholder = styled.div`
  width: 70px;
  height: 95px;
  background: linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%);
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`;

const BookDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const BookTitle = styled.h4`
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #222;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  a {
    color: #007acc;
    text-decoration: none;
    transition: color 0.2s ease;
    
    &:hover {
      color: #005a9e;
      text-decoration: underline;
    }
  }
`;

const BookMeta = styled.div`
  font-size: 11px;
  color: #666;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:before {
    content: '✍️';
    font-size: 12px;
  }
`;

const BadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const Badge = styled.span<{ variant?: string }>`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  
  ${props => {
    switch (props.variant) {
      case 'book':
        return css`
          background: #e3f2fd;
          color: #1976d2;
        `;
      case 'video':
        return css`
          background: #e8f5e9;
          color: #388e3c;
        `;
      case 'course':
        return css`
          background: #f3e5f5;
          color: #7b1fa2;
        `;
      case 'beginner':
        return css`
          background: #fff3e0;
          color: #f57c00;
        `;
      case 'intermediate':
        return css`
          background: #ffe0b2;
          color: #e65100;
        `;
      case 'advanced':
        return css`
          background: #ffebee;
          color: #c62828;
        `;
      default:
        return css`
          background: #f5f5f5;
          color: #616161;
        `;
    }
  }}
`;

const DurationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
  
  &:before {
    content: '⏱️';
  }
`;

const CopyButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255,255,255,0.9);
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  &:hover {
    background: white;
    border-color: #007acc;
  }
  
  ${MessageContainer}:hover & {
    opacity: 1;
  }
`;

// Helper function to get badge variant
const getResourceTypeBadge = (type: string): string => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('book')) return 'book';
  if (lowerType.includes('video')) return 'video';
  if (lowerType.includes('course')) return 'course';
  return 'default';
};

const getLevelBadge = (type: string): string | null => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('beginner')) return 'beginner';
  if (lowerType.includes('intermediate')) return 'intermediate';
  if (lowerType.includes('advanced')) return 'advanced';
  return null;
};

const getResourceIcon = (type: string): string => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('book')) return '📖';
  if (lowerType.includes('video')) return '🎥';
  if (lowerType.includes('course')) return '🎓';
  return '📄';
};

// Extract book data from content
const processContentWithCoverImages = (content: string): ProcessedContent => {
  const bookData: BookInfo[] = [];
  let processedContent = content;

  // Method 1: Extract from Cover: lines
  const coverPattern = /Cover:\s*(https?:\/\/[^\s]+)/gi;
  const coverMatches = [...content.matchAll(coverPattern)];

  coverMatches.forEach((match) => {
    const coverUrl = match[1];
    const matchIndex = match.index || 0;

    // Look backwards for title (###)
    const contextBefore = content.slice(Math.max(0, matchIndex - 1000), matchIndex);
    const titleMatch = contextBefore.match(/###\s*([^\n]+)\n[^#]*$/);

    if (titleMatch) {
      const title = titleMatch[1].trim();

      // Extract metadata
      const typeMatch = contextBefore.match(/\*\*Type\*\*:\s*([^\|]+)/);
      const levelMatch = contextBefore.match(/\*\*Level\*\*:\s*([^\|]+)/);
      const durationMatch = contextBefore.match(/\*\*Duration\*\*:\s*([^\n]+)/);
      const authorMatch = contextBefore.match(/\*\*Author[s]?\*\*:\s*([^\n]+)/);
      const descMatch = contextBefore.match(/\*\*Description\*\*:\s*([^\n]+)/);

      // Find O'Reilly link
      const contextAfter = content.slice(matchIndex, Math.min(content.length, matchIndex + 500));
      const urlMatch = contextAfter.match(/\[View on O'Reilly[^\]]*\]\(([^\)]+)\)/);

      bookData.push({
        title: title.replace(/\*\*/g, ''),
        author: authorMatch ? authorMatch[1].trim() : '',
        type: typeMatch ? typeMatch[1].trim() : 'Resource',
        level: levelMatch ? levelMatch[1].trim() : '',
        duration: durationMatch ? durationMatch[1].trim() : '',
        description: descMatch ? descMatch[1].trim() : '',
        coverUrl: coverUrl,
        bookUrl: urlMatch ? urlMatch[1] : '#'
      });
    }
  });

  // Remove Cover: lines from content
  processedContent = processedContent.replace(/Cover:\s*https?:\/\/[^\s]+/gi, '');

  return {
    content: processedContent.trim(),
    books: bookData
  };
};

const EnhancedChatMessage: FC<ChatMessageProps> = ({
  message,
  role,
  isLatest = false,
  useTypewriter = true,
  typingSpeed = 150,
  isLoading = false
}) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [processed, setProcessed] = useState<ProcessedContent>({ content: '', books: [] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (role === 'assistant' && !isLoading) {
      const result = processContentWithCoverImages(message);
      console.log('📚 Books extracted:', result.books.length);
      setProcessed(result);
    } else {
      setProcessed({ content: message, books: [] });
    }
  }, [message, role, isLoading]);

  const handleImageError = (src: string) => {
    setImageErrors(prev => new Set([...prev, src]));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shouldUseTypewriter = useTypewriter && role === 'assistant' && isLatest;

  return (
    <MessageContainer role={role} aria-label={`${role === 'user' ? 'User' : 'Assistant'} message`}>
      {role === 'assistant' && (
        <CopyButton onClick={handleCopy} aria-label="Copy message" title="Copy message">
          {copied ? '✓ Copied!' : '📋 Copy'}
        </CopyButton>
      )}

      {isLoading ? (
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Searching O'Reilly platform...</LoadingText>
        </LoadingContainer>
      ) : role === 'assistant' && processed.books.length > 0 ? (
        <ContentWithImages>
          <MainContent>
            {shouldUseTypewriter ? (
              <TypewriterEffect content={processed.content} speed={typingSpeed} />
            ) : (
              <ReactMarkdown
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {processed.content}
              </ReactMarkdown>
            )}
          </MainContent>

          <SourcesSection>
            <SourcesTitle>Learning Resources</SourcesTitle>
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              processed.books.map((book, index) => (
                <SourceItem key={index} onClick={() => window.open(book.bookUrl, '_blank')}>
                  <SourceNumber>{index + 1}</SourceNumber>

                  {book.coverUrl && !imageErrors.has(book.coverUrl) ? (
                    <BookCover
                      src={book.coverUrl}
                      alt={book.title}
                      onError={() => handleImageError(book.coverUrl)}
                    />
                  ) : (
                    <BookCoverPlaceholder>
                      {getResourceIcon(book.type || '')}
                    </BookCoverPlaceholder>
                  )}

                  <BookDetails>
                    <BookTitle>
                      {book.bookUrl && book.bookUrl !== '#' ? (
                        <a href={book.bookUrl} target="_blank" rel="noopener noreferrer">
                          {book.title}
                        </a>
                      ) : (
                        <span>{book.title}</span>
                      )}
                    </BookTitle>

                    {book.author && <BookMeta>{book.author}</BookMeta>}

                    <BadgeContainer>
                      {book.type && (
                        <Badge variant={getResourceTypeBadge(book.type)}>
                          {book.type.split('|')[0].trim()}
                        </Badge>
                      )}
                      {book.level && getLevelBadge(book.level) && (
                        <Badge variant={getLevelBadge(book.level)!}>
                          {book.level}
                        </Badge>
                      )}
                      {book.duration && (
                        <DurationBadge>{book.duration}</DurationBadge>
                      )}
                    </BadgeContainer>
                  </BookDetails>
                </SourceItem>
              ))
            )}
          </SourcesSection>
        </ContentWithImages>
      ) : (
        <>
          {shouldUseTypewriter ? (
            <TypewriterEffect content={processed.content} speed={typingSpeed} />
          ) : (
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {processed.content}
            </ReactMarkdown>
          )}
        </>
      )}
    </MessageContainer>
  );
};

export default EnhancedChatMessage;
