import { FC } from 'react';
import styled from 'styled-components';
import { resetChat } from '../api';
import { useAuth } from '../contexts/AuthContext';

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(15, 23, 42, 0.95);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    padding: 10px 16px;
  }
  
  @media (max-width: 480px) {
    padding: 8px 12px;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #d33a2c;
  color: white;
  border-radius: 8px;
  font-weight: bold;
  font-size: 20px;
  box-shadow: 0 2px 4px rgba(211, 58, 44, 0.2);
  
  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #e2e8f0;
  
  @media (max-width: 768px) {
    font-size: 20px;
  }
  
  @media (max-width: 480px) {
    font-size: 18px;
  }
  
  span {
    font-weight: 300;
    opacity: 0.8;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const ActionButton = styled.button`
  background: rgba(51, 65, 85, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    padding: 5px 10px;
    font-size: 12px;
  }
  
  &:hover {
    background: rgba(59, 130, 246, 0.8);
    border-color: rgba(59, 130, 246, 0.6);
    color: white;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #cbd5e1;
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  
  @media (max-width: 480px) {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
`;

interface HeaderProps {
  onResetChat?: () => void;
}

const Header: FC<HeaderProps> = ({ onResetChat }) => {
  const { user, logout } = useAuth();

  const handleReset = async () => {
    try {
      await resetChat();
      if (onResetChat) {
        onResetChat();
      }
    } catch (error) {
      console.error("Failed to reset chat:", error);
    }
  };

  return (
    <HeaderContainer>
      <div>
        <Logo>
          <LogoIcon>E</LogoIcon>
          <Title>EduMentor <span>AI</span></Title>
        </Logo>
      </div>
      <HeaderActions>
        {user && (
          <UserInfo>
            <UserAvatar>
              {user.name.charAt(0).toUpperCase()}
            </UserAvatar>
            <span>{user.name}</span>
          </UserInfo>
        )}
        <ActionButton onClick={handleReset} aria-label="Start new chat" title="Start new chat">
          New Chat
        </ActionButton>
        <ActionButton onClick={logout} aria-label="Logout" title="Logout">
          Logout
        </ActionButton>
      </HeaderActions>
    </HeaderContainer>
  );
};

export default Header;