const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface DocumentData {
  id: number;
  title: string;
  page_count: number;
  created_at: string;
}

export interface AgendaSegment {
  id: number;
  title: string;
  description: string;
}

export interface AgendaData {
  segments?: AgendaSegment[];
}

export interface SessionData {
  session_id: string;
  document_id?: number;
  document_title: string;
  skill_level: string;
  agenda_index: number;
  agenda: AgendaData;
  is_active: boolean;
  created_at: string;
}

export interface PodcastTurnData {
  id?: number;
  speaker: "expert" | "cohost" | "user";
  content: string;
  agenda_topic?: string;
  audio_path?: string;
  created_at: string;
}

export const api = {
  async listDocuments(): Promise<DocumentData[]> {
    const res = await fetch(`${API_BASE_URL}/documents/`);
    if (!res.ok) throw new Error("Failed to list documents");
    return res.json();
  },

  async uploadDocument(file: File): Promise<{ document_id: number; title: string; agenda: AgendaData }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to upload document" }));
      throw new Error(err.detail || "Failed to upload document");
    }
    return res.json();
  },

  async createSession(documentId: number, skillLevel: string): Promise<SessionData & { first_turn?: PodcastTurnData }> {
    const res = await fetch(`${API_BASE_URL}/sessions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, skill_level: skillLevel }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  async getSession(sessionId: string): Promise<SessionData> {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
    if (!res.ok) throw new Error("Failed to load session details");
    return res.json();
  },

  async getSessionTurns(sessionId: string): Promise<PodcastTurnData[]> {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/turns`);
    if (!res.ok) throw new Error("Failed to load session transcript");
    return res.json();
  },

  async generateNextTurn(
    sessionId: string,
    userMessage?: string
  ): Promise<{ session_completed: boolean; turn?: PodcastTurnData }> {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/next-turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_message: userMessage || null }),
    });
    if (!res.ok) throw new Error("Failed to generate next turn");
    return res.json();
  },
};
