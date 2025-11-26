import { FC, useState, useEffect } from 'react';
import styled from 'styled-components';

const CACHE_KEY = 'live_events_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheData {
    events: LiveEvent[];
    timestamp: number;
}

interface LiveEvent {
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    eventUrl: string;
    startDate?: string;
    duration?: string;
    instructor?: string;
    level?: string;
    status: 'upcoming' | 'ongoing' | 'on-demand';
}

interface PaginationInfo {
    page: number;
    page_size: number;
    total_pages: number;
    total_events: number;
    has_next: boolean;
    has_prev: boolean;
}

const EventsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: transparent;
  
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
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const RefreshButton = styled.button`
  padding: 10px 16px;
  background: rgba(30, 41, 59, 0.8);
  border: 1.5px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    border-color: rgba(59, 130, 246, 0.6);
    background: rgba(59, 130, 246, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
`;

const SearchContainer = styled.div`
  margin-bottom: 2rem;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 48px 14px 48px;
  background: rgba(30, 41, 59, 0.8);
  border: 1.5px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 15px;
  transition: all 0.2s ease;
  
  &::placeholder {
    color: #64748b;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
    background: rgba(30, 41, 59, 0.95);
  }
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #64748b;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  
  &:hover {
    color: #e2e8f0;
  }
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EventCard = styled.a`
  background: rgba(30, 41, 59, 0.8);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-4px);
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 12px 24px rgba(59, 130, 246, 0.2);
  }
`;

const EventCover = styled.div<{ url: string }>`
  width: 100%;
  height: 180px;
  background: ${props => props.url
        ? `url(${props.url}) center/cover`
        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'};
  background-color: rgba(51, 65, 85, 0.5);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::before {
    content: ${props => !props.url ? '"📡"' : '""'};
    font-size: 4rem;
    opacity: 0.3;
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
        switch (props.status) {
            case 'ongoing': return 'rgba(239, 68, 68, 0.9)';
            case 'upcoming': return 'rgba(59, 130, 246, 0.9)';
            default: return 'rgba(148, 163, 184, 0.9)';
        }
    }};
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const EventContent = styled.div`
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const EventTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EventMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 0.75rem;
  font-size: 13px;
  color: #94a3b8;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const EventDescription = styled.p`
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(148, 163, 184, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: #94a3b8;
  font-size: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #94a3b8;
  
  h3 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    color: #cbd5e1;
  }
  
  p {
    font-size: 1rem;
    margin: 0;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2rem;
  padding: 1rem;
`;

const PaginationButton = styled.button<{ active?: boolean; disabled?: boolean }>`
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid ${props => props.active ? 'rgba(59, 130, 246, 0.6)' : 'rgba(148, 163, 184, 0.3)'};
  background: ${props => props.active ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)'};
  color: ${props => props.disabled ? '#64748b' : props.active ? '#60a5fa' : '#e2e8f0'};
  font-size: 14px;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  min-width: 36px;
  
  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.6);
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const PaginationInfo = styled.span`
  color: #94a3b8;
  font-size: 14px;
  padding: 0 12px;
`;

const LiveEventsView: FC = () => {
    const [allEvents, setAllEvents] = useState<LiveEvent[]>([]);  // Store all events
    const [events, setEvents] = useState<LiveEvent[]>([]);  // Displayed events (filtered/paginated)
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // Debounce search query - only update after 300ms of no typing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter events based on debounced search query
    const filteredEvents = allEvents.filter(event => {
        if (!debouncedSearchQuery.trim()) return true;

        const query = debouncedSearchQuery.toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(query);
        const instructorMatch = event.instructor?.toLowerCase().includes(query);
        const descriptionMatch = event.description?.toLowerCase().includes(query);

        return titleMatch || instructorMatch || descriptionMatch;
    });

    // Calculate pagination for filtered events
    const totalEvents = filteredEvents.length;
    const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize));
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedEvents = filteredEvents.slice(startIdx, endIdx);

    const pagination: PaginationInfo = {
        page: currentPage,
        page_size: pageSize,
        total_pages: totalPages,
        total_events: totalEvents,
        has_next: currentPage < totalPages,
        has_prev: currentPage > 1
    };

    // Fetch all events once on component mount
    useEffect(() => {
        fetchAllEvents();

        fetchAllEvents();

        // Auto-refresh every 5 minutes to keep events up to date
        const refreshInterval = setInterval(() => {
            fetchAllEvents();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(refreshInterval);
    }, []);

    // Update displayed events when filters or page changes
    useEffect(() => {
        setEvents(paginatedEvents);
    }, [debouncedSearchQuery, currentPage, allEvents]);

    const fetchAllEvents = async () => {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const cacheData: CacheData = JSON.parse(cached);
                const cacheAge = Date.now() - cacheData.timestamp;

                // Use cache if it's less than 5 minutes old
                if (cacheAge < CACHE_DURATION) {
                    console.log(`Using cached events (${Math.round(cacheAge / 1000)}s old)`);
                    setAllEvents(cacheData.events);
                    setIsLoading(false);
                    return;
                }
            } catch (e) {
                console.warn('Cache parse error:', e);
                localStorage.removeItem(CACHE_KEY);
            }
        }

        // Fetch from API if no valid cache
        setIsLoading(true);
        try {
            console.log('Fetching all live events from API...');
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

            // Fetch all events at once (page_size=1000 to get everything)
            const response = await fetch(`${apiUrl}/live-events?page=1&page_size=1000`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Live events response:', data);

            if (data.events && Array.isArray(data.events)) {
                setAllEvents(data.events);

                // Cache the events
                const cacheData: CacheData = {
                    events: data.events,
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

                console.log(`Loaded and cached ${data.events.length} total live events`);
            } else {
                console.warn('No events found in response');
                setAllEvents([]);
            }
        } catch (error) {
            console.error('Failed to fetch live events:', error);
            setAllEvents([]);
        } finally {
            setIsLoading(false);
        }
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        // Reset to page 1 when search changes
        setCurrentPage(1);
    };

    const refreshEvents = () => {
        // Clear cache and force refresh
        localStorage.removeItem(CACHE_KEY);
        fetchAllEvents();
    };

    return (
        <EventsContainer>
            <Header>
                <HeaderContent>
                    <Title>
                        📡 Live Event Series
                    </Title>
                    <Subtitle>Join upcoming live training sessions, workshops, and interactive events</Subtitle>
                </HeaderContent>
                <RefreshButton onClick={refreshEvents} disabled={isLoading} title="Refresh events">
                    🔄 Refresh
                </RefreshButton>
            </Header>

            <SearchContainer>
                <SearchIcon>🔍</SearchIcon>
                <SearchInput
                    type="text"
                    placeholder="Search by event title, instructor, or description..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setDebouncedSearchQuery(searchQuery);
                        }
                    }}
                />
                {searchQuery && (
                    <ClearButton onClick={() => handleSearchChange('')} title="Clear search">
                        ×
                    </ClearButton>
                )}
            </SearchContainer>

            {isLoading ? (
                <LoadingContainer>
                    <LoadingSpinner />
                    <LoadingText>Loading live events...</LoadingText>
                </LoadingContainer>
            ) : events.length === 0 ? (
                <EmptyState>
                    <h3>{searchQuery ? 'No events found' : 'No events found'}</h3>
                    <p>{searchQuery ? `No events match "${searchQuery}". Try a different search.` : 'Check back soon for upcoming live training sessions and events.'}</p>
                </EmptyState>
            ) : (
                <EventsGrid>
                    {events.map((event: LiveEvent) => (
                        <EventCard key={event.id} href={event.eventUrl} target="_blank" rel="noopener noreferrer">
                            <EventCover url={event.coverUrl}>
                                <StatusBadge status="upcoming">
                                    📅 Upcoming
                                </StatusBadge>
                            </EventCover>
                            <EventContent>
                                <EventTitle>{event.title}</EventTitle>
                                <EventMeta>
                                    {event.startDate && (
                                        <MetaRow>
                                            📅 {new Date(event.startDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })} at {new Date(event.startDate).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </MetaRow>
                                    )}
                                    {event.duration && <MetaRow>⏱️ {event.duration}</MetaRow>}
                                    {event.instructor && <MetaRow>👤 {event.instructor}</MetaRow>}
                                    {event.level && <MetaRow>📊 {event.level}</MetaRow>}
                                </EventMeta>
                                <EventDescription>{event.description}</EventDescription>
                            </EventContent>
                        </EventCard>
                    ))}
                </EventsGrid>
            )}

            {!isLoading && events.length > 0 && !searchQuery && pagination.total_pages > 1 && (
                <PaginationContainer>
                    <PaginationButton
                        onClick={() => goToPage(1)}
                        disabled={!pagination.has_prev}
                    >
                        «
                    </PaginationButton>
                    <PaginationButton
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={!pagination.has_prev}
                    >
                        ‹
                    </PaginationButton>

                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        let pageNum: number;
                        if (pagination.total_pages <= 5) {
                            pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                        } else if (pagination.page >= pagination.total_pages - 2) {
                            pageNum = pagination.total_pages - 4 + i;
                        } else {
                            pageNum = pagination.page - 2 + i;
                        }

                        return (
                            <PaginationButton
                                key={pageNum}
                                active={pageNum === pagination.page}
                                onClick={() => goToPage(pageNum)}
                            >
                                {pageNum}
                            </PaginationButton>
                        );
                    })}

                    <PaginationButton
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={!pagination.has_next}
                    >
                        ›
                    </PaginationButton>
                    <PaginationButton
                        onClick={() => goToPage(pagination.total_pages)}
                        disabled={!pagination.has_next}
                    >
                        »
                    </PaginationButton>

                    <PaginationInfo>
                        Page {pagination.page} of {pagination.total_pages} · {pagination.total_events} events
                    </PaginationInfo>
                </PaginationContainer>
            )}
        </EventsContainer>
    );
};

export default LiveEventsView;
