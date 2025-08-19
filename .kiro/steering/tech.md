# Technology Stack

## Frontend Framework
- **React 19.1.0** with JSX (functional components preferred)
- **Vite 7.0.4** as build tool and dev server
- **JavaScript** (ES2020+) - no TypeScript currently used

## Styling & UI
- **Tailwind CSS 3.4.0** for utility-first styling
- **Framer Motion 12.23.12** for animations and transitions
- **Lucide React 0.536.0** for consistent outline icons
- Custom dark mode design system with CSS variables

## Key Libraries
- **@xyflow/react 12.8.2** - Interactive canvas/flow editor (ReactFlow)
- **@supabase/supabase-js 2.53.0** - Backend, database, and authentication
- **react-router-dom 7.7.1** - Client-side routing
- **@blocknote/react 0.35.0** - Rich text editing capabilities
- **react-hot-toast 2.5.2** - Toast notifications
- **chart.js 4.5.0** & **react-chartjs-2 5.3.0** - Data visualization
- **d3 7.9.0** - Advanced data manipulation and visualization

## Development Tools
- **ESLint 9.30.1** with React hooks and refresh plugins
- **Vitest 3.2.4** with **@testing-library/react 16.3.0** for testing
- **pnpm** as package manager (lock file present)
- **PostCSS 8.5.6** with **Autoprefixer 10.4.21**

## Environment & Configuration
- **dotenv 17.2.1** for environment variable management
- Supabase environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Environment files: `.env.local` (loaded by Vite config)

## Common Commands

### Development
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
```

### Testing
```bash
pnpm test         # Run tests in watch mode
pnpm test:run     # Run all tests once
pnpm test:ui      # Open Vitest UI interface
```

### Package Management
```bash
pnpm install      # Install dependencies
pnpm add <pkg>    # Add new dependency
```

## Build Configuration
- Vite optimizes `@blocknote/react` and `@blocknote/core` dependencies
- Environment variables injected at build time via Vite's `define` config
- ES modules used throughout (type: "module" in package.json)