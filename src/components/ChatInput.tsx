import { FC, useState, KeyboardEvent } from 'react';
import styled from 'styled-components';
import { ContentType } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  activeContentType?: ContentType;
}

const InputContainer = styled.div`
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  box-shadow: 0 -4px 6px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  z-index: 10;
  
  @media (max-width: 768px) {
    padding: 12px 16px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

const TextArea = styled.textarea`
  flex: 1;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  resize: none;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  max-height: 120px;
  overflow-y: auto;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  
  &::placeholder {
    color: #64748b;
  }
  
  &:focus {
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  
  @media (max-width: 768px) {
    padding: 12px 14px;
    font-size: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 10px 12px;
    font-size: 14px;
    border-radius: 16px;
  }
  
  &:disabled {
    background: rgba(30, 41, 59, 0.4);
    color: #475569;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button<{ disabled: boolean }>`
  margin-left: 12px;
  padding: 10px;
  background: ${props => props.disabled ? 'rgba(51, 65, 85, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'};
  color: ${props => props.disabled ? '#64748b' : 'white'};
  border: none;
  
  @media (max-width: 480px) {
    padding: 8px;
    margin-left: 8px;
  }
  border-radius: 50%;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  box-shadow: ${props => props.disabled ? 'none' : '0 4px 6px rgba(59, 130, 246, 0.4)'};
  
  &:hover {
    background: ${props => props.disabled ? 'rgba(51, 65, 85, 0.5)' : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)'};
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : '0 6px 12px rgba(59, 130, 246, 0.5)'};
  }
  
  &:active {
    transform: ${props => props.disabled ? 'none' : 'translateY(0)'};
    box-shadow: ${props => props.disabled ? '0 2px 5px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.1)'};
  }
  
  svg {
    width: 22px;
    height: 22px;
  }
  
  &:hover {
    background-color: ${props => props.disabled ? '#cccccc' : '#0062cc'};
  }
`;

const ChatInput: FC<ChatInputProps> = ({ onSendMessage, disabled = false, activeContentType = 'all' }) => {
  const [message, setMessage] = useState('');

  const getPlaceholder = () => {
    const placeholders: Record<ContentType, string> = {
      'all': 'Search all O\'Reilly content...',
      'books': 'Search for books...',
      'courses': 'Search for courses...',
      'audiobooks': 'Search for audiobooks...',
      'live-event-series': 'Search for live events...',
    };
    return placeholders[activeContentType] || 'Type a message...';
  };

  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <InputContainer>
      <TextArea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        disabled={disabled}
        rows={1}
      />
      <SendButton
        onClick={handleSendMessage}
        disabled={disabled || !message.trim()}
        aria-label="Send message"
        title="Send message"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </SendButton>
    </InputContainer>
  );
};

export default ChatInput;