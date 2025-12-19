# 🎓 EduMentor AI: Universal Learning Assistant

## 🚀 Overview

EduMentor is a personalized learning companion that integrates with diverse content APIs to provide:
- **Specialized Guidance**: Targeted agents for different learning formats (Books, Courses, Audiobooks, Events).
- **Personalized Roadmaps**: Curated journeys from beginner to expert level.
- **Time Estimates**: Realistic study schedules based on content depth.
- **Modern Interface**: A sleek, high-performance React frontend.

---

## ✨ Features

- **Multi-Agent System**:
  - `Books Specialist`: Deep dives into literature and technical guides.
  - `Courses Specialist`: Focuses on video-based learning and structured curricula.
  - `Audiobooks Specialist`: For learning on the go.
  - `Live Events Specialist`: Real-time session tracking and registration.
- **Smart Memory**: Remembers your learning context and progress across sessions.
- **Intelligent Formatting**: Clean Markdown rendering for code snippets, tables, and lists.
- **Responsive Design**: Optimized for both workspace and mobile viewing.

---

## 🛠️ Tech Stack

### Frontend
- **React**: Modern component architecture.
- **Vite**: Ultra-fast build tool.
- **Styled Components**: Premium design system.
- **Axios**: Robust API layer.

### Backend
- **FastAPI**: High-performance Python framework.
- **AWS Bedrock**: Advanced LLM integration (Claude 3.5 Sonnet).
- **Generic Content API**: Pluggable architecture for any learning platform.

---

## 🏁 Getting Started (0 to 100 Guide)

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.9+)
- **AWS Account** (with Bedrock access)
- **Course Platform API Key** (e.g., Udemy, Coursera, or custom integration)

### 2. Backend Setup
1. Clone the repository and navigate to the root.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   - Copy `.env.example` to `.env`.
   - Add your `COURSE_API_KEY`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.
   - (Optional) Set `COURSE_API_BASE_URL` to point to your chosen platform.
5. Start the server:
   ```bash
   python api_server.py
   ```

### 3. Frontend Setup
1. In a new terminal, install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 🛡️ License

This project is open-source and available for portfolio demonstration.

---

*Note: This project is intended for educational purposes and requires valid API credentials for both AWS and a learning platform.*