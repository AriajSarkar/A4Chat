# A4Chat

A4Chat is a Tauri 2 + Next.js desktop/mobile client for OpenAI-compatible AI APIs,
starting with LM Studio and OpenRouter.

## Getting Started

Install dependencies with pnpm:

```bash
pnpm dev
```

Run the Tauri desktop app:

```bash
pnpm tauri:dev
```

Run Android development after Android tooling is installed:

```bash
pnpm android:init
pnpm android:dev
```

The Android dev script reuses the same Next.js dev server as desktop when it is already running on port `3000`. If nothing is running yet, it starts the dev server for you.

Build an Android APK for arm64:

```bash
pnpm android:build:aarch64
```

## Providers

- LM Studio default URL: `http://localhost:1234/v1`
- OpenRouter default URL: `https://openrouter.ai/api/v1`

Provider URL, model, and API key are editable in Settings.

## Quality

```bash
pnpm check
pnpm build
```

Rust owns provider HTTP calls and SQLite persistence. Prisma keeps the local database schema
documented and ready for migrations/cloud sync.
