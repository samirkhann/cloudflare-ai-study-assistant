# AI Study Assistant

A conversational AI study companion built on Cloudflare's edge platform. This project demonstrates the integration of Workers AI, Durable Objects, and Cloudflare Pages to deliver low-latency, context-aware educational assistance.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Usage](#usage)
- [Performance](#performance)
- [Future Enhancements](#future-enhancements)
- [License](#license)
- [Author](#author)

---

## Overview

AI Study Assistant is a full-stack application that provides students with an intelligent tutoring experience. Users can ask questions across various subjects—mathematics, computer science, physics, and more—and receive detailed, contextually aware responses powered by Llama 3.3.

The entire stack runs on Cloudflare's global edge network, eliminating the need for traditional server infrastructure while ensuring responses are delivered with minimal latency regardless of the user's geographic location.

##Live Demo

**Application:** [main.ai-study-assistant.pages.dev](https://main.ai-study-assistant.pages.dev)  
**API Endpoint:** [ai-study-assistant.samirkhan.workers.dev](https://ai-study-assistant.samirkhan.workers.dev)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│                   Cloudflare Pages                               │
│                 (Next.js / React / Tailwind)                     │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKER                             │
│                   Edge API (TypeScript)                          │
│                                                                  |
│   ┌─────────────────────┐       ┌─────────────────────────┐      │
│   │                     │       │                         │      │
│   │    Workers AI       │◄─────►│    Durable Objects      │      │
│   │    (Llama 3.3)      │       │    (Conversation State) │      │
│   │                     │       │                         │      │
│   └─────────────────────┘       └─────────────────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Request Flow:**

1. User submits a question through the frontend interface
2. Request is routed to the nearest Cloudflare edge location
3. Worker retrieves conversation history from the associated Durable Object
4. Full context is sent to Workers AI (Llama 3.3) for inference
5. Response is stored in the Durable Object and returned to the client

---

## Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, React 18, Tailwind CSS v4 | User interface and styling |
| Backend | Cloudflare Workers (TypeScript) | API routing and request handling |
| AI Model | Workers AI (Llama 3.3 70B Instruct FP8) | Natural language processing |
| State | Durable Objects | Persistent conversation memory |
| Hosting | Cloudflare Pages | Static asset delivery via global CDN |
| Icons | Lucide React | UI iconography |

---

## Features

| Feature | Description |
|---------|-------------|
| Multi-turn Conversations | Maintains context across the entire conversation session |
| Persistent State | Conversation history survives page refreshes and network interruptions |
| Markdown Rendering | Properly formats bold, italic, headers, lists, and inline code |
| Quick Prompts | Pre-configured example questions for immediate engagement |
| Context Reset | Clear conversation history to start a fresh session |
| Responsive Design | Optimized for desktop, tablet, and mobile viewports |
| Edge Deployment | Sub-100ms routing to nearest data center globally |

---

## Project Structure

```
cloudflare-ai-study-assistant/
│
├── src/
│   └── index.ts                    # Cloudflare Worker entry point
│                                   # Contains Durable Object class definition
│                                   # Handles /api/chat and /api/clear endpoints
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Main chat interface component
│   │   ├── layout.tsx              # Root layout with metadata
│   │   └── globals.css             # Tailwind imports and custom animations
│   │
│   ├── postcss.config.mjs          # PostCSS configuration for Tailwind v4
│   ├── package.json                # Frontend dependencies and scripts
│   └── tsconfig.json               # TypeScript configuration
│
├── wrangler.toml                   # Cloudflare Worker configuration
├── package.json                    # Backend dependencies
├── tsconfig.json                   # Backend TypeScript configuration
├── .gitignore                      # Git ignore rules
└── README.md                       # Project documentation
```

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Wrangler CLI** (Cloudflare's command-line tool)
- **Cloudflare Account** with Workers AI access enabled

To install Wrangler globally:

```bash
npm install -g wrangler
```

To verify your installations:

```bash
node -v      # Should output v18.x.x or higher
npm -v       # Should output 9.x.x or higher
wrangler -v  # Should output the installed version
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/samirkhann/cloudflare-ai-study-assistant.git
cd cloudflare-ai-study-assistant
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser window for OAuth authentication.

---

## Deployment

### Backend Deployment (Cloudflare Worker)

From the project root directory:

```bash
# Deploy the Worker and Durable Object
wrangler deploy
```

On successful deployment, you will see output similar to:

```
Published ai-study-assistant (X.XX sec)
  https://ai-study-assistant.YOUR-SUBDOMAIN.workers.dev
```

Save this URL—you will need it for the frontend configuration.

### Frontend Deployment (Cloudflare Pages)

**Step 1:** Update the API endpoint in `frontend/app/page.tsx`

Locate the fetch calls and replace the URL with your deployed Worker URL:

```typescript
const response = await fetch(
  'https://ai-study-assistant.YOUR-SUBDOMAIN.workers.dev/api/chat',
  // ...
);
```

**Step 2:** Build and deploy

```bash
cd frontend

# Build the Next.js application
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next
```

**Step 3:** Configure the project name when prompted, or create a project in the Cloudflare dashboard first.

---

## Configuration

### wrangler.toml

```toml
name = "ai-study-assistant"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[durable_objects.bindings]]
name = "CONVERSATION"
class_name = "ConversationDurableObject"

[[migrations]]
tag = "v1"
new_classes = ["ConversationDurableObject"]
```

### Environment Variables

No environment variables are required for basic deployment. The Workers AI binding is configured automatically through `wrangler.toml`.

For local development, create a `.dev.vars` file if you need to override any settings:

```
# .dev.vars (optional)
ENVIRONMENT=development
```

---

## Usage

### Local Development

**Backend (Worker):**

```bash
# From project root
wrangler dev
```

This starts a local development server at `http://localhost:8787`.

**Frontend (Next.js):**

```bash
cd frontend
npm run dev
```

This starts the Next.js development server at `http://localhost:3000`.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a message and receive AI response |
| POST | `/api/clear` | Clear conversation history |

**Chat Request:**

```json
{
  "message": "Explain the concept of recursion",
  "conversationId": "default"
}
```

**Chat Response:**

```json
{
  "response": "Recursion is a programming technique where..."
}
```

---

## Performance

The edge-first architecture provides significant performance benefits:

| Metric | Value | Notes |
|--------|-------|-------|
| Global Edge Locations | 330+ | Cloudflare's network coverage |
| Routing Latency | < 50ms | For 95% of internet users |
| Cold Start | < 5ms | Workers have near-zero cold start |
| Inference Time | 200-500ms | Varies by response length |
| State Retrieval | < 10ms | Durable Objects co-located with Worker |

---

## Future Enhancements

The following features are planned for future releases:

- **Streaming Responses** — Display AI output progressively as it generates
- **Voice Input** — Integration with Cloudflare Calls for speech-to-text
- **File Uploads** — Support for PDF and image analysis
- **Multiple Threads** — Manage separate conversation topics
- **Export History** — Download conversations as Markdown or PDF
- **Rate Limiting** — Per-user request throttling via Workers
- **Analytics** — Usage metrics and conversation insights

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Author

**Samir Khan**  
Graduate Student, Computer Science  
Northeastern University

- GitHub: [github.com/samirkhann](https://github.com/samirkhann)
- LinkedIn: [linkedin.com/in/samirkhann](https://linkedin.com/in/samirkhann)
- Portfolio: [samirkhan.dev](https://samirkhann.github.io)
