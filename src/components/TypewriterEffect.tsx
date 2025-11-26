import { FC, useState, useEffect } from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';

interface TypewriterEffectProps {
    content: string;
    speed?: number; // Characters per second
    onComplete?: () => void;
}

const TypewriterContainer = styled.div`
  position: relative;
`;

const TypewriterEffect: FC<TypewriterEffectProps> = ({
    content,
    speed = 500, // Very fast: 500 characters per second
    onComplete
}) => {
    const [displayedContent, setDisplayedContent] = useState('');

    useEffect(() => {
        setDisplayedContent('');

        let currentIndex = 0;
        const intervalDelay = Math.max(1000 / speed, 2); // Very fast typing (2ms minimum)

        const interval = setInterval(() => {
            if (currentIndex < content.length) {
                // Display multiple characters at once for ultra-fast typing
                const chunkSize = Math.max(1, Math.floor(speed / 100)); // Display 5+ chars at a time
                setDisplayedContent(content.slice(0, currentIndex + chunkSize));
                currentIndex += chunkSize;
            } else {
                setDisplayedContent(content); // Ensure full content is displayed
                clearInterval(interval);
                if (onComplete) {
                    onComplete();
                }
            }
        }, intervalDelay);

        return () => clearInterval(interval);
    }, [content, speed, onComplete]);

    return (
        <TypewriterContainer>
            <ReactMarkdown
                components={{
                    a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                }}
            >
                {displayedContent}
            </ReactMarkdown>
        </TypewriterContainer>
    );
};

export default TypewriterEffect;