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