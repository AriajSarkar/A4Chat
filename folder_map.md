# A4Chat Folder Map

## Frontend (`src/`)

### `components/`
- **AppShell/**: Main layout container, handles theme and top-level providers.
- **SideNav/**: Sidebar navigation for seasons and settings.
- **ConversationList/**: List of conversations within a season.
- **ChatWindow/**: Main chat interface, renders messages.
- **Composer/**: Input area for typing prompts.
- **MessageBubble/**: Individual message component (user/AI).
- **ModelSelector/**: UI for selecting LLM models.
- **SeasonManager/**: UI for managing "seasons" (sessions).
- **Streaming/**: Invisible component or hook to handle Tauri events.
- **SettingsModal/**: Application settings.
- **Toasts/**: Notification system.

### `lib/`
- **api/**: Wrappers for `tauri::invoke` calls.
- **types/**: Zod schemas and TypeScript interfaces.
- **utils/**: Helper functions (formatting, validation).
- **store/**: State management (Zustand/Context).

### `services/`
- Client-side services (e.g., local caching logic if not in Rust).

## Backend (`src-tauri/src/`)

### `commands/`
- **llm.rs**: Commands for generating text (`llm_generate`, `cancel_stream`).
- **db.rs**: Commands for database operations.
- **config.rs**: Commands for reading/writing config.
- **util.rs**: Utility commands.

### `providers/`
- **ollama.rs**: Logic for communicating with Ollama.
- **openrouter.rs**: Logic for communicating with OpenRouter.

### `streaming/`
- **stream_manager.rs**: Manages active streams and emits events to frontend.

### `db/`
- **schema.sql**: Database schema (if not using Prisma migration output directly).

## Database
- **prisma/**: Prisma schema and migrations.
