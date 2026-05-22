# A4Chat architecture

## Runtime boundary

- Next.js renders the interface as a static export for Tauri.
- Rust owns local persistence, provider HTTP calls, and future streaming buffers.
- Prisma owns the SQLite schema contract and future migration history.
- React state stays focused on UI state, provider selection, and optimistic message rendering.

## Provider contract

Providers are OpenAI-compatible chat completion endpoints. The configured base URL can point to:

- `http://localhost:1234/v1` for LM Studio.
- `https://openrouter.ai/api/v1` for OpenRouter.

If the base URL has no path, A4Chat infers `/v1/chat/completions`; otherwise it appends
`/chat/completions` unless the full endpoint is already supplied.

## Persistence

The app writes SQLite data under the Tauri app data directory. Runtime writes use Rust and
`rusqlite` so Android, Windows, macOS, and Linux share the same storage path behavior without
shipping a Node runtime.

## Streaming roadmap

The next transport step is an SSE reader in Rust that emits buffered message deltas to React.
React should batch visual updates by animation frame so long generations do not re-render the
entire transcript on every token.
