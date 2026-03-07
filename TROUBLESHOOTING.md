# Troubleshooting Guide

## Initial Setup Issues

### Fatal Error During Initialization

If you see "Fatal error during initialization", follow these steps:

1. **Clear Node Modules and Cache**
   ```bash
   rm -rf node_modules
   rm -rf .pnpm-store
   pnpm store prune
   ```

2. **Reinstall Dependencies**
   ```bash
   pnpm install
   ```

3. **Start Dev Server**
   ```bash
   pnpm dev
   ```

### Common Errors and Fixes

#### Error: Cannot find module 'lucide-react'
- Dependencies may not be installed
- Run: `pnpm install`

#### Error: ENOENT - No such file or directory
- Make sure you're in the project root directory
- Check that all files exist: `ls -la src/`

#### Port 5173 Already in Use
- Kill the process: `lsof -i :5173 | grep node | awk '{print $2}' | xargs kill`
- Or change port in `vite.config.ts`

#### CSS Not Loading
- Ensure Tailwind is installed: `pnpm install -D tailwindcss postcss autoprefixer`
- Verify `src/globals.css` and `src/index.css` imports are in `src/main.tsx`

### Missing Files

All required files should be present in `/src`:

```
src/
├── main.tsx              ✓ Entry point
├── App.tsx               ✓ Main component
├── index.css             ✓ Custom styles
├── globals.css           ✓ Tailwind directives
├── components/
│   ├── Navigation.tsx     ✓ Header nav
│   ├── Hero.tsx           ✓ Hero section
│   ├── About.tsx          ✓ About section
│   ├── Projects.tsx       ✓ Projects gallery
│   ├── Skills.tsx         ✓ Skills section
│   ├── Experience.tsx     ✓ Experience timeline
│   ├── Contact.tsx        ✓ Contact section
│   ├── Canvas3D.tsx       ✓ 3D particles
│   └── FloatingParticles.tsx ✓ Floating fx
└── data/
    ├── projects.ts       ✓ Project data
    └── constants.ts      ✓ Resume data
```

### Scripts Not Working

- **Dev**: `pnpm dev` - Starts Vite dev server
- **Build**: `pnpm build` - Creates production build
- **Preview**: `pnpm preview` - Preview production build locally
- **Lint**: `pnpm lint` - Run ESLint

## Performance Tips

- Clear browser cache if styles don't update
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check DevTools Console for errors
- Verify network requests are working in Network tab

## Getting Help

If issues persist:
1. Check the console for specific error messages
2. Verify all dependencies are installed: `pnpm install`
3. Try a fresh build: `pnpm build`
4. Check that Node.js version is ≥16.x
