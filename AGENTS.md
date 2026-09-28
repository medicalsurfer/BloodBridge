# Tests

`npm test` runs the Jest suite. In a test file `jest`, `describe`, `it` and
`expect` are globals from @types/jest — never import them, and never import
`next/jest` outside `jest.config.ts`. If they appear undefined in an editor,
the TypeScript server is stale; restart it instead of adding an import.

Before changing a test to make an error go away, run `npm test` and read the
failure: the suite is what says whether the platform still works.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
