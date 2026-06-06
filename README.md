# Psychiatry.ink

Distraction-free clinical writing workspace for psychiatric documentation.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4

## Development

```bash
cd psychiatry-ink
npm install
npm run dev
```

## Structure

```
src/
  components/       # UI building blocks
  data/             # Document type definitions
  hooks/            # Workspace state
  styles/           # Global design tokens (globals.css)
  types/            # Shared TypeScript types
```

Design tokens live in `src/styles/globals.css` for future user theme preferences.
