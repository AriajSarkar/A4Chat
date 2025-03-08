## [v2.2.4] - 2025-03-08

- Merge pull request #8 from AriajSarkar/New-Updates-v2
- chore: update version from 1.1.3 to 2.2.4 in package.json
- feat: add TypeScript definitions for Electron API, enhance chat state management, and update package dependencies
- feat: add global type definitions, enhance z-index management, and improve scrollbar styling; implement version comparison and download URL extraction utilities
- feat: enhance ESLint configuration, update import paths, and add debounce utility function
- feat: add NewChatButton, SettingsPanel, and SidebarToggle components to enhance sidebar functionality
- feat: add chat components and hooks for managing chat state and streaming
- feat: improve changelog generation and summary process in CI workflow
- docs: update changelog and release notes for v1.1.3
- docs: update changelog summary for v1.1.3
- feat: enhance changelog update process in CI workflow
- docs: clean up CHANGELOG and remove outdated version information

## Summary of Changes (v1.1.3)

This release focuses on CI/CD improvements, versioning management, security enhancements, and bringing forward key features from a previous release (v1.0.2).

*   **Versioning & CI/CD:**
    *   Improved CI/CD workflows.
    *   Streamlined version handling.
    *   Automated version update process.
    *   Cleaned up version update branches after release.
    *   Adjusted job dependencies.

*   **Security:**
    *   Enhanced security with the addition of the `frame-src` directive.

*   **Features (from v1.0.2):**
    *   Theme support
    *   Real-time chat
    *   Model switching
    *   Markdown support
    *   Performance utilities (throttle, debounce, memory management)
    *   Enhanced component styling (StreamingMessage, ModelSelector, ChatInput, PrevChatItem)
    *   CodeBlock component with copy functionality
    *   Dexie database integration for chat management

*   **Documentation:**
    *   Added documentation for GitHub Copilot instructions.

*   **Fixes:**
    *   Reverted version numbers to correct discrepancies.
    *   Cleaned up the CHANGELOG.


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