import { authClient } from "@/lib/auth/client";

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

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await authClient.getSession();
    console.log("getAuthHeaders session data:", session);
    const email = session?.data?.user?.email;
    const id = session?.data?.user?.id;
    const headers: Record<string, string> = {};
    if (email) {
      headers["X-User-Email"] = email;
    }
    if (id) {
      headers["X-User-Id"] = id;
    }
    console.log("getAuthHeaders headers:", headers);
    return headers;
  } catch (err) {
    console.error("Error retrieving session auth headers:", err);
    return {};
  }
}

export const api = {
  async listDocuments(): Promise<DocumentData[]> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to list documents");
    return res.json();
  },

  async uploadDocument(file: File): Promise<{ document_id: number; title: string; agenda: AgendaData }> {
    const formData = new FormData();
    formData.append("file", file);

    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to upload document" }));
      throw new Error(err.detail || "Failed to upload document");
    }
    return res.json();
  },

  async createSession(documentId: number, skillLevel: string): Promise<SessionData & { first_turn?: PodcastTurnData }> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ document_id: documentId, skill_level: skillLevel }),
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  async getSession(sessionId: string): Promise<SessionData> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to load session details");
    return res.json();
  },

  async getSessionTurns(sessionId: string): Promise<PodcastTurnData[]> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/turns`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error("Failed to load session transcript");
    return res.json();
  },

  async generateNextTurn(
    sessionId: string,
    userMessage?: string
  ): Promise<{ session_completed: boolean; turn?: PodcastTurnData }> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/next-turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ user_message: userMessage || null }),
    });
    if (!res.ok) throw new Error("Failed to generate next turn");
    return res.json();
  },

  async deleteDocument(documentId: number): Promise<{ success: boolean; message: string }> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to delete document" }));
      throw new Error(err.detail || "Failed to delete document");
    }
    return res.json();
  },
};
