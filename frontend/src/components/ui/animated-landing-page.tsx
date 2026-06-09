import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SkewCards from "@/components/ui/gradient-card-showcase";
import CircularGallery from "@/components/ui/circular-flip-card-gallery";
import HoverFooter from "@/components/ui/hover-footer";
import { authClient } from "@/lib/auth/client";

// Custom hook to trigger scroll animations
function useIntersectionObserver() {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return [ref, isIntersecting] as const;
}

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

function ScrollReveal({ children, delay = 0, className = "" }: ScrollRevealProps) {
  const [ref, isIntersecting] = useIntersectionObserver();

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) transform ${
        isIntersecting ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-[0.98]"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}


export function PodifyHeroAnimated() {
  // Symmetric pillar heights (percent). Tall at edges, low at center.
  const pillars = [92, 84, 78, 70, 62, 54, 46, 34, 18, 34, 46, 54, 62, 70, 78, 84, 92];

  const techStack = [
    {
      name: "Google Gemini",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#4c8bf5]">
          <path d="M12 2c0 5.523-4.477 10-10 10 5.523 0 10 4.477 10 10 0-5.523 4.477-10 10-10-5.523 0-10-4.477-10-10z" />
        </svg>
      ),
    },
    {
      name: "LangGraph",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#e38c35]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <line x1="10" y1="7" x2="7.5" y2="15.5" />
          <line x1="14" y1="7" x2="16.5" y2="15.5" />
          <line x1="8.5" y1="18" x2="15.5" y2="18" />
        </svg>
      ),
    },
    {
      name: "FastAPI",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#009688]">
          <path d="M19 10h-6l2.5-9L5 14h6l-2.5 9z" />
        </svg>
      ),
    },
    {
      name: "Next.js",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 17V7l7 10V7" />
        </svg>
      ),
    },
    {
      name: "TailwindCSS",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#38bdf8]">
          <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 2.4-3.2 4.4-2.4 6 0 1.2 2.4 2.8 4 6 4 3.2 0 5.2-1.6 6-4.8-2.4 3.2-4.4 2.4-6 0zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 2.4-3.2 4.4-2.4 6 0 1.2 2.4 2.8 4 6 4 3.2 0 5.2-1.6 6-4.8-2.4 3.2-4.4 2.4-6 0z" />
        </svg>
      ),
    },
    {
      name: "PostgreSQL",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#336791]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      ),
    },
    {
      name: "Groq",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#f15a24]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="15" x2="23" y2="15" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="15" x2="4" y2="15" />
        </svg>
      ),
    },
    {
      name: "Llama 3.2",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#a855f7]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 7 L6 2 L10 5" />
          <path d="M16 7 L18 2 L14 5" />
          <path d="M9 13 V18 A3 3 0 0 0 15 18 V13" />
          <path d="M8 8 C8 8, 7 11, 9 13 M16 8 C16 8, 17 11, 15 13" />
          <path d="M10 17 H14 M12 17 V19" />
        </svg>
      ),
    },
  ];

  // State to trigger animations once the component is mounted.
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const user = session?.user;

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);



  return (
    <>
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes subtlePulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.03);
          }
        }

        @keyframes driftSphere {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(40px, -60px) scale(1.15);
          }
          66% {
            transform: translate(-30px, 30px) scale(0.9);
          }
        }

        @keyframes soundwaveBar {
          0% {
            transform: scaleY(0.2);
          }
          100% {
            transform: scaleY(1.0);
          }
        }

        @keyframes eqPulse {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(0.45);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.15;
          }
          50% {
            opacity: 0.35;
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .hover-float {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hover-float:hover {
          transform: translateY(-8px);
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 255, 255, 0.02);
        }

        .glow-sphere {
          position: absolute;
          pointer-events: none;
          z-index: 0;
          border-radius: 50%;
          filter: blur(130px);
          animation: driftSphere 12s ease-in-out infinite alternate;
        }
        
        .eq-bar {
          transform-origin: bottom;
          animation: eqPulse 2s ease-in-out infinite alternate;
        }
      `}</style>

      <div className="relative min-h-screen bg-black text-white font-mono overflow-y-auto overflow-x-hidden scroll-smooth">
        {/* ================== HERO CONTAINER ================== */}
        <section className="relative isolate h-screen flex flex-col justify-between overflow-hidden">
          {/* ================== BACKGROUND ================== */}
          <div
            aria-hidden
            className="absolute inset-0 -z-30"
            style={{
              backgroundImage: [
                "radial-gradient(80% 55% at 50% 52%, rgba(252,166,154,0.35) 0%, rgba(214,76,82,0.36) 27%, rgba(61,36,47,0.28) 47%, rgba(39,38,67,0.35) 60%, rgba(8,8,12,0.92) 78%, rgba(0,0,0,1) 88%)",
                "radial-gradient(85% 60% at 14% 0%, rgba(255,193,171,0.50) 0%, rgba(233,109,99,0.45) 30%, rgba(48,24,28,0.0) 64%)",
                "radial-gradient(70% 50% at 86% 22%, rgba(88,112,255,0.30) 0%, rgba(16,18,28,0.0) 55%)",
                "linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0) 40%)",
              ].join(","),
              backgroundColor: "#000",
            }}
          />

          {/* Vignette corners for extra contrast */}
          <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_60%,rgba(0,0,0,0.85))]" />

          {/* Grid overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 mix-blend-screen opacity-20"
            style={{
              backgroundImage: [
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 96px)",
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px)",
                "repeating-radial-gradient(80% 55% at 50% 52%, rgba(255,255,255,0.08) 0 1px, transparent 1px 120px)"
              ].join(","),
              backgroundBlendMode: "screen",
            }}
          />

          {/* ================== NAV ================== */}
          <header className="relative z-30 border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="w-full flex items-center justify-center px-8 md:px-12 py-3.5 relative">
              
              {/* Center Group: Nav Links + Logo */}
              <div className="flex items-center gap-10 lg:gap-14">
                {/* Left Nav links */}
                <nav className="hidden md:flex items-center gap-10 text-sm text-white/70 uppercase tracking-wider font-medium">
                  <a className="hover:text-white transition-colors" href="#features">Features</a>
                </nav>

                {/* Center Logo */}
                <div className="flex items-center justify-center">
                  <span className="text-3xl font-extrabold tracking-widest text-white uppercase select-none">PODIFY.EXE</span>
                </div>

                {/* Right Nav links */}
                <nav className="hidden md:flex items-center gap-10 text-sm text-white/70 uppercase tracking-wider font-medium">
                  <a className="hover:text-white transition-colors" href="#how-it-works">How it Works</a>
                </nav>
              </div>

              {/* Far Right Corner Action / Mobile Toggle */}
              <div className="absolute right-8 md:right-12 flex items-center">
                {user ? (
                  <span className="hidden md:block text-sm uppercase tracking-wider text-neutral-300 font-mono">
                    Welcome, {user.name || user.email.split('@')[0]}! 😁
                  </span>
                ) : (
                  <Link 
                    href="/dashboard" 
                    className="hidden md:block rounded-full border border-white/20 px-5 py-2 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:border-white transition-colors font-medium"
                  >
                    Sign in
                  </Link>
                )}

                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                  className="md:hidden rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm uppercase tracking-wider transition-colors hover:bg-white/10 ml-4 md:ml-0"
                >
                  {isMobileMenuOpen ? "Close" : "Menu"}
                </button>
              </div>
            </div>

            {/* Mobile menu dropdown panel */}
            {isMobileMenuOpen && (
              <div className="md:hidden absolute top-full left-0 right-0 border-b border-white/10 bg-black/95 backdrop-blur-md p-6 flex flex-col gap-6 z-50 animate-fadeInUp">
                <nav className="flex flex-col gap-4 text-sm text-white/70 uppercase tracking-wider font-medium">
                  <a onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors" href="#features">Features</a>
                  <a onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition-colors" href="#how-it-works">How it Works</a>
                </nav>
                <div className="h-px bg-white/10" />
                <div className="flex flex-col gap-3">
                  {user ? (
                    <span className="w-full text-center text-sm uppercase tracking-wider text-neutral-300 font-mono py-2">
                      Welcome, {user.name || user.email.split('@')[0]}! 😁
                    </span>
                  ) : (
                    <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard" className="w-full text-center rounded-full border border-white/20 px-4 py-2.5 text-sm uppercase tracking-wider text-white/85 hover:text-white hover:border-white transition-colors">
                      Sign in
                    </Link>
                  )}
                </div>
              </div>
            )}
          </header>

          {/* ================== COPY ================== */}
          <div className="relative z-10 mx-auto grid w-full max-w-6xl place-items-center px-6 py-6 md:py-8 my-auto">
            <div className={`mx-auto text-center ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs uppercase tracking-wider text-white/70 ring-1 ring-white/10 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" /> AI-powered interactive podcasts
              </span>
              
              <h1 style={{ animationDelay: '200ms' }} className={`mt-6 text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl ${isMounted ? 'animate-fadeInUp' : 'opacity-0'} uppercase max-w-5xl mx-auto leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-red-200 to-indigo-300`}>
                Transform your documents into interactive podcasts
              </h1>
              
              <p style={{ animationDelay: '300ms' }} className={`mx-auto mt-6 max-w-3xl text-neutral-400 text-sm md:text-base lg:text-lg leading-relaxed uppercase`}>
                Upload textbooks, research papers, or manuals, and listen as our AI hosts hold a conversational debate. Ask questions and interject in real time to shape the show.
              </p>
              
              <div style={{ animationDelay: '400ms' }} className={`mt-6 flex flex-col items-center justify-center gap-5 sm:flex-row ${isMounted ? 'animate-fadeInUp' : 'opacity-0'}`}>
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-none border-2 border-white bg-white px-8 py-4 text-sm font-bold uppercase text-black tracking-widest transition hover:bg-transparent hover:text-white cursor-pointer shadow-lg shadow-white/5">
                  Start Listening
                </Link>
              </div>
            </div>
          </div>

          {/* ================== TECH STACK ================== */}
          <div className="relative z-10 mx-auto mt-auto w-full max-w-6xl px-6 pb-10 md:pb-12 text-center">
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-4 font-bold">
              Powered By
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-60 justify-items-center">
              {techStack.map((tech) => (
                <div key={tech.name} className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/85 font-medium hover:text-white transition-colors duration-200">
                  {tech.icon}
                  <span>{tech.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ================== FOREGROUND ================== */}
          {/* Center-bottom rectangular glow with pulse animation */}
          <div
            className="pointer-events-none absolute bottom-[128px] left-1/2 z-0 h-32 w-24 -translate-x-1/2 rounded-md bg-gradient-to-b from-white/40 via-red-200/20 to-transparent"
            style={{ animation: 'subtlePulse 6s ease-in-out infinite' }}
          />

          {/* Stepped pillars silhouette */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[45vh]">
            {/* dark fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent" />
            {/* bars */}
            <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-px px-[2px]">
              {pillars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-black transition-all duration-1000 ease-in-out eq-bar"
                  style={{
                    height: isMounted ? `${h}%` : '0%',
                    transitionDelay: `${Math.abs(i - Math.floor(pillars.length / 2)) * 60}ms`,
                    animationDuration: `${2.2 + (i % 5) * 0.3}s`,
                    animationDelay: `${i * 80}ms`
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================== FEATURES SECTION ================== */}
        <section id="features" className="relative z-10 border-t border-white/10 bg-black/60 backdrop-blur-md px-6 py-24 md:py-32 overflow-hidden">
          {/* Background glowing spheres */}
          <div className="glow-sphere absolute left-[-15%] top-[10%] w-[500px] h-[500px] bg-red-500/10" />
          <div className="glow-sphere absolute right-[-15%] bottom-[10%] w-[600px] h-[600px] bg-blue-500/10" />

          <div className="mx-auto max-w-6xl relative z-10">
            <ScrollReveal>
              <div className="mb-16 text-center md:text-left">
                <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl uppercase">
                  Features
                </h2>
                <p className="mt-4 max-w-2xl text-neutral-400 text-sm md:text-base uppercase">
                  Simple tools to help you learn by listening
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <SkewCards />
            </ScrollReveal>
          </div>
        </section>

        {/* ================== HOW IT WORKS SECTION ================== */}
        <section id="how-it-works" className="relative z-10 border-t border-white/10 bg-black/80 backdrop-blur-md px-6 py-24 md:py-32 overflow-hidden">
          <div className="glow-sphere absolute left-[40%] top-[20%] w-[600px] h-[600px] bg-purple-500/10" />
          
          <div className="mx-auto max-w-6xl relative z-10">
            <ScrollReveal>
              <div className="mb-16 text-center md:text-left">
                <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl uppercase">
                  How It Works
                </h2>
                <p className="mt-4 max-w-2xl text-neutral-400 text-sm md:text-base uppercase">
                  Three simple steps to start listening
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <CircularGallery />
            </ScrollReveal>
          </div>
        </section>


        {/* ================== FOOTER ================== */}
        <HoverFooter />
      </div>
    </>
  );
}
