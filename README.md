# JupiterBrains (Frontend)

This repository contains the **JupiterBrains** frontend (Vite + React + TypeScript + shadcn/ui + Tailwind).

> Note: The original `backend/` folder is not part of this repository anymore. The frontend talks to an **external backend service** over HTTP.

## Quickstart

### Prerequisites

- Node.js + npm

### Run locally

```bash
# install deps
npm install

# start dev server
npm run dev
```

Run commands from the `frontend/` directory.

## Configuration (Environment Variables)

All backend URLs are built from a single base URL:

- `VITE_BACKEND_BASE_URL`

You can optionally override individual endpoints if needed:

- `VITE_AUTH_SIGNIN_URL`
- `VITE_AUTH_SIGNUP_URL`
- `VITE_AUTH_SIGNOUT_URL`
- `VITE_MODELS_API_URL`
- `VITE_CHAT_COMPLETIONS_URL`

Optional auth headers (only if your backend requires them):

- `VITE_AUTH_SIGNUP_BEARER_TOKEN` (used for auth + as fallback token for models/chat)
- `VITE_AUTH_SIGNUP_API_KEY`
- `VITE_AUTH_SIGNUP_API_KEY_HEADER` (default: `x-api-key`)
- `VITE_MODELS_BEARER_TOKEN`
- `VITE_MODELS_API_KEY`
- `VITE_MODELS_API_KEY_HEADER`

## Repository Structure

- `frontend/`
  - The complete React application.
  - See `frontend/README.md` for detailed file-by-file documentation.
