# 🚀 Quick Start - Hyperliquid Portfolio

## 30-Second Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start dev server
pnpm dev

# 3. Open http://localhost:5173
```

## ⚡ First Things to Customize (5 minutes)

### 1. Your Name & Bio
File: `src/data/constants.ts`
```typescript
export const RESUME = {
  name: 'YOUR NAME HERE',          // Line 1
  title: 'Your Job Title',         // Line 2
  bio: 'Your bio here',            // Line 3
  email: 'you@email.com',
  github: 'https://github.com/yourprofile',
  linkedin: 'https://linkedin.com/in/yourprofile',
  twitter: 'https://twitter.com/yourhandle',
};
```

### 2. Your Projects
File: `src/data/projects.ts`

Add your 8 projects in this format:
```typescript
{
    id: 1,
    title: 'Project Name',
    description: 'What it does',
    technologies: ['React', 'TypeScript'],
    category: 'web',              // web, blockchain, fullstack, build-tools
    github: 'https://github.com/...',
    live: 'https://example.com',
},
```

### 3. Your Skills
File: `src/data/constants.ts`
```typescript
export const SKILLS = {
  frontend: ['React', 'Vue', 'TypeScript', ...],
  backend: ['Node.js', 'Python', ...],
  blockchain: ['Solidity', ...],
  tools: ['Git', 'Docker', ...],
};
```

### 4. Your Experience
File: `src/data/constants.ts`
```typescript
export const EXPERIENCE = [
  {
    role: 'Your Job Title',
    company: 'Company Name',
    period: '2023 - Present',
    description: 'What you did',
  },
  // Add more...
];
```

## 🎨 What Each Section Does

| Component | Purpose | Edit Location |
|-----------|---------|----------------|
| **Hero** | Big intro with animations | `src/components/Hero.tsx` |
| **About** | Your bio & stats | `src/components/About.tsx` |
| **Projects** | Portfolio showcase | `src/data/projects.ts` |
| **Skills** | Tech stack display | `src/data/constants.ts` |
| **Experience** | Job history timeline | `src/data/constants.ts` |
| **Contact** | Contact form & links | `src/components/Contact.tsx` |

## 🎬 Cool Features You Have

✨ **Particle Effects** - Interactive 3D particles on hero
🎯 **Scroll Animations** - Elements fade in as you scroll
🃏 **3D Card Tilt** - Project cards respond to mouse
⌨️ **Typewriter Effect** - Animated intro text
🎪 **Glassmorphism** - Modern frosted glass effects
📱 **Fully Responsive** - Works on all devices

## 📦 Build & Deploy

```bash
# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Deploy to Vercel (easiest)
npm install -g vercel
vercel
```

## 🎨 Color Scheme

The site uses **Cyan** and **Blue** gradients by default.

To change colors:
1. Edit `/src/index.css` - Replace color values
2. Search for `rgba(0, 217, 255, ...)` (cyan)
3. Search for `rgba(0, 153, 255, ...)` (blue)
4. Replace with your colors

## 📁 File Structure You Need to Know

```
src/
├── App.tsx                  # Main app (don't edit much)
├── components/
│   ├── Hero.tsx            # Hero section
│   ├── Projects.tsx        # Projects showcase
│   ├── Skills.tsx          # Skills section
│   ├── Contact.tsx         # Contact section
│   ├── About.tsx           # About section
│   ├── Experience.tsx      # Experience timeline
│   ├── Navigation.tsx      # Top nav (mostly done)
│   ├── Canvas3D.tsx        # Particle effects (mostly done)
│   └── FloatingParticles.tsx
├── data/
│   ├── constants.ts        # 👈 EDIT YOUR INFO HERE
│   └── projects.ts         # 👈 EDIT YOUR PROJECTS HERE
└── index.css               # Global styles & animations
```

## 🔥 Common Edits

### Change Hero Title Prefix
`src/components/Hero.tsx` line 32:
```typescript
const fullText = 'Your title here'; // Change this
```

### Change Number of Project Cards
`src/data/projects.ts` - Just add/remove objects in the array

### Change Background Colors
`src/index.css` - Update gradient colors in body CSS

### Add Resume Download Link
`src/components/Contact.tsx` line ~160 - Update href

## ✅ Pre-Launch Checklist

- [ ] Update name, title, bio in `constants.ts`
- [ ] Add 8 projects in `projects.ts`
- [ ] Update skills in `constants.ts`
- [ ] Update experience in `constants.ts`
- [ ] Add social media links in `constants.ts`
- [ ] Test on your phone
- [ ] Test all project links work
- [ ] Build with `pnpm build`
- [ ] Deploy to Vercel/Netlify

## 🆘 Got Stuck?

### Styles not showing?
```bash
# Restart dev server
pnpm dev
```

### Can't find a component?
- All components are in `src/components/`
- All data is in `src/data/`
- Styles are in `src/index.css`

### Want to add more sections?
1. Create new component in `src/components/YourComponent.tsx`
2. Import in `src/App.tsx`
3. Add to JSX in return statement

## 🚀 Next Steps

1. **Fill in your info** (15 mins)
2. **Add your projects** (30 mins)
3. **Customize colors** (optional, 5 mins)
4. **Deploy** (5 mins)

You're done! 🎉

---

Need more help? Check out `README.md` and `SETUP.md` for detailed guides.
