# Fitness Tracker

A React + TypeScript app for tracking workouts, built with Vite.

**Status:** Active development.

## Features

- Track workouts and sessions
- View charts and summaries (Recharts)

## Prerequisites

- Node.js 18 or newer
- npm (or your preferred Node package manager)

## Install

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd fitness-tracker
npm install
```

## How to run (development)

Start the Vite dev server:

```bash
npm run dev
```

Open the app in your browser at http://localhost:5173 (Vite's default).

## Build for production

Create an optimized production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Linting

Run ESLint checks:

```bash
npm run lint
```

## Project structure

- `src/` — application source (components, assets, styles)
- `public/` — static assets
- `scripts/` — utility scripts (smoke tests, console collection)
- `index.html` — Vite entry point
- `vite.config.ts` — Vite configuration

## Key dependencies

- [MUI](https://mui.com/) — UI components
- [Recharts](https://recharts.org/) — charts
- [dayjs](https://day.js.org/) — date handling
- [Playwright](https://playwright.dev/) — end-to-end testing

## Helpful notes

- If you add new packages, run `npm install` and restart the dev server.
- If you need a specific Node version, consider using `nvm` or `volta`.
