# Spinamp – Google AI Studio handoff

This repository is prepared as a Vite + React + TypeScript web app for Google AI Studio Build mode.

## Recommended import: GitHub

1. Put this project in a GitHub repository. Do not commit `node_modules` or `dist`.
2. Open Google AI Studio and enter **Build** mode.
3. In the prompt box, use **Add files (+) → Import from GitHub** and select the repository.
4. Let AI Studio install the dependencies from `package.json`.
5. If the preview is stale, ask the agent to run the Vite app from the existing project instead of scaffolding a new application.

## ZIP fallback

If your AI Studio UI offers **Upload ZIP** in the Code/file explorer, create a new minimal Build project, stop the initial generation, remove the generated starter source files, upload this project ZIP, save, then ask the agent to use the imported Vite project as-is. GitHub import is preferred because it gives you a safer source-of-truth and sync workflow.

## Suggested first AI Studio prompt

> This is an existing Spinamp Vite/React/TypeScript project. Do not redesign it and do not replace it with a new scaffold. Install the dependencies from package.json, preserve the current UI and features, run the existing Vite app, and only fix build/runtime errors that prevent the current project from running. Do not add a Gemini API dependency unless I explicitly ask for an AI feature.

## Local checks

```bash
npm ci
npm run lint
npm run build
```

The app does not require a Gemini API key for its current music-player functionality.
