"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, SessionData, PodcastTurnData, AgendaSegment } from "@/utils/api";
import Link from "next/link";

export default function PodcastRoom() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [turns, setTurns] = useState<PodcastTurnData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive States
  const [userInput, setUserInput] = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  
  // Cat State Machine: expert-speaking | cohost-speaking | user-speaking | thinking | idle
  const [catState, setCatState] = useState<"expert-speaking" | "cohost-speaking" | "user-speaking" | "thinking" | "idle">("idle");
  const [isInterruptionResponse, setIsInterruptionResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mobileTab, setMobileTab] = useState<"stage" | "transcript">("stage");

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const latestInputRef = useRef("");
  const isListeningRef = useRef(false);
  const shouldSubmitOnEndRef = useRef(true);

  // Keep refs in sync with state
  useEffect(() => {
    latestInputRef.current = userInput;
  }, [userInput]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Speech Recognition Initialization
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setCatState("user-speaking");
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        if (text) {
          setUserInput(text);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (!latestInputRef.current.trim()) {
          setCatState("idle");
        }
      };

      rec.onend = () => {
        setIsListening(false);
        const text = latestInputRef.current.trim();
        if (text && shouldSubmitOnEndRef.current) {
          submitInterruption(text);
        } else {
          setCatState("idle");
        }
      };

      recognitionRef.current = rec;
    }
  }, []);


  // Helper to get correct backend asset URLs
  const getAudioUrl = (path: string | undefined) => {
    if (!path) return "";
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace("/api", "") 
      : "http://localhost:8000";
    return `${backendBaseUrl}${path}`;
  };

  // Play audio helper
  const playAudio = (path: string | undefined) => {
    if (!path || !audioRef.current) return;
    const url = getAudioUrl(path);
    audioRef.current.src = url;
    audioRef.current.play().catch(e => console.log("Audio playback failed:", e));
  };

  // Load Session and Turns
  useEffect(() => {
    if (!sessionId) return;
    
    async function loadData() {
      try {
        const sessionDetails = await api.getSession(sessionId);
        setSession(sessionDetails);
        
        const history = await api.getSessionTurns(sessionId);
        setTurns(history);
        
        // Auto-play the last turn on page mount if session is active
        if (history.length > 0) {
          const lastTurn = history[history.length - 1];
          if (sessionDetails.is_active && autoPlay) {
            if (lastTurn.speaker === "expert") setCatState("expert-speaking");
            else if (lastTurn.speaker === "cohost") setCatState("cohost-speaking");
            else setCatState("idle");

            if (lastTurn.audio_path) {
              playAudio(lastTurn.audio_path);
            } else {
              setCatState("thinking");
              triggerNextTurn();
            }
          } else {
            setCatState("idle");
          }
        } else {
          setCatState("idle");
        }
      } catch (err) {
        setError("Failed to load podcast session. Returning to dashboard.");
        setTimeout(() => router.push("/dashboard"), 3000);
      }
    }
    
    loadData();
  }, [sessionId, router]);

  // Scroll to bottom on new turn
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, catState]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in the input field
      if (document.activeElement === inputRef.current) {
        if (e.key === "Escape") {
          inputRef.current?.blur();
          shouldSubmitOnEndRef.current = false;
          if (isListeningRef.current && recognitionRef.current) {
            recognitionRef.current.stop();
          }
          setUserInput("");
          latestInputRef.current = "";
          setCatState("idle");
        }
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        inputRef.current?.focus();
        interruptPodcast();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        setCatState("thinking");
        triggerNextTurn();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        inputRef.current?.focus();
        setUserInput("");
        interruptPodcast();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [turns, session, loading, autoPlay]);


  // Trigger next turn
  async function triggerNextTurn(userMsg?: string) {
    if (!sessionId || loading) return;
    
    setLoading(true);
    setCatState("thinking");

    try {
      const res = await api.generateNextTurn(sessionId, userMsg);
      
      const sessionDetails = await api.getSession(sessionId);
      setSession(sessionDetails);

      if (res.session_completed) {
        setAutoPlay(false);
        setCatState("idle");
      } else if (res.turn) {
        setTurns((prev) => [...prev, res.turn!]);
        
        // Update speaker state
        if (res.turn.speaker === "expert") {
          setCatState("expert-speaking");
        } else if (res.turn.speaker === "cohost") {
          setCatState("cohost-speaking");
        }

        // Play the synthesized audio
        if (res.turn.audio_path) {
          playAudio(res.turn.audio_path);
        } else {
          // Fallback if no audio generated: advance after 3s delay
          if (autoPlay) {
            setTimeout(() => {
              triggerNextTurn();
            }, 3000);
          } else {
            setCatState("idle");
          }
        }
      }
    } catch (err) {
      console.error("Failed to generate next turn:", err);
      setAutoPlay(false);
      setCatState("idle");
    } finally {
      setLoading(false);
    }
  }

  // Audio ended handler - Orchestrates the loop
  function handleAudioEnded() {
    if (isInterruptionResponse) {
      setIsInterruptionResponse(false);
      setAutoPlay(true);
      setCatState("thinking");
      triggerNextTurn();
    } else if (autoPlay) {
      setCatState("thinking");
      triggerNextTurn();
    } else {
      setCatState("idle");
    }
  }

  // Interruption trigger
  function interruptPodcast() {
    if (audioRef.current) {
      audioRef.current.pause(); // Halts audio instantly but keeps playback position
    }
    setAutoPlay(false);
    setCatState("user-speaking"); // Show staring cats
  }

  function submitInterruption(msg: string) {
    setUserInput("");
    latestInputRef.current = "";
    
    // Add user's question locally to show it immediately
    const userTurn: PodcastTurnData = {
      speaker: "user",
      content: msg,
      created_at: new Date().toISOString()
    };
    setTurns((prev) => [...prev, userTurn]);
    
    // Lock interruption flag to resume loop when response finishes
    setIsInterruptionResponse(true);
    setCatState("thinking");
    
    triggerNextTurn(msg);
  }

  function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!userInput.trim()) return;

    shouldSubmitOnEndRef.current = false;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const msg = userInput.trim();
    submitInterruption(msg);
  }

  function toggleSpeechRecognition() {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      shouldSubmitOnEndRef.current = true;
      recognitionRef.current.stop();
    } else {
      shouldSubmitOnEndRef.current = true;
      setUserInput("");
      latestInputRef.current = "";
      interruptPodcast();
      
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  }

  function handlePlayPauseToggle() {
    if (!audioRef.current) return;
    
    if (autoPlay) {
      // Pause
      audioRef.current.pause();
      setAutoPlay(false);
      setCatState("idle");
    } else {
      // Play
      setAutoPlay(true);
      
      const lastTurn = turns[turns.length - 1];
      if (lastTurn && lastTurn.audio_path) {
        // Resume current audio
        audioRef.current.play().catch(e => console.log("Playback failed:", e));
        if (lastTurn.speaker === "expert") setCatState("expert-speaking");
        else if (lastTurn.speaker === "cohost") setCatState("cohost-speaking");
      } else {
        // No audio exists or failed, generate next
        setCatState("thinking");
        triggerNextTurn();
      }
    }
  }




  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black font-mono">
        <div className="border-4 border-double border-red-500 p-8 bg-black max-w-md">
          <p className="text-red-500 font-extrabold text-lg mb-2">⚠️ SYSTEM ERROR</p>
          <p className="text-xs text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-black font-mono p-4">
        <div className="flex flex-col items-center space-y-4 max-w-full text-center">
          <div className="text-white animate-pulse text-lg sm:text-2xl font-bold blink-cursor break-words">
            CONNECTING TO PODIFY.EXE...
          </div>
        </div>
      </div>
    );
  }

  const segments = session.agenda.segments || [];
  const fileSize = "12.4 MB";

  return (
    <div className="w-full h-[100dvh] bg-black flex flex-col text-slate-300 font-mono text-xs crt relative overflow-hidden p-4">
      
      {/* Hidden HTML5 Audio Element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* ================= HEADER BAR ================= */}
      <header className="w-full flex items-center justify-between pb-3 mb-3 border-b-2 border-white">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold text-white tracking-wider font-sans select-none">
            <Link href="/" className="hover:text-neutral-300 transition-colors">
              PODIFY.EXE
            </Link>
          </h1>
          <span className="text-[10px] text-neutral-400 tracking-wider">
            Your documents. AI podcast.
          </span>
        </div>

        {/* ON AIR Blinking Badge & Play/Pause Controller */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPauseToggle}
            className={`px-3 py-1.5 border-2 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer select-none ${
              autoPlay
                ? "border-white bg-white text-black font-bold"
                : "border-neutral-700 bg-transparent text-neutral-400 hover:border-white hover:text-white"
            }`}
            title={autoPlay ? "Pause Podcast" : "Resume Podcast"}
          >
            <span>{autoPlay ? "⏸ PAUSE" : "▶ PLAY"}</span>
          </button>

          <div className={`px-4 py-1.5 border-2 flex items-center gap-2 ${session.is_active ? "border-green-500 bg-green-500/5 text-[#00f5d4] shadow-[0_0_15px_rgba(0,245,212,0.15)]" : "border-neutral-800 text-neutral-600"}`}>
            <span className={`w-2 h-2 rounded-full ${session.is_active ? "bg-[#00f5d4] animate-pulse" : "bg-slate-700"}`} />
            <span className="text-xs font-bold tracking-widest">{session.is_active ? "• ON AIR •" : "OFF AIR"}</span>
          </div>
        </div>

        {/* Window controls & Active PDF dropdown */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black border border-neutral-700 rounded text-slate-400 max-w-xs truncate">
            <span className="text-[9px] text-white uppercase font-bold">Session:</span>
            <span className="truncate text-neutral-300">{session.document_title}.pdf</span>
          </div>
        </div>
      </header>

      {/* Mobile view selector tabs */}
      <div className="flex md:hidden border-2 border-white mb-3 bg-neutral-955 font-mono text-xs select-none">
        <button
          onClick={() => setMobileTab("stage")}
          className={`flex-1 py-3 text-center font-bold tracking-widest transition-all cursor-pointer ${
            mobileTab === "stage"
              ? "bg-white text-black font-extrabold"
              : "bg-transparent text-slate-400 hover:text-white"
          }`}
        >
          [ 📺 STAGE FEED ]
        </button>
        <button
          onClick={() => setMobileTab("transcript")}
          className={`flex-1 py-3 text-center font-bold tracking-widest transition-all cursor-pointer ${
            mobileTab === "transcript"
              ? "bg-white text-black font-extrabold"
              : "bg-transparent text-slate-400 hover:text-white"
          }`}
        >
          [ 📜 LIVE TRANSCRIPT ]
        </button>
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        
        {/* ================= LEFT COLUMN ================= */}
        <aside className="hidden md:flex md:col-span-1 flex-col gap-4 overflow-hidden h-full">
          {/* Document Panel */}
          <section className="border-4 border-double border-white bg-black p-4 flex flex-col gap-3">
            <h2 className="text-xs font-extrabold text-white uppercase border-b border-neutral-800 pb-1.5 tracking-wider">
              [ DOCUMENT ]
            </h2>
            <div className="flex items-start gap-2.5">
              <div className="text-white text-2xl flex-shrink-0">📄</div>
              <div className="space-y-1 truncate">
                <p className="font-bold text-slate-200 text-xs truncate">{session.document_title}.pdf</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {fileSize} • {session.agenda.segments ? "45 pages" : "Unknown"}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-1.5 border-2 border-white bg-transparent text-[10px] text-white font-bold hover:bg-white hover:text-black transition-all cursor-pointer"
            >
              CHANGE DOCUMENT
            </button>
          </section>

          {/* Discussion Outline Panel */}
          <section className="border-4 border-double border-white bg-black p-4 flex-1 flex flex-col min-h-[200px]">
            <h2 className="text-xs font-extrabold text-white uppercase border-b border-neutral-800 pb-1.5 tracking-wider mb-2.5">
              [ DISCUSSION OUTLINE ]
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
              {segments.map((seg: AgendaSegment) => {
                const isActive = seg.id === session.agenda_index;
                const isPassed = seg.id < session.agenda_index;
                return (
                  <div
                    key={seg.id}
                    className={`flex items-center justify-between p-2 border transition-all ${
                      isActive
                        ? "bg-white border-white text-black font-bold"
                        : "bg-transparent border-transparent text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isActive ? "text-black animate-pulse" : isPassed ? "text-neutral-600" : "text-slate-700"}>
                        {isActive ? "▶" : "■"}
                      </span>
                      <span className={`text-[11px] ${isActive ? "font-bold text-black" : ""}`}>{seg.title}</span>
                    </div>
                    <div>
                      {isPassed ? (
                        <span className="text-[9px] text-neutral-600 uppercase">✔</span>
                      ) : isActive ? (
                        <span className="text-[9px] text-black uppercase animate-pulse">ON</span>
                      ) : (
                        <span className="text-slate-700 text-[10px]">🔒</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        {/* ================= CENTER COLUMN (STAGE & CONTROL) ================= */}
        <main className={`col-span-1 md:col-span-2 flex flex-col gap-4 overflow-hidden h-full ${
          mobileTab === "stage" ? "flex" : "hidden md:flex"
        }`}>
          
          {/* Main Visual Arena */}
          <section className="border-4 border-double border-white bg-black flex-1 min-h-[300px] flex flex-col relative overflow-hidden select-none">
            
            {/* Retro grid lines */}
            <div className="absolute inset-0 retro-grid pointer-events-none" />
 
            {/* Split Stage for AI Hosts */}
            <div className="flex-1 grid grid-cols-2 gap-2 relative">
              
              {/* EXPERT AI (LEFT) */}
              <div className="relative flex flex-col items-center justify-end overflow-hidden border-r border-neutral-800 group">
                
                {/* Yellow name tag */}
                <div className="absolute top-4 left-4 z-20 px-2 py-1 bg-yellow-500 text-black font-extrabold text-[10px] uppercase shadow">
                  {catState === "user-speaking" 
                    ? "LISTENING..." 
                    : catState === "thinking" 
                    ? "THINKING..." 
                    : "EXPERT AI"}
                </div>
 
                {/* Background soundwaves (Only if Alexis is talking & user isn't typing) */}
                {catState === "expert-speaking" && (
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-0">
                    <div className="flex items-center gap-1.5 w-full justify-center opacity-60">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span key={i} className="retro-wave-bar" />
                      ))}
                    </div>
                  </div>
                )}
 
                {/* Host Image Wrapper */}
                <div className="relative z-10 w-[90%] max-w-[280px] h-[90%] flex items-end">
                  <img
                    src={
                      catState === "thinking"
                        ? "/cat3.png"
                        : catState === "user-speaking"
                        ? "/cat.png"
                        : "/cat1.png"
                    }
                    alt="Alexis Cat"
                    className={`w-full h-auto object-contain transition-all duration-300 ${
                      catState === "user-speaking"
                        ? "filter-none animate-none"
                        : catState === "thinking"
                        ? "filter-none animate-pulse"
                        : catState === "expert-speaking"
                        ? "filter-none animate-vibrate"
                        : "filter grayscale contrast-75 brightness-75 opacity-70 animate-none"
                    }`}
                  />
                </div>
              </div>
 
              {/* CO-HOST AI (RIGHT) */}
              <div className="relative flex flex-col items-center justify-end overflow-hidden group">
                
                {/* Grey/White name tag */}
                <div className="absolute top-4 right-4 z-20 px-2 py-1 bg-neutral-400 text-black font-extrabold text-[10px] uppercase shadow">
                  {catState === "user-speaking" 
                    ? "LISTENING..." 
                    : catState === "thinking" 
                    ? "THINKING..." 
                    : "CO-HOST AI"}
                </div>
 
                {/* Background soundwaves (Only if Julia is talking & user isn't typing) */}
                {catState === "cohost-speaking" && (
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-0">
                    <div className="flex items-center gap-1.5 w-full justify-center opacity-60">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span key={i} className="retro-wave-bar" />
                      ))}
                    </div>
                  </div>
                )}
 
                {/* Host Image Wrapper */}
                <div className="relative z-10 w-[90%] max-w-[280px] h-[90%] flex items-end">
                  <img
                    src={
                      catState === "thinking"
                        ? "/cat4.png"
                        : catState === "user-speaking"
                        ? "/cat.png"
                        : "/cat2.png"
                    }
                    alt="Julia Cat"
                    className={`w-full h-auto object-contain transition-all duration-300 ${
                      catState === "user-speaking"
                        ? "filter-none animate-none"
                        : catState === "thinking"
                        ? "filter-none animate-pulse"
                        : catState === "cohost-speaking"
                        ? "filter-none animate-vibrate"
                        : "filter grayscale contrast-75 brightness-75 opacity-70 animate-none"
                    }`}
                  />
                </div>
              </div>
 
              {/* Studio Microphone Decoration in Center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 pointer-events-none z-20 w-16 h-28 flex flex-col items-center">
                <svg className="w-12 h-20 text-neutral-800 drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]" viewBox="0 0 24 24" fill="currentColor">
                  {/* Microphone stand & grid retro visual */}
                  <path d="M12 2c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3s3-1.34 3-3V5c0-1.66-1.34-3-3-3zm5 9c0 2.5-1.9 4.6-4.4 4.9V19h3v2H8v-2h3v-3.1C8.4 15.6 6.5 13.5 6.5 11H8c0 2.2 1.8 4 4 4s4-1.8 4-4h1.5z" />
                </svg>
                {/* Small neon banner */}
                <div className="px-1.5 py-0.5 border border-white bg-black text-white font-extrabold text-[8px] tracking-wider uppercase animate-pulse mt-1 shadow">
                  PODIFY LIVE
                </div>
              </div>
 
              {/* Pixel Art Props ( Mug, TV, Plant in 8-bit Mockup) */}
              <div className="absolute bottom-2 left-2 z-20 text-lg pointer-events-none opacity-80">🪴</div>
              <div className="absolute bottom-2 right-2 z-20 text-lg pointer-events-none opacity-80">📺</div>
            </div>
 
            {/* Stage Footer Dialogue Box (Shows current conversation turns) */}
            <div className="px-4 py-3 bg-black border-t-2 border-white max-h-[105px] overflow-y-auto flex flex-col gap-2 font-mono">
              {turns.slice(-2).map((turn, index) => {
                const isExpert = turn.speaker === "expert";
                const isCohost = turn.speaker === "cohost";
                return (
                  <div key={index} className="flex gap-2">
                    <span
                      className={`font-extrabold flex-shrink-0 uppercase px-1 text-[10px] rounded ${
                        isExpert
                          ? "bg-yellow-500 text-black"
                          : isCohost
                          ? "bg-neutral-300 text-black"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {isExpert ? "Alexis" : isCohost ? "Julia" : "You"}:
                    </span>
                    <p className={`text-[11px] ${isExpert ? "text-yellow-100/90" : isCohost ? "text-neutral-300" : "text-blue-100"}`}>
                      {turn.content}
                    </p>
                  </div>
                );
              })}
              {turns.length === 0 && (
                <div className="text-slate-600 text-[10px] text-center py-2 italic blink-cursor">
                  Establishing network frequency...
                </div>
              )}
            </div>
          </section>
 
          {/* Interactive Input Section */}
          <section className="border-4 border-double border-white bg-black p-4 flex flex-col gap-2">
            <form onSubmit={handleSendText} className="flex gap-2 relative items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask Alexis & Julia a question..."
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                  interruptPodcast();
                  if (isListeningRef.current && recognitionRef.current) {
                    shouldSubmitOnEndRef.current = false;
                    recognitionRef.current.stop();
                  }
                }}
                onFocus={() => {
                  interruptPodcast();
                  if (isListeningRef.current && recognitionRef.current) {
                    shouldSubmitOnEndRef.current = false;
                    recognitionRef.current.stop();
                  }
                }}
                onBlur={() => {
                  if (!userInput.trim() && !isInterruptionResponse) setCatState("idle");
                }}
                disabled={loading}
                className="flex-1 pl-4 pr-10 py-3 rounded-lg border border-neutral-700 bg-neutral-900 text-xs placeholder-slate-600 text-slate-200 font-mono focus:outline-none focus:border-white focus:bg-neutral-800 transition-all"
              />
              
              <span className="absolute right-24 text-slate-600 pointer-events-none text-sm">⌨</span>

              {/* Microphone/Voice Trigger */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`px-3.5 py-3 rounded-lg border transition-colors cursor-pointer ${
                  isListening
                    ? "animate-record"
                    : "bg-transparent border-neutral-700 text-neutral-400 hover:text-white hover:border-white"
                }`}
                title={isListening ? "Stop listening and interject" : "Speak to interject"}
              >
                🎙
              </button>

              <button
                type="submit"
                disabled={loading || !userInput.trim()}
                className="px-4 py-3 border-2 border-white bg-transparent hover:bg-white hover:text-black disabled:border-neutral-800 disabled:text-neutral-600 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer"
              >
                SEND →
              </button>
            </form>
            <p className="text-[9px] text-slate-500 text-center select-none leading-none mt-1">
              You can also press <span className="text-white font-bold px-1 bg-white/5 border border-white/10 rounded">[SPACE]</span> to focus and interject.
            </p>
          </section>
        </main>

        {/* ================= RIGHT COLUMN (TRANSCRIPT) ================= */}
        <aside className={`col-span-1 md:col-span-1 flex flex-col gap-4 overflow-hidden h-full ${
          mobileTab === "transcript" ? "flex" : "hidden md:flex"
        }`}>
          {/* Live Transcript Log Panel */}
          <section className="border-4 border-double border-white bg-black p-4 flex-1 flex flex-col min-h-[250px]">
            <h2 className="text-xs font-extrabold text-white uppercase border-b border-neutral-800 pb-1.5 tracking-wider mb-2.5">
              [ LIVE TRANSCRIPT ]
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-mono">
              {turns.map((turn, index) => {
                const isExpert = turn.speaker === "expert";
                const isCohost = turn.speaker === "cohost";
                const mockTime = `00:${index.toString().padStart(2, "0")}`;

                return (
                  <div key={index} className="space-y-1 animate-fadeIn">
                    <div className="flex items-center justify-between text-[9px] text-slate-500">
                      <span className={`font-bold uppercase tracking-wider ${
                        isExpert ? "text-yellow-500" : isCohost ? "text-neutral-400" : "text-blue-400"
                      }`}>
                        {isExpert ? "Alexis (Expert AI)" : isCohost ? "Julia (Co-Host)" : "You (Listener)"}
                      </span>
                      <span>{mockTime}</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed border-l-2 pl-2 ${
                      isExpert 
                        ? "text-yellow-100/80 border-yellow-500" 
                        : isCohost 
                        ? "text-neutral-300 border-neutral-500" 
                        : "text-blue-100/90 border-blue-500"
                    }`}>
                      {turn.content}
                    </p>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
            
            <button
              onClick={() => {
                transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-2.5 w-full py-1.5 border-2 border-white bg-transparent text-[10px] text-white font-bold hover:bg-white hover:text-black transition-all cursor-pointer"
            >
              SHOW FULL TRANSCRIPT
            </button>
          </section>
        </aside>
      </div>

    </div>
  );
}
