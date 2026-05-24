## [v3.0.0] - 2026-05-25

### ✨ Features
- Rebuild A4Chat around the Tauri/Next.js app shell and restore the real conversation workspace on the root route.
- Add the mobile sidebar, search dialog, and settings dialogs for the new chat experience.
- Add local conversation persistence, API routes, and Rust/native bridge helpers.

### 📱 Android & Tauri
- Update the Tauri config and Android Gradle setup for the mobile/static-export flow.
- Add Android build/dev scripts and Prisma/Tauri sync helpers.
- Refresh package metadata and platform-specific build configuration.

### 🧪 Tests & CI
- Add TypeScript/Vitest coverage for the conversation flow, providers, and native bridge.
- Add Rust tests for commands and storage.
- Add GitHub Actions workflows for build, test, and release automation.

### 📝 Documentation
- Restore and update the project changelog for the new major release.
- Refresh repository docs to match the Tauri-based architecture.

### 🧹 Chores
- Replace temporary debug screens with the production workspace.
- Clean up legacy app-shell structure in favor of the new Tauri architecture.


## [v2.2.4] - 2025-03-09

### ✨ Features
-   Enhance commit summarization by structuring the changelog with categorized bullet points and emoji headers for improved readability.
-   Update changelog generation to include tests for changelog section replacement, ensuring accuracy and reliability.
-   Introduce Jest configuration, an example environment file, and tests for commit summarization using the Gemini API, improving testing capabilities.

### 📝 Documentation
-   Update changelog and release notes for v2.2.4, providing the latest information to users.

### 🔀 Merges
-   Merge pull request #9 from AriajSarkar/New-Updates-v3.

### 🧹 Chores
-   Change the Git pull strategy to `no-rebase` to improve workflow stability in CI environments.


## [1.0.2] - 2024-03-08
- Added dark/light theme support
- Implemented real-time chat with streaming responses
- Added model switching capability
- Added markdown support with syntax highlighting
- Added support for Windows and Linux platforms
- Implemented responsive UI with collapsible sidebar
- Added Docker support
- Added configuration for Ollama API URL

## [1.0.1] - 2024-03-05
- Initial setup with electron-react-typescript-tailwind starter
- Basic project structure implementation
- Configuration setup for development workflow

## [1.0.0] - 2024-03-01
- Initial release
- Basic chat interface
- Ollama integration
