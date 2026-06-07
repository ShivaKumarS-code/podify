# Podify - Interactive Document Podcasts

Podify is a multi-agent document intelligence platform that transforms PDFs into real-time, conversational podcasts. Instead of reading long pages, you listen to a discussion between two AI hosts (Alexis and Devon) and can interject at any time with text questions.

---

## 🏗️ Text-Only MVP Architecture

This is the **Text-Only MVP** of Podify, implementing the core features before introducing streaming audio and voice activity detection:

1. **Document Ingestion**: PDFs are processed page-by-page, chunked, and embedded using Google's `text-embedding-004` model.
2. **NeonDB with pgvector**: Chunk embeddings and metadata are stored in a relational PostgreSQL schema on Neon, enabling high-performance semantic search using pgvector's cosine distance.
3. **Podcast Planner**: An upfront planner agent analyzes the document context and generates a structured 6-segment JSON discussion outline.
4. **LangGraph Multi-Agent Engine**:
   - **Moderator (Hidden)**: A background node that manages topic progression, updates database state, and switches turns.
   - **Alexis (Expert Host - Visible)**: Explains advanced terms, debates concepts, and grounds discussions in PDF context.
   - **Devon (Curious Co-Host - Visible)**: Questions Alexis. Devon's curiosity adapts to the listener's profile (e.g. asking for analogies for beginners or deep comparisons for experts).
5. **Interactive Controls**: Auto-Play generates turns sequentially with a natural conversational rhythm. The user can type a question, immediately pausing the auto-play to inject their input, which Alexis answers in the next turn.

---

## 🚀 Setup & Running Guide

### 1. Database Setup (NeonDB)
1. Go to [Neon Console](https://neon.tech/) and create a serverless PostgreSQL database.
2. Copy the Connection String (URI format, starting with `postgresql://`).
3. Make sure to choose a string that has `?sslmode=require` (or append it).

---

### 2. Backend Setup & Run
Open a terminal in the `/backend` directory:

1. **Create Configuration**:
   Create a `.env` file inside `/backend` (you can copy `.env.example` as a template) and add your credentials:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   GEMINI_API_KEY="your-gemini-api-key"
   ```

2. **Activate Virtual Environment**:
   * **Windows**:
     ```powershell
     venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies** (if not already done):
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the FastAPI Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Note: On startup, FastAPI will automatically connect to NeonDB, enable the `pgvector` extension, and create all necessary tables (users, documents, chunks, sessions, and turns).*

---

### 3. Frontend Setup & Run
Open another terminal in the `/frontend` directory:

1. **Start the Next.js Dev Server**:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 Exploring the App Features
1. **Set Skill Level**: Select **Beginner** or **Advanced** profile from the dashboard.
2. **Upload PDF**: Drag & drop your PDF file. The system will extract text, calculate embeddings, save chunks to Neon, and plan the agenda. You will be redirected to the **Podcast Room**.
3. **Listen (Read)**: Turn **Auto-Play ON**. You'll see Alexis and Devon talking back-and-forth about the document, topic-by-topic.
4. **Interject**: Type a question in the input box and click **Interject**. The Auto-Play will pause, your comment will be logged, and Alexis will immediately answer your question grounded in the PDF text.
5. **Resume**: You can turn **Auto-Play ON** again to continue the regular podcast flow!
