# O'Reilly Learning Assistant Frontend

A React-based frontend for the O'Reilly Learning Assistant chatbot that provides a ChatGPT-like interface for interacting with the O'Reilly learning resources.

## Features

- Clean, modern UI similar to ChatGPT
- Real-time chat interface
- Markdown rendering for responses
- Mobile-responsive design
- Loading states and error handling

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Running backend server

## Getting Started

1. Install dependencies:

```bash
npm install
# or
yarn
```

2. Update the API endpoint:

Open `src/api.ts` and ensure the `baseURL` matches your backend server address.

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Building for Production

```bash
npm run build
# or
yarn build
```

This will create an optimized build in the `dist` folder.

## Project Structure

- `src/api.ts` - API communication logic
- `src/App.tsx` - Main application component
- `src/types.ts` - TypeScript interfaces
- `src/components/` - UI components
  - `ChatInput.tsx` - Message input component
  - `ChatMessage.tsx` - Message display component
  - `Header.tsx` - Application header

## Connecting to Backend

The frontend expects the backend to be running at the URL specified in `src/api.ts`. The backend should provide a `/chat` endpoint that accepts POST requests with a JSON body containing a `message` field.

Example request:
```json
{
  "message": "Find me some books on Python"
}
```

Example response:
```json
{
  "message": "I found several Python books for you: ...",
  "status": "success"
}
```