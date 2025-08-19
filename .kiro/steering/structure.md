# Project Structure

## Root Directory
```
lina-curation-dashboard/     # Main application directory
├── src/                     # Source code
├── public/                  # Static assets
├── PRPs/                    # Project requirements/proposals
├── package.json             # Dependencies and scripts
├── vite.config.js          # Vite build configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── eslint.config.js        # ESLint rules and configuration
├── vitest.config.js        # Test configuration
└── .env.example            # Environment variables template
```

## Source Code Organization (`src/`)
```
src/
├── components/             # Reusable UI components
├── pages/                 # Main route components/pages
├── hooks/                 # Custom React hooks
├── services/              # API calls and external service integrations
├── context/               # React Context providers for global state
├── utils/                 # Pure utility functions and helpers
├── lib/                   # External library configurations
├── assets/                # Images, fonts, and other static assets
├── test/                  # Test utilities and setup files
├── App.jsx                # Main application component
├── main.jsx               # Application entry point
├── App.css                # Global application styles
└── index.css              # Base styles and CSS variables
```

## Architecture Patterns

### Component Organization
- **One component per file** with filename matching component name
- **Functional components** preferred over class components
- **Components under 150 lines** - extract complex logic to hooks
- **PascalCase** naming for component files (e.g., `FeedItem.jsx`)

### State Management
- **Local state**: `useState` for simple component state
- **Global state**: React Context for authentication and app-wide data
- **Custom hooks**: Extract complex state logic (prefix with `use`)
- **External state**: Supabase for persistent data

### File Naming Conventions
- **Components**: `PascalCase.jsx` (e.g., `CanvasEditorV2.jsx`)
- **Hooks**: `camelCase.js` with `use` prefix (e.g., `useCanvasState.js`)
- **Utils**: `camelCase.js` (e.g., `textHelpers.js`)
- **Services**: `camelCase.js` (e.g., `supabaseClient.js`)
- **Constants**: `UPPER_SNAKE_CASE`

### Testing Structure
- **Test files**: Located in `__tests__/` directories within each module
- **Naming**: `ComponentName.test.jsx` or `hookName.test.js`
- **Setup**: Global test configuration in `src/test/setup.js`

### Key Directories Explained

#### `components/`
Reusable UI components that can be used across multiple pages:
- Canvas editor components (`CardNode.jsx`, `CanvasEditorV2.jsx`)
- Form components, buttons, modals
- Layout components (headers, sidebars)

#### `pages/`
Route-level components representing different application screens:
- Curation pages, dashboard views
- Authentication pages
- Settings and configuration pages

#### `hooks/`
Custom React hooks for encapsulating stateful logic:
- `useCanvasState.js` - Canvas editor state management
- Authentication hooks, data fetching hooks
- UI state hooks (modals, forms)

#### `services/`
External API integrations and data layer:
- Supabase client configuration
- News API integrations
- Data transformation utilities

#### `context/`
React Context providers for global application state:
- Authentication context
- Theme/UI preferences
- Application-wide settings

## Import Conventions
- **Relative imports** for local files: `./ComponentName`
- **Absolute imports** from `src/`: Use relative paths from current location
- **External libraries**: Import from package name
- **Group imports**: External libraries first, then local imports