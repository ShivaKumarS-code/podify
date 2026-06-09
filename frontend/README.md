# Podify Frontend Client

This is the Next.js frontend client for the **Podify** AI podcast platform. It is built using React 19, Next.js 16 App Router, Tailwind CSS, TypeScript, and Framer Motion.

## 🎨 Design System & Custom UI Components

The client incorporates several interactive, premium visual components:

1. **Equalizer Soundwave Visualizer**:
   - Anchored at the base of the Hero section, this visualizer generates staggered, pulsing bars to represent document audio generation pipelines.
2. **Gradient Showcase (`gradient-card-showcase.tsx`)**:
   - Renders 3D-perspective shifting feature cards using vanilla CSS transformations, absolute borders, and custom linear gradients.
3. **Circular Flip Card Gallery (`circular-flip-card-gallery.tsx`)**:
   - An 8-step pipeline visualization where cards rotate in 3D orbit around the central logo. Hovering cards scales and flips them 180 degrees.
4. **Interactive Masked Hover-Footer (`hover-footer.tsx`)**:
   - Features SVG mask rendering that tracks the user's cursor. Hovering on `PODIFY` reveals an dynamic HSL multi-stop gradient path. Includes a personalized **Contact Me** column with GitHub, LinkedIn, and email nodes.

---

## 🛠️ Setup & Running

From the `/frontend` directory:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
3. **Build Bundle**:
   ```bash
   npm run build
   ```

---

## 📂 Codebase Architecture

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css         # Tailwind style configuration
│   │   ├── layout.tsx          # Root HTML layout and fonts
│   │   ├── page.tsx            # Main landing page route
│   │   └── dashboard/          # Dashboard page for document uploads
│   └── components/
│       └── ui/
│           ├── animated-landing-page.tsx      # Main Landing layout
│           ├── gradient-card-showcase.tsx     # Perspective cards grid
│           ├── circular-flip-card-gallery.tsx  # Rotating pipeline gallery
│           └── hover-footer.tsx              # Masked color-reveal footer
├── package.json
└── tailwind.config.ts
```
