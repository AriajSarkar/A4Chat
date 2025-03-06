# GitHub Copilot Instructions

This document outlines essential conventions and patterns for GitHub Copilot to follow when making suggestions.

## Changelog Format

The [CHANGELOG.md](../CHANGELOG.md) should follow this format:

```markdown
# Changelog

## [Version] - YYYY-MM-DD
### Added
- New features

### Changed 
- Updates to existing features

### Fixed
- Bug fixes
```

## Code Conventions

### React/Electron
- Use functional components
- Clear component names in PascalCase
- Keep components focused and small
- Handle IPC communication patterns consistently

```typescript
interface ChatMessageProps {
  message: string;
  sender: 'user' | 'assistant';
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, sender }) => {
  // Implementation
};
```

### Tailwind CSS
- Layout classes first
- Box model second
- Visual styles last
- Consistent dark mode patterns
- Follow existing color scheme

### GitHub Actions
- Version update workflow patterns:
  1. Bump version
  2. Create PR or commit to main
  3. Build and release
  4. Clean up branches

## Project Structure

```
src/
├── components/
│   ├── features/      # Feature-specific components
│   ├── layout/        # Layout components
│   └── ui/           # Reusable UI components
├── contexts/         # React contexts
├── utils/           # Utility functions
├── styles/          # Global styles
└── types/          # TypeScript types/interfaces
```

## Version Control

- Use conventional commits:
  - feat: new features
  - fix: bug fixes
  - chore: maintenance
  - docs: documentation
- Reference issues in commits
