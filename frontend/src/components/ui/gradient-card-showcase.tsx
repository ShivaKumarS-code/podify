import React from 'react';

const cards = [
  {
    title: 'AI Podcast Hosts',
    desc: 'Our friendly AI hosts read your documents and discuss them in a natural conversation. They explain difficult ideas and break down tricky concepts so they are easy to understand.',
    gradientFrom: '#ffbc00',
    gradientTo: '#ff0058',
  },
  {
    title: 'Ask Questions Live',
    desc: 'Interrupt the hosts at any time to ask questions or request examples. The hosts will pause their chat and answer you immediately in real-time.',
    gradientFrom: '#03a9f4',
    gradientTo: '#ff0058',
  },
  {
    title: 'Upload Any File',
    desc: 'Upload textbooks, articles, or notes. The system quickly scans the text to build your personalized audio show.',
    gradientFrom: '#a855f7',
    gradientTo: '#ec4899',
  },
  {
    title: 'Choose Your Speed',
    desc: 'Choose how detailed you want the conversation to be. Beginner mode uses daily examples, while Advanced mode goes deeper into the details.',
    gradientFrom: '#4dff03',
    gradientTo: '#00d0ff',
  },
];

export default function SkewCards() {
  return (
    <>
      <div className="flex justify-center items-center flex-wrap gap-x-12 gap-y-16 py-10">
        {cards.map(({ title, desc, gradientFrom, gradientTo }, idx) => (
          <div
            key={idx}
            className="group relative w-[300px] h-[380px] transition-all duration-500"
          >
            {/* Skewed gradient panels */}
            <span
              className="absolute top-0 left-[50px] w-1/2 h-full rounded-lg transform skew-x-[15deg] transition-all duration-500 group-hover:skew-x-0 group-hover:left-[20px] group-hover:w-[calc(100%-90px)]"
              style={{
                background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})`,
              }}
            />
            <span
              className="absolute top-0 left-[50px] w-1/2 h-full rounded-lg transform skew-x-[15deg] blur-[30px] transition-all duration-500 group-hover:skew-x-0 group-hover:left-[20px] group-hover:w-[calc(100%-90px)]"
              style={{
                background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})`,
              }}
            />

            {/* Animated blurs */}
            <span className="pointer-events-none absolute inset-0 z-10">
              <span className="absolute top-0 left-0 w-0 h-0 rounded-lg opacity-0 bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] shadow-[0_5px_15px_rgba(0,0,0,0.08)] transition-all duration-100 animate-blob group-hover:top-[-50px] group-hover:left-[50px] group-hover:w-[100px] group-hover:h-[100px] group-hover:opacity-100" />
              <span className="absolute bottom-0 right-0 w-0 h-0 rounded-lg opacity-0 bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] shadow-[0_5px_15px_rgba(0,0,0,0.08)] transition-all duration-500 animate-blob animation-delay-1000 group-hover:bottom-[-50px] group-hover:right-[50px] group-hover:w-[100px] group-hover:h-[100px] group-hover:opacity-100" />
            </span>

            {/* Content */}
            <div className="relative z-20 left-0 p-[25px_30px] bg-[rgba(255,255,255,0.03)] border border-white/5 backdrop-blur-[10px] shadow-lg rounded-lg text-white transition-all duration-500 group-hover:left-[-25px] group-hover:p-[50px_30px] h-full flex flex-col justify-start">
              <h2 className="text-2xl font-bold uppercase tracking-wider mb-3 font-mono">{title}</h2>
              <p className="text-sm text-neutral-300 leading-relaxed uppercase font-mono">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tailwind custom utilities for animation */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translateY(10px); }
          50% { transform: translate(-10px); }
        }
        .animate-blob { animation: blob 2s ease-in-out infinite; }
        .animation-delay-1000 { animation-delay: -1s; }
      `}</style>
    </>
  );
}
