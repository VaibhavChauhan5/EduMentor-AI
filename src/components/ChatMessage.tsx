import { FC, useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import ReactMarkdown from 'react-markdown';
import TypewriterEffect from './TypewriterEffect';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

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
}

const MessageContainer = styled.div<{ role: string }>`
  width: 100%;
  max-width: ${props => props.role === 'user' ? '80%' : '100%'};
  border-radius: 12px;
  padding: 16px 20px;
  margin: ${props => props.role === 'user' ? '8px 0 8px auto' : '8px 0'};
  background: ${props => props.role === 'user' ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' : 'rgba(30, 41, 59, 0.6)'};
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  color: ${props => props.role === 'user' ? 'white' : '#e2e8f0'};
  position: relative;
  word-wrap: break-word;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  border: 1px solid ${props => props.role === 'user' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(148, 163, 184, 0.2)'};
  
  @media (max-width: 768px) {
    max-width: ${props => props.role === 'user' ? '90%' : '100%'};
    margin: ${props => props.role === 'user' ? '8px 0 8px auto' : '8px 0'};
    padding: 12px 16px;
    font-size: 0.95rem;
  }
  
  @media (max-width: 480px) {
    max-width: ${props => props.role === 'user' ? '95%' : '100%'};
    margin: ${props => props.role === 'user' ? '8px 0 8px auto' : '8px 0'};
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  
  a {
    color: ${props => props.role === 'user' ? 'white' : '#60a5fa'};
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
  
  ul, ol {
    margin-left: 20px;
    margin-bottom: 15px;
  }
  
  li {
    margin-bottom: 8px;
    line-height: 1.4;
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
    
    code {
      background: none;
      padding: 0;
    }
  }
  
  h3 {
    margin: 0 0 10px 0;
    font-size: 1.1em;
    font-weight: 600;
  }
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 1em;
    font-weight: 600;
  }
  
  blockquote {
    border-left: 3px solid ${props => props.role === 'user' ? 'rgba(255,255,255,0.5)' : '#ccc'};
    margin: 12px 0;
    padding: 8px 0 8px 16px;
    font-style: italic;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    
    th, td {
      border: 1px solid ${props => props.role === 'user' ? 'rgba(255,255,255,0.3)' : '#ddd'};
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background-color: ${props => props.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
      font-weight: 600;
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
    background: rgba(148, 163, 184, 0.2);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 10px;
    
    &:hover {
      background: #2563eb;
    }
  }
  
  @media (max-width: 768px) {
    max-height: none;
  }
  
  img {
    max-width: 150px;
    height: auto;
    margin: 10px 0;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    display: inline-block;
    
    @media (max-width: 480px) {
      max-width: 120px;
    }
  }
`;

const SourcesSection = styled.div`
  width: 300px;
  padding: 16px;
  background: rgba(30, 41, 59, 0.8);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border-left: 3px solid #3b82f6;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
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
    background: rgba(148, 163, 184, 0.2);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 10px;
    
    &:hover {
      background: #2563eb;
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    max-height: none;
  }
`;

const SourcesTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
`;

const SourceItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(51, 65, 85, 0.6);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid rgba(148, 163, 184, 0.2);
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
    border-left: 3px solid #3b82f6;
    background: rgba(51, 65, 85, 0.8);
  }
  
  &:active {
    transform: translateY(-2px) scale(1.01);
  }
`;

const SourceNumber = styled.div`
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
`;

const BookCover = styled.img`
  width: 60px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  flex-shrink: 0;
`;

const BookDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const BookTitle = styled.h4`
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  line-height: 1.3;
  
  a {
    color: #60a5fa;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
      color: #3b82f6;
    }
  }
`;

const BookMeta = styled.div`
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
`;

const BookType = styled.span<{ resourceType?: string }>`
  display: inline-block;
  background: ${props => {
    const type = props.resourceType?.toLowerCase() || '';
    if (type.includes('book')) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (type.includes('video')) return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    if (type.includes('course')) return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    if (type.includes('learning path')) return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
  }};
  color: white;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 10px;
  font-weight: 600;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &::before {
    content: ${props => {
    const type = props.resourceType?.toLowerCase() || '';
    if (type.includes('book')) return '"📚 "';
    if (type.includes('video')) return '"🎥 "';
    if (type.includes('course')) return '"🎓 "';
    if (type.includes('learning path')) return '"🗺️ "';
    return '"📖 "';
  }};
  }
`;

// Function to process content and extract book data

const processContentWithCoverImages = (content: string): ProcessedContent => {
  const bookData: BookInfo[] = [];
  let processedContent = content;

  // Method 0A: Extract resources with plain Type | Level | Duration pattern (NO bold formatting)
  // Format: Type: ... | Level: ... | Duration: ... Author: ... Description: ...
  const plainResourcePattern = /###\s*([^\n]+)\n\s*Type:\s*([^\|]+)\s*\|\s*Level:\s*([^\|]+)\s*\|\s*Duration:\s*([^\n]+?)\s+Author[s]?:\s*([^\n]+?)\s+Description:\s*([^\n]+)/g;

  let plainMatch;
  while ((plainMatch = plainResourcePattern.exec(content)) !== null) {
    const [, title, type, level, , author, description] = plainMatch;
    const matchIndex = plainMatch.index;

    // Look for Cover: URL and book link near this resource
    const contextAfter = content.slice(matchIndex, Math.min(content.length, matchIndex + 800));

    // Extract Cover: URL directly from the response
    const coverPattern = /Cover:\s*(https?:\/\/[^\s\n]+)/;
    const coverMatch = contextAfter.match(coverPattern);

    // Extract book URL from markdown link
    const urlPattern = /\[View on O'Reilly\s*→\]\((https?:\/\/[^\)]+)\)/;
    const oreillyLinkMatch = contextAfter.match(urlPattern);

    let bookUrl = oreillyLinkMatch ? oreillyLinkMatch[1] : '';
    let coverUrl = coverMatch ? coverMatch[1] : '';

    // Even without URL, add the resource (we'll show it without cover)
    const cleanTitle = title.replace(/\*\*/g, '').trim();

    // Check for duplicates
    const isDuplicate = bookData.some(book =>
      book.title.toLowerCase() === cleanTitle.toLowerCase()
    );

    if (!isDuplicate && cleanTitle) {
      bookData.push({
        title: cleanTitle,
        author: author ? author.trim() : '',
        type: `${type.trim()} | ${level.trim()}`,
        description: description ? description.trim() : '',
        coverUrl: coverUrl || '',
        bookUrl: bookUrl || '#'
      });
    }
  }

  // Method 0B: Extract ALL resources with **Type** | **Level** | **Duration** pattern (bold formatting)
  // This catches everything regardless of link format
  const resourcePattern = /###\s*([^\n]+)\n\s*\*\*Type\*\*:\s*([^\|]+)\s*\|\s*\*\*Level\*\*:\s*([^\|]+)\s*\|\s*\*\*Duration\*\*:\s*([^\n]+)(?:\n\s*\*\*Author[s]?\*\*:\s*([^\n]+))?(?:\n\s*\*\*Description\*\*:\s*([^\n]+(?:\n(?!\*\*)[^\n]*)*))?/g;

  let resourceMatch;
  while ((resourceMatch = resourcePattern.exec(content)) !== null) {
    const [, title, type, level, , author = '', description = ''] = resourceMatch;
    const matchIndex = resourceMatch.index;

    // Look for O'Reilly link near this resource (within 500 chars after)
    const contextAfter = content.slice(matchIndex, Math.min(content.length, matchIndex + 600));
    const urlPattern = /https?:\/\/(?:learning\.)?oreilly\.com\/library\/view\/[^\s\)\]]+/;
    const oreillyLinkMatch = contextAfter.match(urlPattern);

    let bookUrl = '';
    let coverUrl = '';

    if (oreillyLinkMatch) {
      bookUrl = oreillyLinkMatch[0];
      const bookIdMatch = bookUrl.match(/\/library\/view\/[^\/]+\/([^\/\?]+)/);
      if (bookIdMatch) {
        const bookId = bookIdMatch[1];
        coverUrl = `https://learning.oreilly.com/covers/${bookId}/400w/`;
      }
    }

    // Even without URL, add the resource (we'll show it without cover)
    const cleanTitle = title.replace(/\*\*/g, '').trim();

    // Check for duplicates
    const isDuplicate = bookData.some(book =>
      book.title.toLowerCase() === cleanTitle.toLowerCase()
    );

    if (!isDuplicate && cleanTitle) {
      bookData.push({
        title: cleanTitle,
        author: author.trim(),
        type: `${type.trim()} | ${level.trim()}`,
        description: description.trim(),
        coverUrl: coverUrl || '',
        bookUrl: bookUrl || '#'
      });
    }
  }

  // Method 1: Extract from ### headers (original method)
  const bookSections = content.split(/###\s+/);
  bookSections.forEach((section, index) => {
    if (index === 0) return; // Skip the first section (usually just headers)

    const lines = section.trim().split('\n');
    if (lines.length === 0) return;

    const title = lines[0].trim();
    let bookUrl = '';
    let coverUrl = '';
    let author = '';
    let type = '';
    let description = '';

    // Extract structured information - look for both formats
    const authorMatch = section.match(/\*\*Authors?\*\*:\s*([^\n]+)/);
    const typeMatch = section.match(/\*\*Type\*\*:\s*([^\n]+)/);
    const descriptionMatch = section.match(/\*\*Description\*\*:\s*([^\n]+(?:\n(?!\*\*)[^\n]*)*)/);

    if (authorMatch) author = authorMatch[1].trim();
    if (typeMatch) type = typeMatch[1].trim();
    if (descriptionMatch) description = descriptionMatch[1].trim();

    // Look for Cover: URL and book link in this section
    const coverPattern = /Cover:\s*(https?:\/\/[^\s\n]+)/;
    const coverMatch = section.match(coverPattern);
    if (coverMatch) {
      coverUrl = coverMatch[1];
    }

    // Look for markdown link [View on O'Reilly →](URL)
    const markdownLinkPattern = /\[View on O'Reilly\s*→\]\((https?:\/\/[^\)]+)\)/;
    const markdownLinkMatch = section.match(markdownLinkPattern);

    // Fallback to any O'Reilly URL
    const oreillyLinkMatch = section.match(/https?:\/\/(?:learning\.)?oreilly\.com\/library\/view\/[^\s\)\]]+/);

    if (markdownLinkMatch) {
      bookUrl = markdownLinkMatch[1];
    } else if (oreillyLinkMatch) {
      bookUrl = oreillyLinkMatch[0];
    }

    // If we have title and some content, add to book data
    if (title && (bookUrl || coverUrl)) {
      bookData.push({
        title: title.replace(/\*\*/g, ''), // Remove markdown formatting
        author,
        type,
        description,
        coverUrl,
        bookUrl: bookUrl || '#'
      });
    }
  });

  // Method 2: Extract from **Type** | **Level** | **Duration** pattern
  const typePatternRegex = /\*\*Type\*\*:\s*([^\|]+)\s*\|\s*\*\*Level\*\*:\s*([^\|]+)\s*\|\s*\*\*Duration\*\*:\s*([^\n]+)/g;
  let typeMatch;
  while ((typeMatch = typePatternRegex.exec(content)) !== null) {
    const matchIndex = typeMatch.index;

    // Look backwards for title (usually in previous line or after ###)
    const contextBefore = content.slice(Math.max(0, matchIndex - 500), matchIndex);
    const titleMatch = contextBefore.match(/###\s*([^\n]+)\n*$/);

    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const [, type, level] = typeMatch;    // Look forward for Author and Description
    const contextAfter = content.slice(matchIndex, Math.min(content.length, matchIndex + 1000));
    const authorMatch = contextAfter.match(/\*\*Authors?\*\*:\s*([^\n]+)/);
    const descMatch = contextAfter.match(/\*\*Description\*\*:\s*([^\n]+(?:\n(?!\*\*)[^\n]*)*)/);

    const author = authorMatch ? authorMatch[1].trim() : '';
    const description = descMatch ? descMatch[1].trim() : '';

    // Find O'Reilly link in context
    const oreillyLinkMatch = contextAfter.match(/\[View on O'Reilly\s*→\]\(([^\)]+)\)/);
    let bookUrl = '';
    let coverUrl = '';

    if (oreillyLinkMatch) {
      bookUrl = oreillyLinkMatch[1];
      const bookIdMatch = bookUrl.match(/\/library\/view\/[^\/]+\/([^\/\?]+)/);
      if (bookIdMatch) {
        const bookId = bookIdMatch[1];
        coverUrl = `https://learning.oreilly.com/covers/${bookId}/400w/`;
      }
    }

    // Check for duplicates
    const isDuplicate = bookData.some(book =>
      book.title.toLowerCase() === title.toLowerCase() ||
      (book.bookUrl && bookUrl && book.bookUrl === bookUrl)
    );

    if (!isDuplicate && title && bookUrl) {
      bookData.push({
        title: title.replace(/\*\*/g, ''),
        author,
        type: `${type.trim()} | ${level.trim()}`,
        description,
        coverUrl,
        bookUrl
      });
    }
  }

  // Method 3: Extract from any [View on O'Reilly →] link pattern
  const viewLinkPattern = /\[View on O'Reilly\s*→\]\(([^\)]+)\)/g;
  let viewLinkMatch;
  while ((viewLinkMatch = viewLinkPattern.exec(content)) !== null) {
    const bookUrl = viewLinkMatch[1];
    const matchIndex = viewLinkMatch.index;

    // Extract book ID and create cover URL
    const bookIdMatch = bookUrl.match(/\/library\/view\/[^\/]+\/([^\/\?]+)/);
    if (!bookIdMatch) continue;

    const bookId = bookIdMatch[1];
    const coverUrl = `https://learning.oreilly.com/covers/${bookId}/400w/`;

    // Check if already added
    if (bookData.some(book => book.bookUrl === bookUrl)) continue;

    // Look for title before this link
    const contextBefore = content.slice(Math.max(0, matchIndex - 1000), matchIndex);
    const titlePatterns = [
      /###\s*([^\n]+)\n[^#]*$/,  // Last ### heading
      /\*\*([^*]+)\*\*\s*$/,      // Last bold text
    ];

    let title = '';
    for (const pattern of titlePatterns) {
      const match = contextBefore.match(pattern);
      if (match) {
        title = match[1].trim();
        break;
      }
    }

    // Get type, author, description from context
    const contextAfter = content.slice(matchIndex - 500, matchIndex);
    const typeMatch = contextAfter.match(/\*\*Type\*\*:\s*([^\|]+)/);
    const authorMatch = contextAfter.match(/\*\*Authors?\*\*:\s*([^\n]+)/);
    const descMatch = contextAfter.match(/\*\*Description\*\*:\s*([^\n]+)/);

    if (title) {
      bookData.push({
        title: title.replace(/\*\*/g, ''),
        author: authorMatch ? authorMatch[1].trim() : '',
        type: typeMatch ? typeMatch[1].trim() : 'Resource',
        description: descMatch ? descMatch[1].trim() : '',
        coverUrl,
        bookUrl
      });
    }
  }

  // Method 4: Fallback - Extract from inline book mentions with Type/Duration/Title/Author pattern
  const inlineBookPattern = /Type:\s*([^\|]+)\s*\|\s*Level:\s*([^\|]+)\s*\|\s*Duration:\s*([^\n]+)\n\s*Title:\s*([^\n]+)\n\s*Author[s]?:\s*([^\n]+)\n\s*Description:\s*([^\n\[]+)/g;
  let inlineMatch;
  while ((inlineMatch = inlineBookPattern.exec(content)) !== null) {
    const [, type, level, , title, authors, description] = inlineMatch;

    // Try to find a related O'Reilly link nearby
    const contextStart = Math.max(0, inlineMatch.index - 200);
    const contextEnd = Math.min(content.length, inlineMatch.index + inlineMatch[0].length + 200);
    const context = content.slice(contextStart, contextEnd);

    const oreillyLinkMatch = context.match(/https?:\/\/(?:learning\.)?oreilly\.com\/library\/view\/[^\s\)\]]+/);
    let bookUrl = '';
    let coverUrl = '';

    if (oreillyLinkMatch) {
      bookUrl = oreillyLinkMatch[0];
      const bookIdMatch = bookUrl.match(/\/library\/view\/[^\/]+\/([^\/\?]+)/);
      if (bookIdMatch) {
        const bookId = bookIdMatch[1];
        coverUrl = `https://learning.oreilly.com/covers/${bookId}/400w/`;
      }
    }

    // Check if this book is not already added
    const isDuplicate = bookData.some(book =>
      book.title.toLowerCase() === title.toLowerCase().trim() ||
      (bookUrl && book.bookUrl === bookUrl)
    );

    if (!isDuplicate && title.trim() && bookUrl) {
      bookData.push({
        title: title.trim(),
        author: authors.trim(),
        type: `${type.trim()} | ${level.trim()}`,
        description: description.trim(),
        coverUrl,
        bookUrl
      });
    }
  }

  // Method 5: Look for any O'Reilly links and try to extract book info around them
  const allOreillyLinks = content.match(/https?:\/\/(?:learning\.)?oreilly\.com\/library\/view\/[^\s\)\]]+/g) || [];
  allOreillyLinks.forEach(link => {
    // Check if already processed
    if (bookData.some(book => book.bookUrl === link)) return;

    const bookIdMatch = link.match(/\/library\/view\/[^\/]+\/([^\/\?]+)/);
    if (bookIdMatch) {
      const bookId = bookIdMatch[1];
      const coverUrl = `https://learning.oreilly.com/covers/${bookId}/400w/`;

      // Find the context around this link to extract title
      const linkIndex = content.indexOf(link);
      const contextStart = Math.max(0, linkIndex - 800);
      const contextEnd = Math.min(content.length, linkIndex + 200);
      const context = content.slice(contextStart, contextEnd);

      // Look for title patterns near the link
      const titlePatterns = [
        /###\s*([^\n]+)\n[^#]*$/,  // Last ### before link
        /\*\*Title\*\*:\s*([^\n]+)/,
        /\*\*([^*]{10,})\*\*(?=[\s\S]*?(?:Author|Type|Description|Level))/,
        /###\s*([^\n]+)/
      ];

      let title = '';
      for (const pattern of titlePatterns) {
        const match = context.match(pattern);
        if (match) {
          title = match[1].trim();
          // Skip if title is too generic
          if (title.length > 5 && !title.match(/^(Book|Course|Video|Tutorial|Resource)$/i)) {
            break;
          }
        }
      }

      // Extract author and type from context
      const authorMatch = context.match(/\*\*Authors?\*\*:\s*([^\n]+)/);
      const typeMatch = context.match(/\*\*Type\*\*:\s*([^\||\n]+)/);

      const author = authorMatch ? authorMatch[1].trim() : '';
      const type = typeMatch ? typeMatch[1].trim() : 'Resource';

      if (title && title.length > 5) {
        bookData.push({
          title: title.replace(/\*\*/g, ''),
          author,
          type,
          description: '',
          coverUrl,
          bookUrl: link
        });
      }
    }
  });

  // Don't remove individual book sections from the main content
  // Keep all the detailed explanations in the main content
  // Only clean up Cover: lines that were explicitly added
  processedContent = processedContent.replace(/Cover:\s*https?:\/\/[^\s\)]+/gi, '');

  // Process O'Reilly Learning links
  const oreillyPattern = /https?:\/\/learning\.oreilly\.com\/library\/view\/[^\s\)]+/g;
  processedContent = processedContent.replace(oreillyPattern, (match) => {
    const cleanUrl = match.replace(/[.,;]$/, '');
    return `[📖 ${cleanUrl.split('/').pop()?.replace(/-/g, ' ') || 'O\'Reilly Book'}](${cleanUrl})`;
  });

  // Process general O'Reilly links
  const generalOreillyPattern = /https?:\/\/(?:www\.)?oreilly\.com\/[^\s\)]+/g;
  processedContent = processedContent.replace(generalOreillyPattern, (match) => {
    const cleanUrl = match.replace(/[.,;]$/, '');
    return `[🔗 O'Reilly Resource](${cleanUrl})`;
  });

  // Clean up any extra whitespace or empty lines
  processedContent = processedContent
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');

  return {
    content: processedContent.trim(),
    books: bookData
  };
};

const ChatMessage: FC<ChatMessageProps> = ({
  message,
  role,
  isLatest = false,
  useTypewriter = true,
  typingSpeed = 150,  // Much faster typing speed for immediate response feel
  isLoading = false
}) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [processed, setProcessed] = useState<ProcessedContent>({ content: '', books: [] });

  useEffect(() => {
    if (role === 'assistant' && !isLoading) {
      const result = processContentWithCoverImages(message);
      console.log('Books extracted:', result.books.length);
      console.log('Book details:', result.books);
      setProcessed(result);
    } else {
      setProcessed({ content: message, books: [] });
    }
  }, [message, role, isLoading]);

  const handleImageError = (src: string) => {
    setImageErrors(prev => new Set([...prev, src]));
  };

  const shouldUseTypewriter = useTypewriter && role === 'assistant' && isLatest;

  return (
    <MessageContainer role={role} aria-label={`${role === 'user' ? 'User' : 'Assistant'} message`}>
      {isLoading ? (
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>{message}</LoadingText>
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
            <SourcesTitle>Sources</SourcesTitle>
            {processed.books.map((book, index) => (
              <SourceItem key={index}>
                <SourceNumber>{index + 1}</SourceNumber>
                {book.coverUrl && !imageErrors.has(book.coverUrl) && (
                  <BookCover
                    src={book.coverUrl}
                    alt={book.title}
                    onError={() => handleImageError(book.coverUrl)}
                  />
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
                  {book.author && <BookMeta>By {book.author}</BookMeta>}
                  {book.type && <BookType resourceType={book.type}>{book.type}</BookType>}
                </BookDetails>
              </SourceItem>
            ))}
          </SourcesSection>
        </ContentWithImages>
      ) : (
        shouldUseTypewriter ? (
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
        )
      )}
    </MessageContainer>
  );
};

export default ChatMessage;