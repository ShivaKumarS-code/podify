"use client"

import React, { useState, useEffect, useRef } from "react"

// A simple utility for conditional class names
const cn = (...classes: (string | undefined | null | boolean)[]) => classes.filter(Boolean).join(" ")

// --- Card Data ---
const cardData = [
  {
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop&crop=center",
    title: "01. Drop Files",
    description: "Upload PDFs, textbooks, or documents to the system.",
  },
  {
    image: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=400&h=600&fit=crop&crop=center",
    title: "02. AI Analysis",
    description: "Our system parses the text and extracts core arguments.",
  },
  {
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=600&fit=crop&crop=center",
    title: "03. Draft Script",
    description: "AI hosts compose a structured dialogue script.",
  },
  {
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=600&fit=crop&crop=center",
    title: "04. Cast Hosts",
    description: "Choose AI host personas Alex and Sophia.",
  },
  {
    image: "https://images.unsplash.com/photo-1484755560695-a4c748721c85?w=400&h=600&fit=crop&crop=center",
    title: "05. Voice Synthesis",
    description: "Generate highly human-like voice synthesis.",
  },
  {
    image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=600&fit=crop&crop=center",
    title: "06. Stream Show",
    description: "Listen to your custom show immediately.",
  },
  {
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=600&fit=crop&crop=center",
    title: "07. Click to Ask",
    description: "Pause hosts to ask a clarifying question.",
  },
  {
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=600&fit=crop&crop=center",
    title: "08. Real-Time QA",
    description: "Hosts answer immediately and resume show.",
  },
];

interface FlipCardProps {
  image: string
  title: string
  description: string
  className?: string
  style?: React.CSSProperties
}

// --- FlipCard Component ---
function FlipCard({ image, title, description, className, style }: FlipCardProps) {
  return (
    <div
      className={cn(
        "group w-24 h-32 md:w-28 md:h-36 rounded-xl [perspective:1000px] transition-transform duration-300 ease-in-out hover:scale-110",
        className,
      )}
      style={style}
    >
      <div className="relative w-full h-full rounded-xl shadow-lg transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* Front side - Title and Description */}
        <div className="absolute inset-0 rounded-xl bg-neutral-900 border border-neutral-700 flex flex-col items-center justify-center p-3 text-center [backface-visibility:hidden]">
          <h3 className="font-bold text-[10px] md:text-xs text-neutral-100 mb-1 text-balance font-mono uppercase leading-tight">{title}</h3>
          <p className="text-[8px] md:text-[10px] text-neutral-400 text-pretty leading-snug font-mono uppercase">{description}</p>
        </div>
        {/* Back side - Image */}
        <div className="absolute inset-0 rounded-xl [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <img
            src={image || "https://placehold.co/400x600/0a0a0a/333333?text=Image"}
            alt={title}
            className="w-full h-full object-cover rounded-xl border border-neutral-700"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "https://placehold.co/400x600/0a0a0a/333333?text=Image";
            }}
          />
        </div>
      </div>
    </div>
  )
}

// --- Main Component (Circular Gallery) ---
export default function CircularGallery() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(0)
  const [rotation, setRotation] = useState(0)

  // Effect for responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (galleryRef.current) {
        const gallerySize = galleryRef.current.offsetWidth
        setSize(gallerySize)
      }
    }

    updateSize() // Initial size

    const resizeObserver = new ResizeObserver(updateSize)
    if (galleryRef.current) {
      resizeObserver.observe(galleryRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Effect for animation loop
  useEffect(() => {
    let animationFrameId: number
    const animate = () => {
      setRotation((prevRotation) => prevRotation + 0.002) // Slow rotation
      animationFrameId = requestAnimationFrame(animate)
    }
    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  const radius = size * 0.38 // Position radius
  const centerX = size / 2
  const centerY = size / 2

  return (
    <div
      ref={galleryRef}
      className="relative w-full max-w-[340px] sm:max-w-[480px] md:max-w-[560px] aspect-square flex items-center justify-center mx-auto"
    >
      {/* Central text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-4 text-center">
        <h3 className="text-base sm:text-xl md:text-2xl font-extrabold text-white text-balance mb-1.5 font-mono uppercase tracking-wider leading-tight [text-shadow:0_4px_10px_rgba(0,0,0,0.8)]">
          How Podify Works
        </h3>
        <p className="text-[8px] sm:text-[10px] text-neutral-400 uppercase tracking-widest font-mono">
          Hover to trace pipeline
        </p>
      </div>

      {/* Circular arrangement of cards */}
      {size > 0 &&
        cardData.map((card, index) => {
          const angle = (index / cardData.length) * 2 * Math.PI - Math.PI / 2 + rotation
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)

          return (
            <FlipCard
              key={index}
              {...card}
              className="absolute hover:z-20"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: `translate(-50%, -50%) rotate(${(angle + Math.PI / 2) * (180 / Math.PI)}deg)`,
              }}
            />
          )
        })}
    </div>
  )
}
