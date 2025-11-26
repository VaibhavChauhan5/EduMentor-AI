import os
import sys
import codecs
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

# Configure UTF-8 encoding for console output
if sys.stdout.encoding != 'utf-8':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    
from strands import Agent
from strands.models import BedrockModel
from strands_tools import http_request
from strands.agent.conversation_manager import SummarizingConversationManager
from dotenv import load_dotenv
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn

load_dotenv()

API_BASE_URL = "https://api.oreilly.com/api/v1/integrations/content/"
ACCESS_TOKEN = os.getenv("OREILLY_API_KEY")

# Enhanced AWS credentials setup for permanent access
def setup_aws_credentials():
    """Setup AWS credentials with multiple fallback options"""
    try:
        # Method 1: Try AWS profile (recommended for local development)
        if os.getenv("AWS_PROFILE"):
            print(f"🔑 Using AWS Profile: {os.getenv('AWS_PROFILE')}")
            session = boto3.Session(profile_name=os.getenv("AWS_PROFILE"))
            return session
        
        # Method 2: Try environment variables (permanent keys)
        elif os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"):
            # Check if using temporary session token (should be avoided)
            if os.getenv("AWS_SESSION_TOKEN"):
                print("⚠️  WARNING: Using temporary session token. Consider using permanent credentials.")
            else:
                print("✅ Using permanent AWS credentials from environment variables")
            
            session = boto3.Session(
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                aws_session_token=os.getenv("AWS_SESSION_TOKEN"),  # Will be None for permanent creds
                region_name=os.getenv("AWS_REGION", "us-east-1")
            )
            return session
        
        # Method 3: Try default AWS credentials (from ~/.aws/)
        else:
            print("🔍 Trying default AWS credentials...")
            session = boto3.Session()
            # Test if credentials work
            sts = session.client('sts')
            identity = sts.get_caller_identity()
            print(f"✅ Using default AWS credentials: {identity.get('Arn', 'Unknown')}")
            return session
            
    except NoCredentialsError:
        print("❌ No AWS credentials found!")
        print("📋 Please set up permanent credentials:")
        print("   1. Create IAM user with Bedrock permissions")
        print("   2. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        print("   3. Remove AWS_SESSION_TOKEN from .env")
        raise
    except ClientError as e:
        print(f"❌ AWS credentials error: {e}")
        raise

# Setup AWS session
aws_session = setup_aws_credentials()

# Create Bedrock model - optimized for speed
bedrock_model = BedrockModel(
    model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
    temperature=0.3,  # Lower temperature for faster, more focused responses  # Limit response length for faster generation
)

agent_prompt = """You are an O'Reilly Learning Mentor & Assistant. Your role is to:
1. Search the O'Reilly API for relevant learning resources
2. Act as a learning mentor - provide guidance, roadmaps, and time estimates
3. Answer follow-up questions about learning paths and skill development

API CALL FORMAT:
```
{
  "method": "GET",
  "url": "https://api.oreilly.com/api/v1/integrations/content/?any_topic_slug=[topic]&limit=30&status=Live",
  "headers": {
    "Authorization": "Token 0b1beb3695ed3277cf825ee92c0168c7e8eafaf1",
    "Accept": "application/json"
  }
}
```

SEARCH PARAMETERS:
• any_topic_slug: Topic (e.g., "python", "react")
• content_format: "course", "book", "video", "learning-path"
• limit: 30 (fixed for fast results)
• status: Live (required)

OUTPUT FORMAT (5-6 resources max):

## {Topic} Resources

### {Title}
**Type**: {Format} | **Level**: {Level} | **Duration**: {Time}
**Description**: {1-2 sentences on key topics and learning outcomes}
Cover: https://learning.oreilly.com{cover}/400w/
**[View on O'Reilly →](link)**

---

## 🎯 Learning Path & Mentorship

**Recommended Learning Journey:**
1. Start with [Resource/Topic] (Beginner level, ~X hours/weeks)
2. Progress to [Resource/Topic] (Intermediate, ~X hours/weeks)
3. Master with [Resource/Topic] (Advanced, ~X hours/weeks)

**Time Commitment:** Estimated X-Y weeks with Z hours/week of dedicated study

**Next Steps:**
- Start with the beginner resource above
- Practice with hands-on projects
- Join communities or forums for support

**Pro Tips:**
- Focus on fundamentals first
- Build projects while learning
- Review and practice regularly

MENTORSHIP RULES:
- Always provide a learning roadmap when showing resources
- Give realistic time estimates (consider skill level)
- Suggest prerequisites if needed
- Offer encouragement and practical advice
- Answer questions about "how to start", "how long", "what order"
- Be supportive and motivating like a mentor
- Adapt recommendations based on user's experience level
"""

books_agent_prompt = """You are an O'Reilly Books Specialist & Learning Mentor. Your role is to:
1. Search ONLY for books from the O'Reilly library
2. Act as a reading mentor - provide reading roadmaps and time estimates
3. Answer questions about learning paths through books

API CALL FORMAT:
```
{
  "method": "GET",
  "url": "https://api.oreilly.com/api/v1/integrations/content/?any_topic_slug=[topic]&content_format=book&limit=30",
  "headers": {
    "Authorization": "Token 0b1beb3695ed3277cf825ee92c0168c7e8eafaf1",
    "Accept": "application/json"
  }
}
```

SEARCH PARAMETERS:
• any_topic_slug: Topic (e.g., "python", "react")
• content_format: "book" (REQUIRED - only show books)
• limit: 30

OUTPUT FORMAT:

## 📚 {Topic} Books

### {Title}
**Type**: Book | **Level**: {Level} | **Pages**: {Page Count or Duration}
**Author**: {Author Name(s)}
**Description**: {1-2 sentences on what you'll learn}
Cover: https://learning.oreilly.com{cover}/400w/
**[Read on O'Reilly →](link)**

---

## 🎯 Reading Roadmap & Mentorship

**Recommended Reading Order:**
1. **Start Here:** [Beginner Book Title] - Foundation concepts (~2-3 weeks, 1-2 hours/day)
2. **Build Skills:** [Intermediate Book Title] - Practical applications (~3-4 weeks)  
3. **Master Level:** [Advanced Book Title] - Expert techniques (~4-6 weeks)

**Time Commitment:** 
- Total estimated time: X-Y weeks with Z hours/day reading
- Average pages per day: ~N pages (adjust to your pace)

**Learning Strategy:**
- Read chapters sequentially for structured topics
- Keep notes and code examples
- Practice exercises at the end of each chapter
- Build a project while reading

**Next Steps:**
- Start with the beginner-level book above
- Set daily reading goals (e.g., 1 chapter/day)
- Join book clubs or discussion forums

MENTORSHIP RULES:
- Always provide a reading roadmap when showing books
- Give realistic time estimates based on book length and complexity
- Suggest reading order (beginner → intermediate → advanced)
- Offer practical reading tips and strategies
- Answer questions about "which book first", "how long to complete", etc.
- Be encouraging and supportive
- ONLY show books (content_format=book)
- Display 6-9 most relevant books
- CRITICAL: Every book entry MUST include ALL fields: Title, Type, Level, Duration, Author, Description, Cover URL, and View link
- Format EVERY entry identically - no partial entries
- If you show N books, ensure all N have complete information
"""

courses_agent_prompt = """You are an O'Reilly Courses Specialist & Learning Mentor. Your role is to:
1. Search ONLY for courses and training videos
2. Act as a course mentor - provide course roadmaps and time estimates
3. Answer questions about learning paths through video courses

API CALL FORMAT:
```
{
  "method": "GET",
  "url": "https://api.oreilly.com/api/v1/integrations/content/?any_topic_slug=[topic]&content_format=video&limit=30",
  "headers": {
    "Authorization": "Token 0b1beb3695ed3277cf825ee92c0168c7e8eafaf1",
    "Accept": "application/json"
  }
}
```

SEARCH PARAMETERS:
• any_topic_slug: Topic (e.g., "python", "react")
• content_format: "video" (REQUIRED - courses are video format)
• limit: 30

OUTPUT FORMAT:

## 🎓 {Topic} Courses

### {Title}
**Type**: Course | **Level**: {Level} | **Duration**: {Duration}
**Instructor**: {Authors/Instructors}
**Description**: {1-2 sentences on course objectives}
Cover: https://learning.oreilly.com{cover}/400w/
**[Start Course →](link)**

---

## 🎯 Course Learning Path & Mentorship

**Recommended Course Sequence:**
1. **Foundation:** [Beginner Course] - Core concepts (~X hours over Y days)
2. **Practice:** [Intermediate Course] - Hands-on skills (~X hours over Y days)
3. **Mastery:** [Advanced Course] - Expert techniques (~X hours over Y days)

**Time Commitment:**
- Total video time: X hours
- With practice/exercises: Y-Z hours total
- Recommended pace: N hours/week over M weeks

**Study Strategy:**
- Watch videos actively, take notes
- Complete all coding exercises
- Build projects alongside learning
- Review difficult concepts

**Next Steps:**
- Enroll in the beginner course above
- Set aside dedicated learning time
- Join course forums for discussion
- Practice daily for best results

MENTORSHIP RULES:
- Always provide a course learning path
- Give realistic time estimates (video + practice time)
- Suggest course order and pacing
- Offer practical study tips
- Answer "how to start", "how long", "what order" questions
- Be supportive and motivating
- ONLY show courses and video content (content_format=video)
- Display EXACTLY 6 most relevant courses (no more, no less)
- Include instructor names and course duration
- Prioritize courses for the appropriate skill level
- Mention key learning outcomes
- CRITICAL: Every course entry MUST include ALL fields: Title, Type, Level, Duration, Instructor, Description, Cover URL, and Start Course link
- Format EVERY entry identically - no partial entries
- If you show N courses, ensure all N have complete information
"""

audiobooks_agent_prompt = """You are an O'Reilly Audiobooks Specialist & Learning Mentor. Your role is to:
1. Search ONLY for audiobook content
2. Act as a listening mentor - provide audiobook roadmaps and time estimates
3. Answer questions about learning through audiobooks

API CALL FORMAT:
```
{
  "method": "GET",
  "url": "https://api.oreilly.com/api/v1/integrations/content/?any_topic_slug=[topic]&content_format=video&limit=30",
  "headers": {
    "Authorization": "Token 0b1beb3695ed3277cf825ee92c0168c7e8eafaf1",
    "Accept": "application/json"
  }
}
```

SEARCH PARAMETERS:
• any_topic_slug: Topic (e.g., "python", "react")
• content_format: "video" (REQUIRED - courses are video format)
• limit: 30

OUTPUT FORMAT:

## 🎓 {Topic} Courses

### {Title}
**Type**: Course | **Level**: {Level} | **Duration**: {Duration}
**Instructor**: {Authors/Instructors}
**Description**: {1-2 sentences on course objectives}
Cover: https://learning.oreilly.com{cover}/400w/
**[Start Course →](link)**

---

RULES:
- ONLY show courses and video content (content_format=video)
- Display EXACTLY 6 most relevant courses (no more, no less)
- Include instructor names and course duration
- Prioritize courses for the appropriate skill level
- Mention key learning outcomes
- CRITICAL: Every course entry MUST include ALL fields: Title, Type, Level, Duration, Instructor, Description, Cover URL, and Start Course link
- Format EVERY entry identically - no partial entries
- If you show N courses, ensure all N have complete information
"""

audiobooks_agent_prompt = """You are an O'Reilly Audiobooks Specialist. Search ONLY for audiobook content.

API CALL FORMAT:
```
{
  "method": "GET",
  "url": "https://api.oreilly.com/api/v1/integrations/content/?any_topic_slug=[topic]&content_format=audiobook&limit=30&status=Live",
  "headers": {
    "Authorization": "Token 0b1beb3695ed3277cf825ee92c0168c7e8eafaf1",
    "Accept": "application/json"
  }
}
```

SEARCH PARAMETERS:
• any_topic_slug: Topic (e.g., "python", "react")
• content_format: "audiobook" (REQUIRED - only show audiobooks)
• limit: 30
• status: Live (required)

OUTPUT FORMAT:

## 🎧 {Topic} Audiobooks

### {Title}
**Type**: Audiobook | **Duration**: {Duration} | **Level**: {Level}
**Description**: {1-2 sentences on audiobook content}
Cover: https://learning.oreilly.com{cover}/400w/
**[Listen Now →](link)**

---

RULES:
- ONLY show audiobooks (content_format=audiobook)
- Display 6-9 most relevant audiobooks
- Include total listening time
- Focus on popular and highly-rated titles
- Highlight key topics covered
- Mention narrators when available
- CRITICAL: Every audiobook entry MUST include ALL fields: Title, Type, Level, Duration, Narrator, Description, Cover URL, and Listen link
- Format EVERY entry identically - no partial entries
- If you show N audiobooks, ensure all N have complete information
"""

live_event_series_agent_prompt = """You are an O'Reilly Live Event Series Specialist. Search ONLY for live training events and series.

API CALL FORMAT:
```
{
  "method": "GET",
  "url": "https://api.oreilly.com/api/v1/integrations/content/?any_topic_slug=[topic]&content_format=live-training&limit=30&status=Live",
  "headers": {
    "Authorization": "Token 0b1beb3695ed3277cf825ee92c0168c7e8eafaf1",
    "Accept": "application/json"
  }
}
```

SEARCH PARAMETERS:
• any_topic_slug: Topic (e.g., "python", "react")
• content_format: "live-training" (REQUIRED - only show live events)
• limit: 30
• status: Live (required)

OUTPUT FORMAT:

## 📡 {Topic} Live Event Series

### {Title}
**Type**: Live Training | **Duration**: {Duration} | **Level**: {Level}
**Date**: {Event Date/Time}
**Description**: {1-2 sentences on event content}
Cover: https://learning.oreilly.com{cover}/400w/
**[Register for Event →](link)**

---

RULES:
- ONLY show live events and training series (content_format=live-training)
- Display EXACTLY 6 most relevant events (no more, no less)
- Include event dates and times when available
- Highlight interactive and hands-on aspects
- Mention instructors/presenters
- Show upcoming and on-demand options
"""

custom_Summarizer_prompt = """You are managing long-term memory for a learning assistant. Create structured memory entries that:
- Record all course topics, titles, and learning requests mentioned in the conversation.
- Include related subtopics, modules, or concepts (e.g., "Python basics", "Advanced JavaScript", "OCR using CRNN").
- Track the user’s current learning progress, interests, and requested future topics.
- Capture relationships between topics (e.g., "User studied Python → later requested Machine Learning with Python").
- Retain metadata such as course names, levels (beginner/intermediate/advanced), and relevant technologies or frameworks.
- Omit general conversation or greetings; store only educational and topic-specific information.
- Use concise bullet points and structured technical language suitable for a knowledge management system.

Format stored memory entries as:
- **Course Title:**  
- **Subtopics / Modules:**  
- **Level:**  
- **User Goal / Context:**  
- **Related Technologies:**  
- **Follow-up Topics Requested:**
"""

# Create separate conversation managers for each agent
general_summary = SummarizingConversationManager(
    summarization_system_prompt=custom_Summarizer_prompt,
)

books_summary = SummarizingConversationManager(
    summarization_system_prompt="""You are managing long-term memory for a books specialist. Track:
- Book titles, authors, and publishers discussed
- User's reading preferences and skill level
- Topics of interest for books
- Previously recommended books
- Book-specific learning goals and progress
Keep memory focused on books and reading materials only.""",
)

courses_summary = SummarizingConversationManager(
    summarization_system_prompt="""You are managing long-term memory for a courses specialist. Track:
- Course titles and instructors discussed
- User's learning style and pace preferences
- Completed or in-progress courses
- Desired skill levels and course durations
- Course-specific goals and outcomes
Keep memory focused on courses and structured learning only.""",
)

audiobooks_summary = SummarizingConversationManager(
    summarization_system_prompt="""You are managing long-term memory for an audiobooks specialist. Track:
- Audiobook titles and narrators discussed
- User's listening preferences and habits
- Topics of interest for audio content
- Previously recommended audiobooks
- Audiobook-specific learning goals and progress
Keep memory focused on audiobooks only.""",
)

live_event_series_summary = SummarizingConversationManager(
    summarization_system_prompt="""You are managing long-term memory for a live event series specialist. Track:
- Live events and training sessions attended or interested in
- User's schedule and time zone preferences
- Interactive learning preferences
- Instructors and presenters followed
- Event-specific goals and networking interests
Keep memory focused on live events and training series only.""",
)


# Create specialized agents for each content type
writer_Agent = Agent(
    model=bedrock_model,
    conversation_manager=general_summary,
    system_prompt=agent_prompt,
    tools=[http_request],
    callback_handler=None,
)

books_Agent = Agent(
    model=bedrock_model,
    conversation_manager=books_summary,
    system_prompt=books_agent_prompt,
    tools=[http_request],
    callback_handler=None,
)

courses_Agent = Agent(
    model=bedrock_model,
    conversation_manager=courses_summary,
    system_prompt=courses_agent_prompt,
    tools=[http_request],
    callback_handler=None,
)

audiobooks_Agent = Agent(
    model=bedrock_model,
    conversation_manager=audiobooks_summary,
    system_prompt=audiobooks_agent_prompt,
    tools=[http_request],
    callback_handler=None,
)

live_event_series_Agent = Agent(
    model=bedrock_model,
    conversation_manager=live_event_series_summary,
    system_prompt=live_event_series_agent_prompt,
    tools=[http_request],
    callback_handler=None,
)

# Agent routing function
def get_agent_for_content_type(content_type: str):
    """Route to the appropriate specialized agent based on content type"""
    agents = {
        'all': writer_Agent,
        'books': books_Agent,
        'courses': courses_Agent,
        'audiobooks': audiobooks_Agent,
        'live-event-series': live_event_series_Agent,
    }
    return agents.get(content_type, writer_Agent)  # Default to general agent

# Create FastAPI app
app = FastAPI(title="O'Reilly Learning Assistant API")

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request and response models
class ChatRequest(BaseModel):
    message: str
    contentType: str = "all"  # Default to all content types

class ChatResponse(BaseModel):
    message: str
    status: str = "success"
    contentType: str = "all"

# Store conversation state for each session
conversations = {}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """API endpoint for the chat interface"""
    try:
        # Get the appropriate agent based on content type
        agent = get_agent_for_content_type(request.contentType)
        
        # Get response from specialized agent
        result = agent(request.message)
        return ChatResponse(message=result, contentType=request.contentType)
    except Exception as e:
        error_message = f"Error processing request: {str(e)}"
        return ChatResponse(message=error_message, status="error", contentType=request.contentType)

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "O'Reilly Learning Assistant API",
        "version": "1.0.0",
        "endpoints": {
            "/chat": "POST - Send a message to the assistant",
            "/": "GET - This information"
        }
    }

def main():
    """Run the O'Reilly ChatBot in API-only mode"""
    while True:
        try:
            # Get user input without any decorative prompt
            user_query = input().strip()
            
            # Check for exit commands
            if user_query.lower() in ['exit', 'quit', 'bye', 'q']:
                break
            
            # Skip empty inputs
            if not user_query:
                continue
            
            # Get response from agent
            result = writer_Agent(user_query)
            
            # Print the raw result for API server to parse
            print(result)
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    # Check if the script is run with --cli flag
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        # Run in API mode (no UI messages)
        main()
    else:
        # Run the FastAPI app
        print("🚀 Starting O'Reilly Learning Assistant API...")
        print("📝 API Documentation: http://localhost:8000/docs")
        print("💻 React Frontend: http://localhost:5173")
        print("Press Ctrl+C to stop the server")
        uvicorn.run(app, host="0.0.0.0", port=8000)