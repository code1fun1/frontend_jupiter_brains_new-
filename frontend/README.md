# JupiterBrains (Frontend)

This folder contains the **JupiterBrains** frontend.

It is a Vite + React + TypeScript app using shadcn/ui and TailwindCSS.

## Local development

### Prerequisites

- Node.js + npm

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Environment variables

### Base URL (recommended)

To make the project portable across machines/ports, configure a single backend base URL:

```bash
VITE_BACKEND_BASE_URL=http://localhost:8081
```

All default API endpoints are derived from this base.

### Optional endpoint overrides

If you need to override any individual endpoint:

```bash
VITE_AUTH_SIGNUP_URL=http://localhost:8081/api/v1/auths/add
VITE_AUTH_SIGNIN_URL=http://localhost:8081/api/v1/auths/signin
VITE_AUTH_SIGNOUT_URL=http://localhost:8081/api/v1/auths/signout

VITE_MODELS_API_URL=http://localhost:8081/api/models?
VITE_CHAT_COMPLETIONS_URL=http://localhost:8081/api/chat/completions
```

### Optional auth headers

If your backend requires authentication for these endpoints, you can provide bearer token and/or API key.

```bash
VITE_AUTH_SIGNUP_BEARER_TOKEN=Bearer <token>
VITE_AUTH_SIGNUP_API_KEY=<key>
VITE_AUTH_SIGNUP_API_KEY_HEADER=x-api-key

VITE_MODELS_BEARER_TOKEN=Bearer <token>
VITE_MODELS_API_KEY=<key>
VITE_MODELS_API_KEY_HEADER=x-api-key
```

Notes:

- Frontend code is written to accept either `Bearer <token>` or a raw JWT (it will prepend `Bearer ` automatically).
- Env changes require restarting the Vite dev server.

## Project structure

### Top-level

- **`index.html`**
  - Vite entry HTML.
- **`package.json`**
  - Scripts and dependencies.
- **`package-lock.json`**
  - Locked dependency tree.
- **`vite.config.ts`**
  - Vite configuration.
- **`vitest.config.ts`**
  - Vitest configuration.
- **`eslint.config.js`**
  - ESLint configuration.
- **`tailwind.config.ts`**
  - Tailwind configuration.
- **`postcss.config.js`**
  - PostCSS configuration.
- **`tsconfig.json`**, **`tsconfig.app.json`**, **`tsconfig.node.json`**
  - TypeScript configs (app + tooling).
- **`components.json`**
  - shadcn/ui generator config.
- **`.env` / `.env.local`**
  - Local environment variables.
  - These files are typically gitignored.
- **`.gitignore`**
  - Git ignore rules for frontend artifacts.

### `public/`

Static assets served as-is:

- **`favicon.ico`**
- **`placeholder.svg`**
- **`robots.txt`**

### `src/`

Main application source code.

- **`main.tsx`**
  - React entry point; mounts the app.
- **`App.tsx`**
  - Root component / router shell.
- **`index.css`**
  - Global styles.
- **`App.css`**
  - Additional app styles.

#### `src/pages/`

Route-level pages:

- **`Index.tsx`**
  - Main chat page.
- **`Auth.tsx`**
  - Login/signup UI.
- **`Admin.tsx`**
  - Admin UI (model configuration, etc.).
- **`NotFound.tsx`**
  - 404 page.

#### `src/contexts/`

- **`ChatStoreContext.tsx`**
  - Provides chat state/store through React context.

#### `src/hooks/`

- **`useAuth.ts`**
  - Auth state and auth API integrations:
    - signup: `/api/v1/auths/add`
    - signin: `/api/v1/auths/signin`
    - signout: `/api/v1/auths/signout`
- **`useChatStore.ts`**
  - Chat state, models loading, and chat completion integration:
    - models: `/api/models?`
    - chat completions: `/api/chat/completions`
- **`use-toast.ts`**
  - Toast helper.
- **`use-mobile.tsx`**
  - Responsive/mobile helper.

#### `src/components/`

Reusable components.

- **`components/chat/`**
  - Chat UI building blocks:
    - `ChatArea.tsx`
    - `ChatHeader.tsx`
    - `ChatInput.tsx`
    - `ChatMessage.tsx`
    - `ChatSidebar.tsx`
    - `ModelSelector.tsx` (model dropdown)
    - `ModelSuggestionDialog.tsx`
- **`components/admin/`**
  - Admin UI components.
- **`components/ui/`**
  - shadcn/ui components (Button, Input, DropdownMenu, etc.).
- **`NavLink.tsx`**
  - Navigation link helper.

#### `src/types/`

- **`chat.ts`**
  - Shared types like `AIModel`, `Message`, `ChatSession`, plus `DEFAULT_MODELS` fallback.

#### `src/lib/`

- **`utils.ts`**
  - Shared utility helpers.

## Generated / not committed

- `node_modules/` (dependencies)
- `dist/` and `dist-ssr/` (build outputs)
- `*.local` env files (typically)

## Technologies

- Vite
- TypeScript
- React
- shadcn/ui
- Tailwind CSS
