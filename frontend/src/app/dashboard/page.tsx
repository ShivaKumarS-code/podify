"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, DocumentData } from "@/utils/api";
import { PromptingIsAllYouNeed } from "@/components/ui/animated-hero-section";
import { authClient } from "@/lib/auth/client";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, loading: sessionLoading } = authClient.useSession();
  const user = session?.user;
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [skillLevel, setSkillLevel] = useState<"beginner" | "expert">("beginner");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/auth/sign-in");
    }
  }, [sessionLoading, user, router]);

  // Fetch documents list on mount/auth state change
  useEffect(() => {
    if (!user) return;
    async function loadDocs() {
      try {
        const docs = await api.listDocuments();
        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load documents:", err);
      }
    }
    loadDocs();
  }, [user]);

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

  // Handle delete document
  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document? This will also delete all associated podcast sessions and generated audio files.")) {
      return;
    }
    
    setUploading(true);
    try {
      await api.deleteDocument(docId);
      // Remove from state
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setUploadError(null);
    } catch (err) {
      setUploadError((err as Error).message || "Failed to delete document.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PromptingIsAllYouNeed />
      
      {/* Full screen retro cabinet interface */}
      <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-between p-4 md:p-8 font-mono text-white select-none">
        
        {/* Top HUD */}
        <header className="w-full max-w-6xl flex items-center justify-between border-b-2 border-white pb-3 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold tracking-widest blink-cursor hover:text-neutral-300 transition-colors">
              PODIFY.EXE
            </Link>
            <span className="text-xs text-neutral-400 hidden sm:inline">SYS_STATUS: ONLINE</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-right text-neutral-300 font-mono uppercase tracking-wider">
            <span>{user ? `Welcome, ${user.name || user.email}!` : "Welcome!"}</span>
            {user && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await authClient.signOut();
                    window.location.href = "/";
                  } catch (err) {
                    console.error("Failed to sign out:", err);
                  }
                }}
                className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-black px-2 py-0.5 transition-colors cursor-pointer font-bold"
              >
                [LOGOUT]
              </button>
            )}
          </div>
        </header>

        {/* Main Grid Deck */}
        <main className="w-full max-w-6xl flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-6">
          
          {/* Deck Left: Upload Section */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Upload Module */}
            <section className="border-4 border-double border-white bg-black/90 p-6 flex flex-col flex-1">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
                &gt; Upload Document
              </h2>
              
              {/* Retro Drag Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed flex-1 flex flex-col items-center justify-center p-6 cursor-pointer transition-colors duration-200 min-h-[220px] ${
                  dragActive
                    ? "border-white bg-white/10"
                    : "border-neutral-700 hover:border-white hover:bg-white/5"
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
                    <span className="text-lg animate-pulse tracking-widest">ANALYZING_PDF...</span>
                    <span className="text-xs text-neutral-400">BUILDING AGENDA IN DATABASE</span>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-sm font-semibold mb-1 uppercase tracking-wider">
                      Drag & Drop PDF file here
                    </p>
                    <p className="text-xs text-neutral-500 mb-4 uppercase">or click to choose file</p>
                    <span className="border border-neutral-700 px-3 py-1 text-[10px] text-neutral-400 uppercase">
                      Supports Research Papers, Manuals, & Textbooks
                    </span>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 border-2 border-red-500 bg-red-950/50 p-3 text-red-400 text-xs uppercase font-bold tracking-wider">
                  ⚠️ Error: {uploadError}
                </div>
              )}
            </section>

            {/* Profile Settings Module */}
            <section className="border-4 border-double border-white bg-black/90 p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
                &gt; Podcast Profile Settings
              </h2>
              
              <div className="space-y-4">
                <span className="block text-xs text-neutral-400 uppercase tracking-widest">
                  Listener Skill Profile:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSkillLevel("beginner")}
                    disabled={uploading}
                    className={`border-2 p-4 text-left transition-colors flex flex-col justify-between cursor-pointer ${
                      skillLevel === "beginner"
                        ? "border-white bg-white text-black font-bold"
                        : "border-neutral-800 hover:border-neutral-400 text-white bg-transparent"
                    }`}
                  >
                    <span className="font-bold text-sm uppercase">Beginner Mode</span>
                    <span className={`text-[10px] mt-2 leading-normal uppercase ${
                      skillLevel === "beginner" ? "text-neutral-800" : "text-neutral-500"
                    }`}>
                      Julia asks basic questions and requests intuitive analogies.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillLevel("expert")}
                    disabled={uploading}
                    className={`border-2 p-4 text-left transition-colors flex flex-col justify-between cursor-pointer ${
                      skillLevel === "expert"
                        ? "border-white bg-white text-black font-bold"
                        : "border-neutral-800 hover:border-neutral-400 text-white bg-transparent"
                    }`}
                  >
                    <span className="font-bold text-sm uppercase">Advanced / Expert Mode</span>
                    <span className={`text-[10px] mt-2 leading-normal uppercase ${
                      skillLevel === "expert" ? "text-neutral-800" : "text-neutral-500"
                    }`}>
                      Julia challenges with complex theoretical & industry comparisons.
                    </span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Deck Right: Documents List */}
          <section className="border-4 border-double border-white bg-black/90 p-6 flex flex-col h-full min-h-[350px]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
              &gt; Available Documents ({documents.length})
            </h2>

            {documents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 text-neutral-500">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-xs uppercase">No documents processed yet</p>
                <p className="text-[10px] text-neutral-600 mt-1 uppercase">Upload a PDF to initialize</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[500px] space-y-4 pr-1">
                {documents.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="border border-neutral-700 hover:border-white p-3 flex flex-col justify-between bg-black/50 transition-colors gap-3 group"
                  >
                    <div className="space-y-1 truncate">
                      <p className="font-bold text-xs uppercase truncate group-hover:text-white transition-colors">
                        {index + 1}. {doc.title}
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase">
                        📄 {doc.page_count} pages • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startSessionOnDoc(doc.id)}
                        disabled={uploading}
                        className="flex-1 text-center border-2 border-white bg-transparent text-white hover:bg-white hover:text-black py-1 text-xs font-bold transition-colors uppercase cursor-pointer"
                      >
                        Start Podcast
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        disabled={uploading}
                        className="px-2 text-center border-2 border-red-500 bg-transparent text-red-500 hover:bg-red-500 hover:text-black py-1 text-xs font-bold transition-colors uppercase cursor-pointer"
                        title="Delete Document"
                      >
                        [X]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>

        {/* Footer HUD */}
        <footer className="w-full max-w-6xl flex items-center justify-between border-t-2 border-white pt-3 text-[10px] text-neutral-500 uppercase">
          <span>SYSTEM VER: 1.0.0</span>
          <span>PRESS [START] TO COMPILE PODCAST</span>
        </footer>

      </div>
    </>
  );
}
