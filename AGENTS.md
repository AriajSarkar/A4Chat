<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## A4Chat repo rules

- Use Tailwind utilities for component styling; keep manual CSS limited to global tokens and browser defaults.
- Do not add mock assistant responses, fixture conversations, or demo chat data.
- Generally keep provider calls behind Rust/Tauri commands for cross-platform support. However, official frontend SDKs (e.g., `@google/genai`) are permitted if a provider warrants native integration.
- Keep React files focused and below 400 lines; split repeated behavior into shared utilities.
- Prefer scripts in `scripts/*.sh` and call them from package scripts when a workflow grows beyond one command.
- Follow the responsive-design skill (`~/.claude/skills/responsive-design/SKILL.md`) for all UI work — mobile-first, dvh, safe areas, custom dropdowns over native `<select>`.

## Code quality & modularity

Follow the code-quality skill (`~/.claude/skills/code-quality/SKILL.md`) for all structural changes.

### DRY — Don't Repeat Yourself

- **Exact duplicates**: Extract immediately to a shared module. No exceptions.
- **Near-duplicates**: Parameterize the shared version with generics or config objects.
- **Structural duplicates**: Use generics or factory functions.

### Single Responsibility

- Each file should have ONE clear purpose. If you need "and" to describe it, split it.
- Target: ≤300 lines per file. Files >500 lines must be split.
- Components render UI. Hooks manage state/effects. Utils are pure functions.

### Feature Module Pattern

```
src/lib/          → shared utilities (pure functions, no React)
src/hooks/        → shared React hooks
src/components/   → shared React components
src/types/        → shared TypeScript types
src/<feature>/    → feature-specific (can import from shared, never cross-feature)
src/app/          → routes (thin shells, import from features)
```

- Features NEVER import from other features. Cross-feature needs go to shared.
- When splitting a file, keep the original filename as a barrel re-export.

### Import Hierarchy

- `src/lib/` → `src/hooks/` → `src/components/` → `src/<feature>/` → `src/app/`
- No circular imports. No cross-feature imports.

## Testing

- All new pure functions must have tests.
- TypeScript tests go in `tests/ts/` — run with `pnpm test`.
- Rust tests go in `src-tauri/tests/` — run with `pnpm test:rust`.
- Do NOT write tests inline in source files; keep them in the test folders.
- Run `pnpm test:all` before merging.
