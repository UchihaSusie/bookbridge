---
name: sprint_completion_state
description: What Sprint 1 delivered, what is actually complete on disk vs. claimed complete, and what Sprint 2+ needs
type: project
---

Sprint 1 is fully complete: `ingestion/`, `glossary/`, `quality/`, `mcp_servers/` all exist in `bookbridge/` with 81 passing tests. The `harness/` module (orchestrator.py, call_claude, build_prompt) is documented in API_DESIGN.md but does NOT yet exist on disk — it is a Sprint 2 deliverable for issue #17.

Security baseline (#27) is fully committed: Gitleaks pre-commit, security.yml CI, OWASP table in CLAUDE.md, security-reviewer agent, PR template with C.L.E.A.R. and AI disclosure.

Claude Code tooling (#26): skills done (tdd-add-module, start-issue, create-pr), agents done (security-reviewer, code-reviewer, product-architect, test-writer), .mcp.json done. PostToolUse ruff hook exists in .claude/settings.json. MISSING: a Stop hook (quality gate after agent finishes — e.g., runs pytest). The workflow-checklist.md confirms 2 hooks are required for full rubric credit. Only 1 is configured.

No Next.js app/ directory, no prisma/ directory, no worker_api/ directory exist yet — all Sprint 2+.

**Why:** Sprint 1 focused on Python core only. Everything web-stack is greenfield.
**How to apply:** Never assume app/, prisma/, or worker_api/ exist when drafting issues. All file paths for Sprint 2+ issues reference directories that must be created.
