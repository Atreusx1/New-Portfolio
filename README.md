# Hyperliquid Portfolio Website

A stunning, modern portfolio website built with **Vite**, **React**, **TypeScript**, and **Three.js** featuring:

- 🎨 Hyperliquid-inspired design with cyan and blue gradients
- ✨ Interactive 3D canvas effects with particle systems
- 🎬 Smooth scroll animations using Framer Motion
- 🎯 Responsive design for all screen sizes
- ⚡ Optimized performance with Vite bundler
- 🎭 3D card tilt effects on project showcase
- 🌊 Floating particle background animations

## Features

### 🎨 Design
- Dark gradient aesthetic inspired by Hyperfoundation
- Cyan/Blue color scheme with neon accents
- Smooth glassmorphism effects
- Custom scrollbar styling

### 🚀 Performance
- Lazy loading of sections
- Optimized animations with requestAnimationFrame
- Canvas-based particle effects for smooth performance
- Responsive images and lazy rendering

### 📱 Sections
- **Hero** - Animated intro with typewriter effect and particle canvas
- **About** - Personal bio with stats and highlights
- **Projects** - Filterable project gallery with 3D card effects
- **Skills** - Categorized technology stack
- **Experience** - Timeline of professional experience
- **Contact** - Contact form and social links

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js
- **Animations**: Framer Motion, GSAP
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 16+ and pnpm (or npm/yarn)

### Installation

1. **Install dependencies:**
```bash
pnpm install
```

2. **Start development server:**
```bash
pnpm dev
```

The site will open automatically at `http://localhost:5173`

### Build for Production

```bash
pnpm build
```

Output will be in the `dist` folder.

### Preview Production Build

```bash
pnpm preview
```

## Customization

### Update Resume Information
Edit `/src/data/constants.ts`:
- Update `RESUME` object with your information
- Modify `SKILLS` categories and technologies
- Update `EXPERIENCE` timeline

### Update Projects
Edit `/src/data/projects.ts`:
- Add/remove projects from the array
- Update categories, descriptions, and links
- Add new technology tags

### Customize Colors
Edit `/src/index.css` and `/tailwind.config.js`:
- Modify gradient colors (currently cyan/blue)
- Update animation keyframes
- Adjust theme colors

## Project Structure

```
src/
├── components/
│   ├── Navigation.tsx      # Top navigation bar
│   ├── Hero.tsx            # Hero section with 3D canvas
│   ├── About.tsx           # About section
│   ├── Projects.tsx        # Projects showcase
│   ├── Skills.tsx          # Skills grid
│   ├── Experience.tsx      # Experience timeline
│   ├── Contact.tsx         # Contact form
│   ├── Canvas3D.tsx        # Particle canvas effect
│   └── FloatingParticles.tsx # Background particles
├── data/
│   ├── projects.ts         # Projects data
│   └── constants.ts        # Resume & skills data
├── App.tsx                 # Main app component
├── main.tsx                # Entry point
├── index.css               # Global styles & animations
└── globals.css             # Tailwind imports
```

## Features in Detail

### 🎨 Interactive 3D Effects
- **Particle Canvas**: Mouse-tracking particle system in hero section
- **Floating Particles**: Animated background particles throughout
- **3D Card Tilt**: Project cards respond to mouse movement
- **Scroll Animations**: Elements fade and slide in on scroll

### 💫 Animations
- Typewriter effect on hero title
- Staggered animations on skill categories
- Smooth scroll-triggered reveals
- Glow effects on interactive elements
- Floating and pulsing animations

### ♿ Accessibility
- Semantic HTML structure
- ARIA roles for interactive elements
- Keyboard navigation support
- Color contrast compliance
- Mobile-friendly touch targets

## Deployment

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
1. Connect your GitHub repository
2. Set build command: `pnpm build`
3. Set publish directory: `dist`

### Deploy to GitHub Pages
```bash
pnpm build
# Push dist folder to gh-pages branch
```

## Performance Tips

1. **Image Optimization**: Replace placeholder images with optimized versions
2. **Code Splitting**: Vite automatically code-splits route components
3. **Lazy Loading**: Components load on scroll with Intersection Observer
4. **Canvas Pooling**: Particle effects use pooling to minimize garbage collection

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available under the MIT License.

## Future Enhancements

- [ ] Blog section with markdown support
- [ ] Dark/Light theme toggle
- [ ] More 3D effects with React Three Fiber
- [ ] Email integration for contact form
- [ ] PDF resume download
- [ ] Testimonials section
- [ ] Case studies with detailed breakdowns

---

Built with ❤️ using React, Three.js, and creativity
