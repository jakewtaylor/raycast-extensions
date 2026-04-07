# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raycast extension that integrates with the Kimai time-tracking API to manage timers. Built with React/TypeScript using the Raycast Extensions API.

## Commands

- **build**: `npm run build` (uses `ray build`)
- **dev**: `npm run dev` (uses `ray develop` — launches in Raycast for live development)
- **lint**: `npm run lint` / `npm run fix-lint`
- **publish**: `npm run publish` (publishes to Raycast Store, NOT npm)

## Architecture

Three Raycast commands defined in `package.json` under `commands[]`, each mapped to a source file in `src/`:

| Command           | File                       | Mode       | Purpose                                      |
| ----------------- | -------------------------- | ---------- | -------------------------------------------- |
| Start a timer     | `src/start-a-timer.tsx`    | `view`     | Form UI to start a Kimai timer               |
| Active Timer      | `src/active-timer.tsx`     | `menu-bar` | Shows active timer in macOS menu bar         |
| Stop active timer | `src/stop-active-timer.ts` | `no-view`  | Background command to stop the current timer |

Each command exports a default `Command` function component. Menu-bar commands use `MenuBarExtra`, view commands use standard Raycast UI components (`Form`, `ActionPanel`, etc.), and no-view commands run without UI.

## Key Details

- Raycast API: `@raycast/api` for UI components and system integration; `@raycast/utils` for helpers like `getFavicon`
- Prettier config: 120 char width, double quotes
- TypeScript strict mode enabled, targeting ES2023
- The extension is currently scaffolded with template/placeholder code — the actual Kimai API integration has not yet been implemented
- For Raycast developer documentation, refer to: https://developers.raycast.com/llms.txt
- For Kimai API documentation, refer to the file ./kimai-api-doc.json
