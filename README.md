# 🎙️ PODIFY.EXE — Interactive Document Podcasts

Podify.exe is a serverless, multi-agent document intelligence platform that transforms static PDFs into dynamic, conversational audio podcasts. Instead of reading long papers or textbooks, users listen to a structured discussion between two AI hosts (Alexis and Devon) and can interject at any time with text or questions, pausing the show to guide the conversation.

The application is styled with a premium, retro-futuristic hacker terminal interface, complete with micro-animations, glassmorphism, looping video backdrops, and interactive dashboard analytics.

---

## 🏗️ Architecture & Core Components

```mermaid
graph TD
    A[User Uploads PDF] --> B[FastAPI Ingestion]
    B --> C[PDF Text Processor]
    C --> D[Gemini 1.5 Text Embeddings]
    D --> E[Neon PostgreSQL + pgvector]
    B --> F[Podcast Planner Agent]
    F --> G[LangGraph Moderator Node]
    G --> H[Host Alexis: Expert]
    G --> I[Co-Host Devon: Adaptive]
    H & I --> J[edge-tts Voice Synthesis]
    J --> K[Next.js Client Player]
```

### 1. Ingestion & Vector DB (Neon PostgreSQL + `pgvector`)
* **Text Extraction**: PDFs are parsed page-by-page and chunked dynamically.
* **Vector Store**: Semantic embeddings are calculated via Google's `text-embedding-004` model.
* **pgvector Search**: Embeddings are stored in Neon PostgreSQL. During user interjections, the system retrieves relevant document chunks using cosine distance.

### 2. Multi-Agent LangGraph Engine
The podcast script and flow are driven by a multi-agent state graph:
* **The Moderator (Hidden)**: Manages topic progression, controls transitions, and logs session history.
* **Alexis (Visible - Expert Host)**: Explains complex concepts, references specific sections of the PDF, and answers user interjections.
* **Devon (Visible - Curious Co-Host)**: Asks questions to keep the dialogue engaging. Devon adjusts his query style based on the user's selected **Listener Skill Profile**:
  * *Beginner Mode*: Requests intuitive analogies and simplified terms.
  * *Expert Mode*: Challenges Alexis with theoretical comparisons and deep dives.

### 3. Audio TTS Generation
* Dialogue turns are synthesised on-the-fly into mp3 files using `edge-tts`.
* Generated audio assets are served dynamically to the Next.js frontend, allowing natural pacing and playback in the Podcast Room.

### 4. Secure Authentication (Custom JWT Authentication)
* User authentication is handled directly by the backend using cryptographically signed **JSON Web Tokens (JWT)**.
* Passwords are hashed during registration and validated during login using `bcrypt` salting.
* Session tokens are stored in `localStorage` and client cookies (`auth_token`), allowing edge-compatible Next.js routing middleware validation.
* All backend database models (`documents`, `podcast_sessions`) are user-partitioned via the verified user ID claims extracted from the JWT signature, preventing unauthorized cross-user access.

---

## 🚀 Setup & Execution Guide

### 1. Database Setup
1. Create a serverless PostgreSQL database on [Neon](https://neon.tech/) (or any standard PostgreSQL instance).
2. Retrieve your database connection string (URI format starting with `postgresql://`).
*(Note: Neon Auth activation is NOT required, as authentication is fully self-hosted by the application using JWT).*

---

### 2. Backend Setup & Run
Open a terminal in the `/backend` directory:

1. **Configure Environment Variables**:
   Create a `.env` file inside `/backend` (using `.env.example` as a template):
   ```env
    DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@YOUR_POOLER_HOST/neondb?sslmode=require"
    GEMINI_API_KEY="your-google-gemini-api-key"
    GROQ_API_KEY="your-groq-api-key"
    CEREBRAS_API_KEY="your-cerebras-api-key"
    JWT_SECRET="optional-custom-jwt-secret-key"
    ```

2. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**:
     ```powershell
     venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the API Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Note: On startup, the server automatically initializes database tables (`documents`, `document_chunks`, `podcast_sessions`, `podcast_turns`) in the public schema and verifies connectivity.*

---

### 3. Frontend Setup & Run
Open a terminal in the `/frontend` directory:

1. **Configure Environment Variables**:
   Create a `.env.local` file inside `/frontend` if you wish to override the default local backend URL:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:8000/api"
   ```
   *(By default, the frontend points to `http://localhost:8000/api` if no variable is provided).*

2. **Run Dev Server**:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---
