from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import subprocess
import sys
import asyncio
from pydantic import BaseModel
import os
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Simple lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown handler"""
    print("🚀 Starting O'Reilly Learning Assistant API Server...")
    yield
    print("🔌 Shutting down server...")

# Create FastAPI app with lifespan manager
app = FastAPI(title="O'Reilly Learning Assistant API", lifespan=lifespan)

# Add CORS middleware to allow cross-origin requests from the frontend
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://34.236.156.239"
]

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Define request models
class ChatRequest(BaseModel):
    """
    Request model for chat endpoints
    
    Attributes:
        message: The user's message to be sent to the chatbot
        sessionId: Optional session ID for maintaining conversation state
        contentType: Optional content type filter (all, books, courses, etc.)
    """
    message: str
    sessionId: Optional[str] = None  # Using Optional for better compatibility
    contentType: Optional[str] = None  # Content type filter

# Create a process pool for running the chatbot
chatbot_process = None
chatbot_path = os.path.join(os.path.dirname(__file__), "ain.py")

# Dictionary to store conversation history by session ID
conversation_history = {}

# Dictionary to store agent instances by session ID
agent_instances = {}

# Dictionary to store last activity time for each session
last_activity = {}

# Dictionary to store session heartbeat times
session_heartbeats = {}

# Session timeout settings - More aggressive cleanup for minimal resource usage
SESSION_TIMEOUT_HOURS = 0.5  # Sessions timeout after 30 minutes of inactivity
HEARTBEAT_TIMEOUT_MINUTES = 5  # Sessions timeout after 5 minutes without heartbeat

def clean_and_format_response(text):
    """Clean and format the response for better UI presentation"""
    if not text:
        return ""
        
    text = str(text)  # Ensure it's a string
    print(f"DEBUG: Raw response length: {len(text)}")
    print(f"DEBUG: Raw response preview: {text[:500]}...")
    
    import re
    
    # Remove AI thinking/meta-commentary lines
    lines_to_remove = [
        r"^Thank you for providing.*",
        r"^I'll now (?:summarize|present|provide).*",
        r"^Let me (?:summarize|present|provide).*",
        r"^Here's (?:a summary|what I found).*search results.*",
        r"^Based on (?:the|your) search results.*",
    ]
    
    for pattern in lines_to_remove:
        text = re.sub(pattern, "", text, flags=re.MULTILINE | re.IGNORECASE)
    
    # Only remove obvious JSON structure artifacts, but preserve content
    # Remove leading JSON artifacts
    text = re.sub(r"^'role'\s*:\s*'assistant'\s*,?\s*'?content'?\s*:\s*\[\s*\{\s*'text'\s*:\s*[\"']", "", text)
    text = re.sub(r"^\{\s*'content'\s*:\s*\[\s*\{\s*'text'\s*:\s*[\"']", "", text)
    text = re.sub(r"^\[\s*\{\s*'text'\s*:\s*[\"']", "", text)
    
    # Remove trailing JSON artifacts
    text = re.sub(r"[\"']\s*\}\s*\]\s*\}\s*$", "", text)
    text = re.sub(r"[\"']\s*\}\s*\]\s*$", "", text)
    
    # Clean up escaped characters
    text = re.sub(r'\\n', '\n', text)
    text = re.sub(r'\\t', ' ', text)
    text = re.sub(r'\\"', '"', text)
    text = re.sub(r"\\'", "'", text)
    
    # Only remove completely empty lines (preserve formatting)
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    # Remove excessive blank lines (more than 2 in a row)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    
    text = text.strip()
    
    print(f"DEBUG: Cleaned response length: {len(text)}")
    print(f"DEBUG: Cleaned response preview: {text[:500]}...")
    return text

async def get_chatbot_response(message: str, session_id: str = None, content_type: str = None) -> str:
    """Send a message to the chatbot and get the response, maintaining conversation context"""
    try:
        print(f"DEBUG: Running chatbot with message: '{message}' for session: {session_id}, content_type: {content_type}")
        print(f"DEBUG: Chatbot path: {chatbot_path}")
        
        # Initialize a new session if not exists
        if session_id and session_id not in conversation_history:
            conversation_history[session_id] = []
            
        # Add current message to conversation history
        if session_id:
            conversation_history[session_id].append({"role": "user", "content": message})
            print(f"DEBUG: Added message to history. Session now has {len(conversation_history[session_id])} messages")
        
        # Use persistent agent instance for this session
        if session_id:
            try:
                # Import required modules from ain.py
                import sys
                import os
                
                # Ensure ain.py directory is in the path
                ain_dir = os.path.dirname(chatbot_path)
                if ain_dir not in sys.path:
                    sys.path.append(ain_dir)
                
                # Import modules for creating agent if needed
                from ain import (
                    bedrock_model, http_request, 
                    general_summary, agent_prompt,
                    get_agent_for_content_type
                )
                from strands import Agent
                
                # Determine which agent to use based on content_type
                # Use content_type if provided, otherwise use general agent
                if content_type and content_type != 'all':
                    # Create a session-specific key including content type
                    session_agent_key = f"{session_id}_{content_type}"
                    
                    if session_agent_key not in agent_instances:
                        print(f"DEBUG: Creating new {content_type} agent instance for session {session_id}")
                        # Get the specialized agent for this content type
                        base_agent = get_agent_for_content_type(content_type)
                        # Note: We're using the pre-configured agents from ain.py
                        agent_instances[session_agent_key] = base_agent
                    
                    agent = agent_instances[session_agent_key]
                    print(f"DEBUG: Using specialized {content_type} agent for session {session_id}")
                else:
                    # Get existing agent or create a new one for this session
                    if session_id not in agent_instances:
                        print(f"DEBUG: Creating new general agent instance for session {session_id}")
                        # Create a new agent instance with the same configuration
                        agent_instances[session_id] = Agent(
                            model=bedrock_model,
                            conversation_manager=general_summary,
                            system_prompt=agent_prompt,
                            tools=[http_request],
                        )
                    
                    # Use the session-specific agent instance
                    agent = agent_instances[session_id]
                    print(f"DEBUG: Using existing general agent for session {session_id}")
                
                # Call the agent directly to maintain conversation state
                response = agent(message)
                print(f"DEBUG: Raw agent response: {response}")
                print(f"DEBUG: Agent response type: {type(response)}")
                
                # Extract the actual content from the AgentResult
                response_text = None
                
                print(f"DEBUG: Response type: {type(response)}")
                print(f"DEBUG: Response dir: {[attr for attr in dir(response) if not attr.startswith('_')]}")
                
                # Handle AgentResult object specifically
                if hasattr(response, 'message'):
                    message = response.message
                    print(f"DEBUG: Found message attribute: {type(message)}")
                    
                    # If message is a dict with the problematic structure
                    if isinstance(message, dict) and 'content' in message:
                        content = message['content']
                        print(f"DEBUG: Message content type: {type(content)}")
                        
                        if isinstance(content, list) and len(content) > 0:
                            # Extract text from content blocks
                            text_parts = []
                            for i, item in enumerate(content):
                                print(f"DEBUG: Content item {i}: {type(item)}")
                                if isinstance(item, dict) and 'text' in item:
                                    text_parts.append(item['text'])
                                    print(f"DEBUG: Extracted text from item {i}: {len(item['text'])} chars")
                                else:
                                    text_parts.append(str(item))
                            response_text = '\n'.join(text_parts)
                            print(f"DEBUG: Extracted from message.content: {len(response_text)} chars")
                        else:
                            response_text = str(content)
                    
                    # If message is a string, use it directly
                    elif isinstance(message, str):
                        response_text = message
                        print(f"DEBUG: Message is string: {len(response_text)} chars")
                    
                    # If message is something else, convert to string
                    else:
                        response_text = str(message)
                        print(f"DEBUG: Message converted to string: {len(response_text)} chars")
                
                # If no message attribute, try other common attributes
                elif hasattr(response, 'content'):
                    content = response.content
                    print(f"DEBUG: Found content attribute: {type(content)}")
                    
                    # Handle list of content blocks
                    if isinstance(content, list) and len(content) > 0:
                        text_parts = []
                        for item in content:
                            if isinstance(item, dict) and 'text' in item:
                                text_parts.append(item['text'])
                            else:
                                text_parts.append(str(item))
                        response_text = '\n'.join(text_parts)
                    else:
                        response_text = str(content)
                
                # Try other common attributes
                elif hasattr(response, 'text'):
                    response_text = response.text
                elif hasattr(response, 'output'):
                    response_text = response.output
                elif hasattr(response, 'data'):
                    response_text = response.data
                
                # If still no text, convert the whole response to string
                if not response_text:
                    response_str = str(response)
                    print(f"DEBUG: Converting whole response to string: {len(response_str)} chars")
                    response_text = response_str
                
                print(f"DEBUG: Final extracted response text (first 200 chars): {str(response_text)[:200]}...")
                
                # Make sure we have valid text
                if response_text and len(str(response_text).strip()) > 0:
                    return clean_and_format_response(str(response_text))
                else:
                    print("DEBUG: No valid response text found, falling back to subprocess")
                    raise Exception("No valid response content found")
            except Exception as e:
                print(f"ERROR using direct agent: {e}")
                print("Falling back to subprocess method")
                
        # Start a new Python process to run the chatbot script in API mode
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            chatbot_path,
            "--cli",  # Use CLI mode for direct interaction
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        # Send the message to the chatbot with explicit exit command
        stdin_data = f"{message}\nexit\n".encode()
        print(f"DEBUG: Sending data to stdin: {stdin_data}")
        
        stdout, stderr = await process.communicate(stdin_data)
        
        # Check for errors
        if process.returncode != 0:
            error_msg = stderr.decode()
            print(f"ERROR: Process returned non-zero code {process.returncode}")
            print(f"ERROR: {error_msg}")
            return f"Sorry, there was an error processing your request. Error: {error_msg}"
        
        # Print full output for debugging
        output = stdout.decode()
        print(f"DEBUG: Raw output from chatbot:\n{output}")
        
        # Parse the output to extract just the assistant's response
        try:
            print(f"DEBUG: Parsing output of length: {len(output)}")
            print(f"DEBUG: Raw agent response: {output}")
            
            # The agent response should be most of the content after system setup
            # Look for the actual substantive response
            lines = output.split('\n')
            
            # Find where the actual response starts - after the user message
            response_started = False
            response_lines = []
            
            for i, line in enumerate(lines):
                stripped = line.strip()
                
                # Skip empty lines
                if not stripped:
                    continue
                
                # Skip system messages
                system_indicators = [
                    "Starting O'Reilly Learning Assistant API",
                    "Type 'exit' to quit", 
                    "Welcome to O'Reilly Learning Assistant!",
                    "How can I help you find resources today?",
                    "DEBUG:",
                    "📚 You:",
                    "🔍 Assistant:"
                ]
                
                if any(indicator in stripped for indicator in system_indicators):
                    continue
                
                # If we see the user's message, the response should come after
                if message.strip().lower() in stripped.lower():
                    response_started = True
                    continue
                
                # Collect substantial content lines
                if len(stripped) > 20:  # Only collect substantial lines
                    response_lines.append(line)
            
            # If we found substantial content, use it
            if response_lines:
                response_text = '\n'.join(response_lines).strip()
                print(f"DEBUG: Extracted response: {response_text[:200]}...")
                return clean_and_format_response(response_text)
            
            # Fallback: Look for the pattern where the agent provides a complete response
            # Sometimes the agent output contains the full response without clear markers
            content_blocks = []
            current_block = []
            
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    if current_block:
                        content_blocks.append('\n'.join(current_block))
                        current_block = []
                    continue
                
                # Skip obvious system lines
                if any(skip in stripped for skip in [
                    "Starting O'Reilly", "Type 'exit'", "DEBUG:", "📚", "🔍", "Welcome!", 
                    "How can I help", "Assistant API", "Learning Assistant"
                ]):
                    continue
                    
                current_block.append(line)
            
            # Add the last block if it exists
            if current_block:
                content_blocks.append('\n'.join(current_block))
            
            # Find the largest content block (likely the response)
            if content_blocks:
                largest_block = max(content_blocks, key=len)
                if len(largest_block.strip()) > 50:  # Only if it's substantial
                    print(f"DEBUG: Using largest content block: {largest_block[:200]}...")
                    return clean_and_format_response(largest_block.strip())
            
            # Final fallback - clean up the entire output
            filtered_output = output
            system_messages = [
                "Starting O'Reilly Learning Assistant API",
                "Type 'exit' to quit", 
                "O'Reilly Learning Assistant",
                "Welcome to O'Reilly Learning Assistant!",
                "How can I help you find resources today?"
            ]
            
            for system_msg in system_messages:
                filtered_output = filtered_output.replace(system_msg, "")
                
            return clean_and_format_response(filtered_output.strip())
        except Exception as e:
            print(f"ERROR parsing response: {e}")
            return f"Error parsing the chatbot response. Raw output: {output[:200]}..."
    except Exception as e:
        print(f"CRITICAL ERROR running chatbot: {e}")
        return f"Critical error running the chatbot: {str(e)}"

async def cleanup_old_sessions():
    """Clean up inactive sessions to prevent memory bloat"""
    now = datetime.now()
    activity_threshold = timedelta(hours=SESSION_TIMEOUT_HOURS)
    heartbeat_threshold = timedelta(minutes=HEARTBEAT_TIMEOUT_MINUTES)
    
    sessions_to_remove = []
    
    # Check both activity and heartbeat timeouts
    for session_id in list(agent_instances.keys()):
        should_remove = False
        reason = ""
        
        # Check activity timeout
        if session_id in last_activity:
            if now - last_activity[session_id] > activity_threshold:
                should_remove = True
                reason = f"inactive for {activity_threshold}"
        
        # Check heartbeat timeout (more aggressive)
        if session_id in session_heartbeats:
            if now - session_heartbeats[session_id] > heartbeat_threshold:
                should_remove = True
                reason = f"no heartbeat for {heartbeat_threshold}"
        elif session_id in last_activity:
            # No heartbeat recorded but has activity - give it a grace period
            if now - last_activity[session_id] > heartbeat_threshold:
                should_remove = True
                reason = f"no heartbeat recorded and inactive for {heartbeat_threshold}"
        
        if should_remove:
            sessions_to_remove.append((session_id, reason))
    
    # Clean up identified sessions
    for session_id, reason in sessions_to_remove:
        if session_id in conversation_history:
            del conversation_history[session_id]
        if session_id in agent_instances:
            del agent_instances[session_id]
        if session_id in last_activity:
            del last_activity[session_id]
        if session_id in session_heartbeats:
            del session_heartbeats[session_id]
        print(f"Cleaned up session {session_id}: {reason}")
    
    return len(sessions_to_remove)

# Add explicit OPTIONS handlers for CORS preflight requests
@app.options("/chat")
async def chat_options():
    """Handle CORS preflight requests for chat endpoint"""
    return JSONResponse(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.options("/test-post")
async def test_post_options():
    """Handle CORS preflight requests for test-post endpoint"""
    return JSONResponse(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

def analyze_message_for_search_intent(message: str) -> bool:
    """Analyze if the message is likely to trigger an O'Reilly API search"""
    search_indicators = [
        # Direct learning requests
        "find", "search", "looking for", "need", "want to learn", "show me", "recommend",
        # Content types
        "book", "course", "tutorial", "video", "learning path", "training",
        # Technologies and topics (common O'Reilly content)
        "python", "javascript", "java", "react", "node", "docker", "kubernetes", "aws", "azure",
        "machine learning", "ai", "data science", "web development", "programming", "coding",
        "cybersecurity", "cloud", "devops", "database", "sql", "mongodb", "api", "rest",
        # Learning-related verbs
        "learn", "study", "understand", "master", "practice", "guide", "introduction",
        # Question patterns that typically need resources
        "how to", "what is", "explain", "teach me", "help me with"
    ]
    
    message_lower = message.lower()
    
    # Check for search indicators
    has_search_intent = any(indicator in message_lower for indicator in search_indicators)
    
    # Additional patterns
    is_question = message.strip().endswith('?')
    is_learning_request = any(word in message_lower for word in ["learn", "tutorial", "course", "book"])
    
    return has_search_intent or (is_question and is_learning_request)

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, background_tasks: BackgroundTasks):
    """Chat API endpoint that forwards messages to the O'Reilly Learning Assistant"""
    try:
        # More detailed debugging of incoming request
        print(f"DEBUG: Received chat request: message={repr(request.message)}, sessionId={repr(request.sessionId)}")
        print(f"DEBUG: Request model validation passed with type: {type(request)}")
        
        # Create a session ID if none is provided
        session_id = request.sessionId if request.sessionId else "default"
        
        print(f"DEBUG: Using session_id: {session_id}")
        
        # Analyze if this message is likely to trigger API search
        will_search_api = analyze_message_for_search_intent(request.message)
        print(f"DEBUG: Message analysis - will likely search API: {will_search_api}")
        
        # Update last activity time and heartbeat
        now = datetime.now()
        last_activity[session_id] = now
        session_heartbeats[session_id] = now
        
        # Get response using conversation history
        print(f"DEBUG: Calling get_chatbot_response with message: {repr(request.message)}, contentType: {repr(request.contentType)}")
        response = await get_chatbot_response(request.message, session_id, request.contentType)
        
        # Store assistant's response in conversation history
        if session_id in conversation_history:
            conversation_history[session_id].append({"role": "assistant", "content": response})
        
        # Run cleanup in the background more frequently
        if len(agent_instances) > 0 and len(agent_instances) % 5 == 0:  # Every 5th request
            background_tasks.add_task(cleanup_old_sessions)
        
        return {
            "message": response, 
            "status": "success", 
            "sessionId": session_id,
            "searchedApi": will_search_api  # Add this flag to indicate if we searched the API
        }
    except Exception as e:
        print(f"ERROR in chat_endpoint: {e}")
        import traceback
        traceback.print_exc()
        
        # Create a more detailed error response
        error_response = {
            "message": f"Server error: {str(e)}", 
            "status": "error", 
            "sessionId": "default",
            "error_type": type(e).__name__,
            "error_details": str(e)
        }
        
        return JSONResponse(
            status_code=500,
            content=error_response
        )

@app.get("/")
async def root():
    """Root endpoint that returns a welcome message"""
    return {"message": "Welcome to O'Reilly Learning Assistant API"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(agent_instances),
        "cors_enabled": True
    }
    
@app.post("/test-post")
async def test_post(request: Request):
    """Simple test endpoint to validate basic POST functionality"""
    try:
        data = await request.json()
        print(f"DEBUG: Received test data: {data}")
        return {"received": data, "status": "success"}
    except Exception as e:
        print(f"ERROR in test endpoint: {e}")
        return {"error": str(e), "status": "error"}
    
@app.post("/chat-raw")
async def chat_raw_endpoint(request: Request, background_tasks: BackgroundTasks):
    """Alternative chat endpoint that accepts raw JSON for troubleshooting"""
    try:
        # Parse the raw JSON
        data = await request.json()
        print(f"DEBUG: Received raw data: {data}")
        
        # Extract message and sessionId
        message = data.get('message', '')
        session_id = data.get('sessionId', 'default')
        
        if not message:
            return {"message": "No message provided", "status": "error"}
        
        # Update last activity time and heartbeat
        now = datetime.now()
        last_activity[session_id] = now
        session_heartbeats[session_id] = now
        
        # Analyze if this message is likely to trigger API search
        will_search_api = analyze_message_for_search_intent(message)
        
        # Get response using conversation history
        response = await get_chatbot_response(message, session_id)
        
        # Store assistant's response in conversation history
        if session_id in conversation_history:
            conversation_history[session_id].append({"role": "assistant", "content": response})
        
        return {
            "message": response, 
            "status": "success", 
            "sessionId": session_id,
            "searchedApi": will_search_api
        }
    except Exception as e:
        print(f"ERROR in chat_raw_endpoint: {e}")
        import traceback
        traceback.print_exc()
        return {"message": f"Server error: {str(e)}", "status": "error"}

@app.post("/reset")
async def reset_chat(request: Request):
    """Reset the conversation history and agent instance for a session"""
    data = await request.json()
    session_id = data.get("sessionId", "default")
    
    reset_performed = False
    
    # Clear conversation history if exists
    if session_id in conversation_history:
        conversation_history.pop(session_id)
        reset_performed = True
    
    # Remove agent instance if exists
    if session_id in agent_instances:
        agent_instances.pop(session_id)
        reset_performed = True
        print(f"DEBUG: Removed agent instance for session {session_id}")
    
    if reset_performed:
        return {"message": "Conversation and memory cleared", "status": "success"}
    return {"message": "No conversation found with this session ID", "status": "error"}

@app.post("/heartbeat")
async def heartbeat(request: Request):
    """Heartbeat endpoint to keep sessions alive"""
    try:
        data = await request.json()
        session_id = data.get("sessionId", "default")
        
        now = datetime.now()
        session_heartbeats[session_id] = now
        last_activity[session_id] = now
        
        # Return session info
        return {
            "status": "success",
            "sessionId": session_id,
            "serverTime": now.isoformat(),
            "hasAgent": session_id in agent_instances,
            "hasHistory": session_id in conversation_history,
            "historyLength": len(conversation_history.get(session_id, []))
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/session/status")
async def session_status(session_id: str = "default"):
    """Get detailed status of a specific session"""
    now = datetime.now()
    
    status = {
        "sessionId": session_id,
        "exists": session_id in agent_instances,
        "hasHistory": session_id in conversation_history,
        "historyLength": len(conversation_history.get(session_id, [])),
        "lastActivity": None,
        "lastHeartbeat": None,
        "isActive": False
    }
    
    if session_id in last_activity:
        last_act = last_activity[session_id]
        status["lastActivity"] = last_act.isoformat()
        status["minutesSinceActivity"] = (now - last_act).total_seconds() / 60
    
    if session_id in session_heartbeats:
        last_hb = session_heartbeats[session_id]
        status["lastHeartbeat"] = last_hb.isoformat()
        status["minutesSinceHeartbeat"] = (now - last_hb).total_seconds() / 60
        
        # Consider active if heartbeat is recent
        if (now - last_hb).total_seconds() < (HEARTBEAT_TIMEOUT_MINUTES * 60):
            status["isActive"] = True
    
    return status

@app.get("/memory-status")
async def memory_status(session_id: str = None):
    """Get information about the current memory status"""
    if not session_id:
        # Run cleanup and return overall statistics
        cleaned_count = await cleanup_old_sessions()
        
        return {
            "total_sessions": len(conversation_history),
            "active_agents": len(agent_instances),
            "active_heartbeats": len(session_heartbeats),
            "session_ids": list(agent_instances.keys()),
            "cleaned_sessions": cleaned_count,
            "timeout_settings": {
                "session_timeout_hours": SESSION_TIMEOUT_HOURS,
                "heartbeat_timeout_minutes": HEARTBEAT_TIMEOUT_MINUTES
            }
        }
    
    # Return info about specific session
    return {
        "has_history": session_id in conversation_history,
        "history_length": len(conversation_history.get(session_id, [])),
        "has_agent": session_id in agent_instances,
        "has_heartbeat": session_id in session_heartbeats,
    }

@app.get("/live-events")
async def get_live_events(page: int = 1, page_size: int = 20, search: str = ""):
    """Fetch all live events from O'Reilly API with pagination and search"""
    try:
        import requests
        
        # Use the same API call format as the working agents
        api_key = os.getenv('OREILLY_API_KEY')
        if not api_key:
            raise Exception("OREILLY_API_KEY not found in environment variables")
        
        api_url = "https://api.oreilly.com/api/v1/integrations/live-events/"
        headers = {
            "Authorization": f"Token {api_key}",
            "Accept": "application/json"
        }
        
        # Get only upcoming live events (both starting and ending in the future)
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        tomorrow = (now + timedelta(days=1)).strftime('%Y-%m-%d')
        
        print(f"Current time: {now}")
        print(f"Filtering for events starting after: {tomorrow}")
        print(f"Requested page: {page}, page_size: {page_size}")
        
        # Fetch ALL events from API (iterate through pages)
        all_results = []
        next_url = api_url
        api_page = 1
        
        # Build initial params
        initial_params = {
            "start_datetime_after": tomorrow,
            "limit": 100  # Max per API call
        }
        
        while next_url and api_page <= 10:  # Limit to 10 API pages (1000 events max)
            print(f"Fetching API page {api_page}...")
            
            if api_page == 1:
                response = requests.get(next_url, headers=headers, params=initial_params, timeout=10)
            else:
                # Use the next_url directly (it already has params)
                response = requests.get(next_url, headers=headers, timeout=10)
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 401:
                print("Authentication failed - check API key")
                return {
                    "status": "error",
                    "message": "Authentication failed",
                    "events": [],
                    "pagination": {"page": page, "page_size": page_size, "total_pages": 0, "total_events": 0}
                }
            
            if response.status_code != 200:
                print(f"Error response: {response.text}")
                break
            
            data = response.json()
            
            if "results" in data and isinstance(data["results"], list):
                all_results.extend(data["results"])
                print(f"Got {len(data['results'])} events from API page {api_page}. Total so far: {len(all_results)}")
            
            # Check for next page
            next_url = data.get("next")
            if not next_url:
                print("No more pages from API")
                break
            
            api_page += 1
        
        print(f"Total events fetched from API: {len(all_results)}")
        
        events = []
        now = datetime.now(timezone.utc)
        
        # Process all results
        for item in all_results:
                # Extract event information from live events API
                event_id = item.get("identifier", "")
                ourn = item.get("ourn", "")
                series_ourn = item.get("series_ourn", "")
                title = item.get("title", "Untitled Event")
                
                # Filter out events that already started
                start_datetime_str = item.get("start_datetime")
                if start_datetime_str:
                    try:
                        start_dt = datetime.fromisoformat(start_datetime_str.replace('Z', '+00:00'))
                        # Skip events that already started
                        if start_dt <= now:
                            print(f"Skipping past event: {title} (started {start_dt})")
                            continue
                    except Exception as e:
                        print(f"Error parsing start date for {title}: {e}")
                        continue
                
                # Get cover image from the live event API response
                cover_path = item.get("cover", "")
                cover_url = f"https://learning.oreilly.com{cover_path}400w/" if cover_path else ""
                
                # Construct event URL directly from series_ourn (no extra API call needed)
                web_url = "https://learning.oreilly.com/live-events/"
                if series_ourn:
                    # Extract the series ID from the ourn and construct URL
                    series_id = series_ourn.split(":")[-1]
                    web_url = f"https://learning.oreilly.com/live-events/-/{series_id}/"
                
                # Parse start and end datetime (we already have start_datetime_str from filtering)
                status = "upcoming"  # All events are upcoming since we filter
                start_date = None
                end_date = None
                duration = None
                
                # We already parsed start_datetime_str above for filtering
                end_datetime_str = item.get("end_datetime")
                
                if start_datetime_str:
                    try:
                        start_dt = datetime.fromisoformat(start_datetime_str.replace('Z', '+00:00'))
                        start_date = start_datetime_str
                        
                        # Calculate duration if end date exists
                        if end_datetime_str:
                            end_dt = datetime.fromisoformat(end_datetime_str.replace('Z', '+00:00'))
                            end_date = end_datetime_str
                            
                            # Calculate duration
                            duration_seconds = int((end_dt - start_dt).total_seconds())
                            hours = duration_seconds // 3600
                            minutes = (duration_seconds % 3600) // 60
                            duration = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
                    except Exception as e:
                        print(f"Error parsing dates: {e}")
                
                # Get sessions info if available
                sessions = item.get("sessions", [])
                session_count = len(sessions) if isinstance(sessions, list) else 0
                
                # Description - for live events, create one from title and dates
                description = f"Live training event"
                if session_count > 0:
                    description += f" with {session_count} session{'s' if session_count != 1 else ''}"
                
                events.append({
                    "id": event_id,
                    "title": title,
                    "description": description,
                    "coverUrl": cover_url,
                    "eventUrl": web_url,
                    "duration": duration or "Multiple sessions",
                    "status": status,
                    "level": "All Levels",  # Live events API doesn't return this
                    "instructor": None,  # Would need to fetch series details for this
                    "startDate": start_date,
                    "endDate": end_date,
                    "sessionCount": session_count
                })
        
        # Apply search filter if provided
        if search and search.strip():
            search_lower = search.strip().lower()
            filtered_events = []
            for event in events:
                title_match = search_lower in event.get("title", "").lower()
                instructor_match = event.get("instructor") and search_lower in event.get("instructor", "").lower()
                description_match = search_lower in event.get("description", "").lower()
                
                if title_match or instructor_match or description_match:
                    filtered_events.append(event)
            
            events = filtered_events
            print(f"Search query: '{search}' - Found {len(events)} matching events")
        
        # Apply client-side pagination
        total_events = len(events)
        total_pages = (total_events + page_size - 1) // page_size  # Ceiling division
        
        # Validate page number
        if page < 1:
            page = 1
        if page > total_pages and total_pages > 0:
            page = total_pages
        
        # Calculate slice indices
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_events = events[start_idx:end_idx]
        
        print(f"Total events after filtering: {total_events}")
        print(f"Returning page {page}/{total_pages} with {len(paginated_events)} events")
        
        return {
            "status": "success",
            "events": paginated_events,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "total_events": total_events,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
    except Exception as e:
        print(f"Error fetching live events: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "events": [],
            "pagination": {"page": 1, "page_size": page_size, "total_pages": 0, "total_events": 0}
        }

# Remove @app.on_event("startup") as it causes issues in Docker
# Background tasks will be started when needed

if __name__ == "__main__":
    # This block is for local development only
    # In production, the server is started by the Docker CMD
    print("--- Starting API Server in Local Development Mode ---")
    
    import uvicorn
    uvicorn.run(
        "api_server:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )