"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, DocumentData } from "@/utils/api";

export default function Dashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [skillLevel, setSkillLevel] = useState<"beginner" | "expert">("beginner");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents list on mount
  useEffect(() => {
    async function loadDocs() {
      try {
        const docs = await api.listDocuments();
        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load documents:", err);
      }
    }
    loadDocs();
  }, []);

  // Handle file drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Upload and process PDF
  const processFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setUploadError("Only PDF documents are supported.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Upload and parse
      const res = await api.uploadDocument(file);
      
      // 2. Create the podcast session with active skill level
      const session = await api.createSession(res.document_id, skillLevel);
      
      // 3. Navigate to the podcast room
      router.push(`/podcast/${session.session_id}`);
    } catch (err) {
      setUploadError((err as Error).message || "Failed to process document. Make sure the backend API is running.");
      setUploading(false);
    }
  };

  // Handle start session on existing document
  const startSessionOnDoc = async (docId: number) => {
    setUploading(true);
    try {
      const session = await api.createSession(docId, skillLevel);
      router.push(`/podcast/${session.session_id}`);
    } catch {
      setUploadError("Failed to create podcast session. Please try again.");
      setUploading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-6 max-w-5xl w-full mx-auto">
      {/* Header */}
      <header className="w-full flex flex-col items-center text-center mt-12 mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-purple-300 mb-4 tracking-wider uppercase">
          🚀 Powered by Gemini & LangGraph
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-300 mb-4 font-sans">
          Podify
        </h1>
        <p className="text-base md:text-lg text-slate-400 max-w-xl">
          Transform uploaded PDFs into dynamic, real-time conversational podcasts where you participate in the discussion.
        </p>
      </header>

      {/* Main Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Side: Upload & Config */}
        <section className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -z-10" />
            
            <h2 className="text-xl font-bold mb-4 text-purple-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Document
            </h2>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[220px] ${
                dragActive
                  ? "border-purple-400 bg-purple-500/10 scale-[0.99]"
                  : "border-white/10 hover:border-purple-500/30 hover:bg-white/[0.01]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={uploading}
              />

              {uploading ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-purple-400 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-purple-200">Analyzing Document...</p>
                    <p className="text-xs text-slate-500 mt-1">Extracting pages & building agenda</p>
                  </div>
                </div>
              ) : (
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 text-purple-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="font-medium text-slate-200 mb-1">
                    Drag and drop your PDF here
                  </p>
                  <p className="text-xs text-slate-500 mb-4">or click to browse from files</p>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-slate-400">
                    Supports Research Papers, Manuals, & Textbooks
                  </span>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs leading-relaxed">
                ⚠️ {uploadError}
              </div>
            )}
          </div>

          {/* Config Card */}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-purple-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Podcast Profile Settings
            </h2>
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Listener Skill Profile
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSkillLevel("beginner")}
                  disabled={uploading}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    skillLevel === "beginner"
                      ? "border-purple-500 bg-purple-500/5 text-purple-200"
                      : "border-white/5 bg-white/[0.01] text-slate-400 hover:border-white/10"
                  }`}
                >
                  <span className="font-bold text-sm">Beginner</span>
                  <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                    Co-host asks basic questions and requests intuitive analogies.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSkillLevel("expert")}
                  disabled={uploading}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    skillLevel === "expert"
                      ? "border-purple-500 bg-purple-500/5 text-purple-200"
                      : "border-white/5 bg-white/[0.01] text-slate-400 hover:border-white/10"
                  }`}
                >
                  <span className="font-bold text-sm">Advanced / Expert</span>
                  <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                    Co-host challenges with complex industry & theoretical comparisons.
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Available Documents */}
        <section className="glass-panel rounded-2xl p-6 min-h-[350px] flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-purple-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Available Documents ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 border border-dashed border-white/5 rounded-xl">
              <svg className="w-10 h-10 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2M5 13V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm font-medium">No documents processed yet</p>
              <p className="text-xs text-slate-600 mt-1">Upload a PDF on the left to initialize.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="space-y-1 pr-4 truncate">
                    <p className="font-semibold text-slate-200 text-sm group-hover:text-purple-300 transition-colors truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      📄 {doc.page_count} pages • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => startSessionOnDoc(doc.id)}
                    disabled={uploading}
                    className="flex-shrink-0 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 hover:text-white border border-purple-500/20 text-purple-300 text-xs font-semibold rounded-lg transition-all"
                  >
                    Start Podcast
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
