# CLAUDE.md

@AGENTS.md

## Claude Code specifics

1. The full briefing is in `AGENTS.md` (imported above). Follow it.
2. Kane skill: run `npx @testmuai/kane-cli-skill` once on this machine. It teaches you to check readiness (installed, signed in, credits, Chrome) and run Kane in a real browser. Use it when the developer asks you to "check the shop in a browser".
3. Optional live status line for Kane runs: `npx @testmuai/kane-cli-skill strip enable` (needs kane-cli ≥ 0.8.17; edits `~/.claude/settings.json` and keeps a backup).
4. When you change the shop, prove it with Kane before saying it works: `kane-cli testrun run tests/kane/starter/*_test.md tests/kane/generated/*_test.md --agent --headless` (in PowerShell, list the files; `testrun` takes explicit `_test.md` paths, not folders) and report the exit code and any `failure.message`.
5. Inside Saboteur's own code, Claude is called through `@anthropic-ai/sdk` in `packages/agent`, not through Claude Code. Keep those two roles separate.
6. Don't spend Kane credits in loops you start yourself (no "let me re-run it 5 times"). Ask first if a step will run Kane more than twice.
