import styled from 'styled-components';
import { ContentType } from '../types';

const SidebarContainer = styled.aside`
  width: 240px;
  background: rgba(15, 23, 42, 0.95);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    width: 200px;
  }
  
  @media (max-width: 480px) {
    width: 60px;
    padding: 10px 0;
  }
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 10px;
  }
`;

const SidebarTitle = styled.h2`
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 20px 15px;
  margin: 0 0 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  
  @media (max-width: 480px) {
    display: none;
  }
`;

const SectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 10px;
`;

interface SectionItemProps {
    active: boolean;
}

const SectionItem = styled.button<SectionItemProps>`
  background: ${props => props.active ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
  border: 1px solid ${props => props.active ? 'rgba(59, 130, 246, 0.5)' : 'transparent'};
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${props => props.active ? '#60a5fa' : '#e2e8f0'};
  font-size: 14px;
  font-family: inherit;
  text-align: left;
  
  &:hover {
    background: ${props => props.active ? 'rgba(59, 130, 246, 0.25)' : 'rgba(51, 65, 85, 0.5)'};
    border-color: ${props => props.active ? 'rgba(59, 130, 246, 0.6)' : 'rgba(148, 163, 184, 0.3)'};
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  @media (max-width: 480px) {
    padding: 10px;
    justify-content: center;
  }
`;

const SectionIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
  line-height: 1;
`;

const SectionText = styled.span`
  flex: 1;
  font-weight: 500;
  
  @media (max-width: 480px) {
    display: none;
  }
`;

const SectionBadge = styled.span`
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  
  @media (max-width: 480px) {
    display: none;
  }
`;

interface Section {
    id: ContentType;
    name: string;
    icon: string;
    badge?: string;
}

const sections: Section[] = [
    { id: 'all', name: 'All Content', icon: '🌐' },
    { id: 'books', name: 'Books', icon: '📚' },
    { id: 'courses', name: 'Courses', icon: '🎓' },
    { id: 'audiobooks', name: 'Audiobooks', icon: '🎧' },
    { id: 'live-event-series', name: 'Live Event Series', icon: '📡' },
];

interface SidebarProps {
    activeSection: ContentType;
    onSectionChange: (section: ContentType) => void;
}

function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
    return (
        <SidebarContainer>
            <SidebarTitle>Content Types</SidebarTitle>
            <SectionList>
                {sections.map((section) => (
                    <SectionItem
                        key={section.id}
                        active={activeSection === section.id}
                        onClick={() => onSectionChange(section.id)}
                        title={section.name}
                    >
                        <SectionIcon>{section.icon}</SectionIcon>
                        <SectionText>{section.name}</SectionText>
                        {section.badge && <SectionBadge>{section.badge}</SectionBadge>}
                    </SectionItem>
                ))}
            </SectionList>
        </SidebarContainer>
    );
}

export default Sidebar;
