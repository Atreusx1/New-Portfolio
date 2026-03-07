# Portfolio Setup & Customization Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## 🎨 Features Implemented

### Three.js & 3D Effects
1. **Particle Canvas** (`src/components/Canvas3D.tsx`)
   - Interactive mouse-tracking particle system
   - Real-time gradient effects
   - Cursor glow effect
   - Optimized with requestAnimationFrame

2. **Floating Particles** (`src/components/FloatingParticles.tsx`)
   - Background ambient particles
   - Animated movement and colors
   - Fixed position background layer

### Scroll Animations
1. **Intersection Observer Based** - Elements animate in as they enter viewport
2. **Smooth Scroll Behavior** - Navigation scrolls smoothly to sections
3. **Staggered Animations** - Delays create cascading effects
4. **Transform Animations** - Slide, fade, and scale effects

### Key Components

```
src/
├── App.tsx                     # Main component - handles routing & scroll detection
├── components/
│   ├── Navigation.tsx          # Fixed header with smooth scroll
│   ├── Hero.tsx                # Typewriter effect + particle canvas
│   ├── About.tsx               # Bio with stats and animated cards
│   ├── Projects.tsx            # 3D tilt cards with filters
│   ├── Skills.tsx              # Categorized tech stack
│   ├── Experience.tsx          # Timeline with hover effects
│   ├── Contact.tsx             # Contact form and social links
│   ├── Canvas3D.tsx            # Interactive particle system
│   └── FloatingParticles.tsx   # Background particles
├── data/
│   ├── projects.ts             # 8 project entries with categories
│   └── constants.ts            # Resume, skills, experience data
└── index.css                   # Global styles, animations, gradients
```

## 🎯 Customization Areas

### 1. Update Your Information

Edit `/src/data/constants.ts`:
```typescript
export const RESUME = {
  name: 'Your Name',
  title: 'Your Title',
  bio: 'Your bio',
  email: 'your@email.com',
  github: 'https://github.com/yourprofile',
  linkedin: 'https://linkedin.com/in/yourprofile',
  twitter: 'https://twitter.com/yourhandle',
};
```

### 2. Update Projects

Edit `/src/data/projects.ts`:
```typescript
{
    id: 1,
    title: 'Your Project Title',
    description: 'Project description here',
    technologies: ['React', 'Three.js', 'TypeScript'],
    category: 'web', // or 'blockchain', 'fullstack', 'build-tools'
    github: 'https://github.com/...',
    live: 'https://example.com',
},
```

### 3. Update Skills

Edit `/src/data/constants.ts`:
```typescript
export const SKILLS = {
  frontend: ['React', 'Vue', ...],
  backend: ['Node.js', 'Python', ...],
  blockchain: ['Solidity', ...],
  tools: ['Git', 'Docker', ...],
};
```

### 4. Color Customization

The color scheme uses cyan/blue gradients. To change:

**Edit `/src/index.css`:**
- Look for `rgba(0, 217, 255, ...)` (cyan primary)
- Look for `rgba(0, 153, 255, ...)` (blue secondary)
- Replace with your preferred colors

**Edit gradients in components:**
- Search for `bg-gradient-to-r from-cyan-500 to-blue-500`
- Replace with your color classes

### 5. Typography

Fonts are imported from Google Fonts in `src/index.css`:
- **Heading Font**: Space Mono (monospace)
- **Body Font**: Inter (sans-serif)

To change, update the `@import` URL and modify `tailwind.config.js`:
```javascript
fontFamily: {
  'mono': ['Your Font', 'monospace'],
  'sans': ['Your Font', 'sans-serif'],
},
```

## 🎬 Animation Customization

### Global Animations
Edit `src/index.css` `@keyframes` section:
- `glow` - Text glowing effect
- `float` - Floating animation
- `slideInLeft/Right` - Slide animations
- `fadeInUp` - Fade up animation

### Canvas Particle Speed
Edit `src/components/Canvas3D.tsx`:
```typescript
const speed = Math.random() * 3 + 1; // Change 3 to increase/decrease speed
```

### Floating Particle Count
Edit `src/components/FloatingParticles.tsx`:
```typescript
for (let i = 0; i < 50; i++) { // Change 50 for more/less particles
```

## 📱 Responsive Breakpoints

The project uses Tailwind CSS breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Most components already have responsive classes (e.g., `text-lg md:text-xl lg:text-2xl`)

## 🚀 Performance Optimization

Already implemented:
1. ✅ Lazy loading with Intersection Observer
2. ✅ Canvas-based particles (no DOM nodes)
3. ✅ requestAnimationFrame for smooth animations
4. ✅ Event delegation
5. ✅ Optimized component renders

For further optimization:
- Use `React.memo()` for expensive components
- Implement code-splitting with `React.lazy()`
- Use Web Workers for heavy computations

## 🔗 Deployment Checklist

Before deploying:
- [ ] Update all personal information in `/src/data/constants.ts`
- [ ] Add your actual projects to `/src/data/projects.ts`
- [ ] Update social media links
- [ ] Test on mobile devices
- [ ] Check all links work correctly
- [ ] Compress images if needed
- [ ] Run `pnpm build` and verify output

### Deploy Commands

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
- Connect GitHub repo
- Build command: `pnpm build`
- Publish directory: `dist`

**GitHub Pages:**
```bash
pnpm build
git add dist
git commit -m "Deploy"
git subtree push --prefix dist origin gh-pages
```

## 🐛 Troubleshooting

### Animations not smooth
- Check browser dev tools for performance issues
- Reduce particle count in FloatingParticles.tsx
- Ensure hardware acceleration is enabled

### Tailwind classes not applying
- Check class names are spelled correctly
- Verify file paths in tailwind.config.js content
- Rebuild with `pnpm dev`

### Canvas effects not visible
- Check browser console for errors
- Verify WebGL is supported
- Try disabling browser extensions

## 📚 Resources

- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Three.js](https://threejs.org)
- [Framer Motion](https://www.framer.com/motion)

## 🎓 Learning Resources

The codebase includes examples of:
- React hooks (useState, useEffect, useRef, useCallback)
- TypeScript interfaces and types
- Canvas API for 2D graphics
- Intersection Observer API
- CSS animations and gradients
- Tailwind CSS utilities
- Component composition patterns

---

Happy customizing! 🚀
