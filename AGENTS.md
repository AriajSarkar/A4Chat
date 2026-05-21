<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## A4Chat repo rules

- Use Tailwind utilities for component styling; keep manual CSS limited to global tokens and browser defaults.
- Do not add mock assistant responses, fixture conversations, or demo chat data.
- Keep provider calls and local persistence behind Rust/Tauri commands for cross-platform runtime support.
- Keep React files focused and below 400 lines; split repeated behavior into shared utilities.
- Prefer scripts in `scripts/*.sh` and call them from package scripts when a workflow grows beyond one command.
