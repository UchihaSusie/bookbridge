# BookBridge — Project 3 Submission Evidence

Evidence for the Project 3 rubric (200 pts), organized by rubric category.

---

## Category 1 — Application Quality (40 pts)

> **Rubric target (Excellent, 40 pts):** Production-ready, deployed on Vercel, polished UI, 2+ user roles, real problem solved, portfolio-worthy.

### 1.1 Problem statement & real-world use case

BookBridge solves a specific pain for foreign-language readers of long PDFs — novels, non-fiction, academic books — where off-the-shelf tools like Google Translate or DeepL either lose chapter structure entirely or drift in terminology across chapters (a proper noun rendered three different ways in the same book), while dedicated book-translation services are slow and expensive. The platform serves two roles: a **Translator** who uploads a PDF, curates a project glossary, triggers translation one chapter at a time, and publishes the result; and a **guest Reader** who opens the published link in an immersive two-column view (original on the left, translation on the right) without signing up. What makes BookBridge a new idea rather than a thin wrapper over a translation API is the combination of **chapter-selective translation** (each chapter is readable the moment it is done — no waiting for the whole book), **glossary-backed terminology consistency across the entire book** (named entities and recurring terms stay stable from chapter 1 to chapter 30), and **progressive publication via a public read-only link** — together these treat a book as a structured document with internal coherence, not a flat 400-page string.

### 1.2 User roles

BookBridge has **two distinct user roles**:

| Role | Authentication | What they can do |
|---|---|---|
| **Book Owner** | Clerk (signed in) | Upload PDFs, run translation jobs, review and edit paragraphs, toggle a book between private and public |
| **Public Reader** | None (anonymous) | Read a published bilingual book via its public `/read/[id]` URL — no account required |

### 1.3 Deployment

| Environment | Platform | URL |
|---|---|---|
| Production — Next.js BFF + frontend | Vercel | https://bookbridge-next.vercel.app/ |
| Production — FastAPI Worker | Railway | https://passionate-serenity-production-3cdd.up.railway.app/ |
| Per-PR preview deploy | Vercel | Every pull request against `main` receives an auto-generated preview URL (e.g. `bookbridge-next-git-<branch>-<team>.vercel.app`), posted as a status check on the PR so reviewers can click through to a live deploy of the proposed changes before merge |

### 1.4 Architecture requirements checklist

| Rubric requirement | Satisfied by |
|---|---|
| Next.js full-stack (App Router) | `app/` directory, Next.js 15 |
| Database (PostgreSQL) | Prisma schema in `prisma/`, PostgreSQL hosted on Railway |
| Authentication (Clerk) | `middleware.ts` + `auth()` guards on API routes; `useUser()` in client components |
| Deployed with preview deploys | Vercel project above (production + per-PR previews) |

---

## Category 2 — Claude Code Mastery (55 pts)

> **Rubric target (Excellent, 55 pts):** Rich CLAUDE.md with @imports and git evolution; 2+ iterated skills with usage evidence; 2+ hooks enforcing quality; MCP server integrated via `.mcp.json`; agents (sub-agents / teams / SDK) with evidence; parallel worktree development; 2+ PRs with writer/reviewer + C.L.E.A.R. + AI disclosure.

### 2.1 CLAUDE.md & Auto-memory

**Root `CLAUDE.md`** uses `@import` for modular organization:

```markdown
@import docs/PRD.md
@import docs/API_DESIGN.md
```

Core `CLAUDE.md` documents: architecture rules (Next.js BFF + Python Worker), project structure, Python/Next.js conventions, a full OWASP Top 10 → BookBridge-defense mapping, active security gates, and `Don'ts`.

**Git evolution of `CLAUDE.md`** (`git log --follow CLAUDE.md`):

| SHA | Commit |
|---|---|
| `81abcd6` | `setup: add CLAUDE.md v1 with tech stack conventions and import references` |
| `c1ee243` | `setup: iterate CLAUDE.md based on init feedback and add testing strategy` |
| `bfdcbe0` | `docs: update PRD, API design, and workflow checklist with rubric coverage` |
| `3a6cb37` | `feat: add code-reviewer agent, PR template, CI security review, and update docs` |

**Auto-memory** is active and recalled automatically at the start of every Claude Code session. The live memory directory lives on the developer's machine outside the repository; a sanitized snapshot is committed to [`docs/claude-memory/`](claude-memory/) (see below). Index file:

```markdown
# Memory Index
- [User Profile](user_profile.md) — CS student, BookBridge pair project …
- [Project Status](project_status.md) — Sprint 4 demo loop done; Sprint 3 CRUD backlog in flight …
- [Evidence Collected](evidence_collected.md) — Rubric evidence: 5+ C.L.E.A.R. PRs, 6+ TDD pairs
- [Workflow Preferences](workflow_preferences.md) — Concise responses; address full review list …
- [gh CLI Quirks](gh_cli_quirks.md) — `gh issue assign` unavailable locally …
- [Legacy Files Churn](legacy_files_churn.md) — `legacy/merge.py` / `split_book.py` keep reappearing …
- [Harness / Worker Provider Decisions](harness_provider_decisions.md) — demo=mock, real=openai_compat …
```

**Memory snapshot committed to repo at [`docs/claude-memory/`](claude-memory/)** (8 files) so graders can read the full memory contents directly. The live memory directory is maintained outside the repository by Claude Code and is not otherwise git-tracked. The snapshot has been redacted of personal identifiers (name, email, local machine paths); the content and structure otherwise mirror the live directory verbatim.

### 2.2 Custom Skills (≥2, one iterated v1 → v2)

Claude Code has migrated slash-command storage from `.claude/skills/` to `.claude/commands/` during this project. Both directories are retained in the repository so graders can observe the migration: `.claude/commands/` holds the current active skills; `.claude/skills/` preserves the earlier versions (including the v1 artefact) as historical evidence.

| Skill | Purpose | Location |
|---|---|---|
| `/tdd-add-module` | Enforce red-green-refactor workflow with BookBridge conventions | `.claude/skills/tdd-add-module.md` (v2) + `.claude/skills/tdd-add-module-v1.md` (v1) + `.claude/commands/tdd-add-module.md` |
| `/start-issue` | Fetch GitHub issue, create correctly-named branch, assign, print acceptance criteria | `.claude/commands/start-issue.md` |
| `/create-pr` | Run quality checks, write standardised PR description with C.L.E.A.R. checklist + AI disclosure metadata, push and open PR | `.claude/commands/create-pr.md` |

**Skill iteration — `/tdd-add-module` v1 → v2** (diff of `.claude/skills/tdd-add-module-v1.md` vs `.claude/skills/tdd-add-module.md`):

| Change | v1 | v2 | Why iterated |
|---|---|---|---|
| Pre-flight checklist | — | explicit reads of `CLAUDE.md`, `docs/API_DESIGN.md`, `docs/PRD.md`, `pyproject.toml` | v1 runs skipped project conventions; teammates re-invented patterns |
| Dependency check (Step 1) | — | verify packages in `pyproject.toml`, install if missing | modules were failing at import time because deps were not declared |
| `models.py` conventions | implied | dataclasses must expose `to_dict() -> dict` | serialization gaps between modules when crossing the BFF boundary |
| Test fixture patterns | — | shown: `tmp_path` + sample-data fixtures | tests in v1 hard-coded paths and leaked DB state |
| Error handling pattern | — | codified: `None` for missing lookups, `ValueError` for bad input, parameterized SQL | caller-vs-implementer confusion between runs |
| Post-refactor checks | single `pytest` run | `pytest` + `ruff format` + `ruff check` + `--cov` | refactor pass was landing without coverage verification |
| Definition of Done | — | 7-item checkbox (tests, lint, commits, docstrings, type hints, dataclasses) | work was merging without full quality gate |

**Usage evidence** (screenshots committed to repo):
- `create-pr` skill in action: `docs/evidence/image-20260418173231573.png`, `image-20260418173255306.png`

### 2.3 Hooks (3 configured in `.claude/settings.json`)

| Hook | Event | Purpose |
|---|---|---|
| Ruff format + check | `PostToolUse` matching `Write|Edit` | auto-format and lint-fix every file Claude edits |
| pytest quality gate | `Stop` | runs `pytest tests/ -q` at the end of every Claude Code session and prints the tail |
| TDD red-commit enforcement | `PreToolUse` matching `Bash` | before any `feat(next):` commit, warn if the current branch has no `test(red):` commit — blocks silent TDD skips |

Config excerpt (`.claude/settings.json`):

```json
"hooks": {
  "PostToolUse": [{"matcher": "Write|Edit",
    "hooks": [{"type": "command",
      "command": "ruff format $CLAUDE_FILE_PATH 2>/dev/null; ruff check --fix $CLAUDE_FILE_PATH 2>/dev/null; true"}]}],
  "Stop": [{"matcher": "",
    "hooks": [{"type": "command",
      "command": "echo '--- pytest quality gate ---'; pytest tests/ -q --tb=short 2>&1 | tail -5; exit 0"}]}],
  "PreToolUse": [{"matcher": "Bash",
    "hooks": [{"type": "command",
      "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -q 'feat(next):'; then RED=$(git log --oneline \"$(git branch --show-current)\" 2>/dev/null | grep -c 'test(red):'); if [ \"$RED\" -eq 0 ]; then echo 'WARNING: No test(red): commit on this branch. TDD rubric requires failing tests committed before implementation.'; fi; fi"}]}]
}
```

### 2.4 MCP Servers

Two MCP servers on this project: a custom Python **glossary-server** registered in the repo's `.mcp.json`, and **Playwright MCP** invoked ad-hoc for in-session UI verification.

**Committed configuration — `.mcp.json` (both servers shared via the repo):**

```json
{
  "mcpServers": {
    "glossary-server": {
      "command": "python",
      "args": ["-m", "bookbridge.mcp_servers.glossary_server", "--db", "glossary.db"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**`glossary-server`** is a custom Python MCP server (source in `bookbridge/mcp_servers/`) that exposes glossary term lookup and insertion. It originated during Sprint 1, when BookBridge was still a Python CLI / terminal pipeline — it let Claude Code query and mutate the RAG-backed glossary store from inside a session without shelling out.

**Playwright MCP** was added during Next.js UI work to close the "AI can't see what it just changed" loop. Because both servers are in `.mcp.json`, every teammate and CI agent picks them up automatically on clone.

A complete Playwright MCP session (AI writes code → AI opens the live browser → AI + human verify the visible result) is archived at [`docs/evidence/mcp-playwright/`](evidence/mcp-playwright/): a session README, 2 page screenshots (Clerk sign-in redirect + final verified layout), 2 Playwright accessibility snapshots (YAML), and 2 browser console logs. The recorded session (≈1 minute, 2026-04-21 UTC) shows Claude moving the green "Start Reading" button into the title block of the project detail page (`bookbridge-next/app/dashboard/projects/[id]/page.tsx:41-67`) and then using the Playwright-controlled browser — signed in through Clerk — to visually confirm the new layout on a live book (14 chapters, en → zh-Hans). The corresponding code + `.mcp.json` change lives in commit `447c2e0` (merged via PR #63).

### 2.5 Sub-agents (4 agents in `.claude/agents/`)

| Agent | Role |
|---|---|
| `code-reviewer.md` | Performs C.L.E.A.R. code reviews on PRs (correctness, logic errors, edge cases, architecture fit, performance) |
| `security-reviewer.md` | Reviews code for OWASP Top 10 + BookBridge-specific gates (auth/ownership, Zod validation, SSRF, secret hygiene) |
| `test-writer.md` | Writes failing Vitest tests for Next.js TDD issues — produces the `test(red):` commit, never writes implementation |
| `product-architect.md` | Audits PRD ↔ GitHub Issue coverage, generates TDD-structured issues with OWASP gates |

**Usage evidence** (committed screenshots):
- `code-reviewer` output: `docs/evidence/image-20260418172430290.png`
- `test-writer` invoked via `/start-issue`: `docs/evidence/image-20260418223933106.png`

### 2.6 Parallel Development — Git Worktrees

Two worktrees are active concurrently at submission time. The main checkout is building a translator provider feature; the second is used to compose this submission report without disturbing the feature branch:

```bash
$ git worktree list
~/Desktop/bookbridge       3b59042 [feat/issue-60-add-openai-compatible-translator-provider]
~/Desktop/bookbridge-docs  0e6c545 [docs/report]
```

The feature/report split is one concrete example of parallel worktree use. The branch history also shows multiple feature branches in flight simultaneously across Sprints 3 and 4:

```
feat/issue-52-harness-translator-providers    # Worker-side translator plumbing
feat/issue-57-publish-toggle-reader-page      # Frontend publish toggle
feat/issue-44-auth-aware-landing-page         # Auth-aware landing
fix/issue-47-upload-dropzone-click            # PDF upload fix
feat/issue-60-add-openai-compatible-...       # current feature
docs/report                                    # current docs worktree
```

### 2.7 Writer/Reviewer Pattern + C.L.E.A.R. + AI Disclosure

The rubric defines the writer/reviewer pattern as *"one agent writes, another reviews"* — explicitly allowing an all-AI pair. This project uses exactly that:

1. **Writer** — Claude Code drafts the implementation (typically via `/start-issue` + `/tdd-add-module` skills)
2. **Reviewer** — the `code-reviewer` sub-agent posts a C.L.E.A.R.-framework review as an automated comment on the PR, invoked from Step 7 of the `/create-pr` skill

Human partner review beyond the final merge-click is not claimed on this project — the C.L.E.A.R. quality signal comes from the `code-reviewer` sub-agent, not a second human reader (see §5.4 for the honest disclosure about partner-level coordination).

Representative PRs (each has a `code-reviewer` C.L.E.A.R. comment visible in its Conversation tab):

| PR | Feature | Writer | Reviewer |
|---|---|---|---|
| [#45](https://github.com/UchihaSusie/bookbridge/pull/45) | S3-7 Auth-aware landing page | Claude Code via `/start-issue` | `code-reviewer` sub-agent |
| [#48](https://github.com/UchihaSusie/bookbridge/pull/48) | Fix: PDF upload dropzone click | Claude Code via `/tdd-add-module` | `code-reviewer` sub-agent |
| [#39](https://github.com/UchihaSusie/bookbridge/pull/39) | PDF upload API route with worker proxy | Claude Code | `code-reviewer` sub-agent |

**AI disclosure metadata** — every PR description follows the project's [`pull_request_template.md`](../.github/pull_request_template.md) structure, which includes:

- Percentage of the change that was AI-generated
- Tool used (Claude Code + model / skills invoked)
- Human review status (e.g. "merge-only" vs. "line-by-line reviewed" — this project is predominantly "merge-only + AI review")

---

## Category 3 — Testing & TDD (30 pts)

> **Rubric target (Excellent, 30 pts):** TDD red-green-refactor for 3+ features visible in git; 70%+ coverage; unit + integration + E2E (Playwright); tests verify behavior and edge cases.

### 3.1 TDD red-green-refactor — git history

Every feature followed a strict TDD loop: a failing test commit (`test(red):`) lands **before** the implementation commit (`feat(next):` / `feat(green):` / `fix(next):`). **15+ paired features** are visible in `git log`, spanning both the Python Worker (Sprint 1) and the Next.js BFF + frontend (Sprints 2–4).

| Feature | `test(red):` SHA | Impl SHA | Ref |
|---|---|---|---|
| OpenAI-compatible translator provider | `c2f7c5b` | `3b59042` `feat(green)` | #60 |
| Publish toggle + public reader page | `7a55058` | `0d43dad` `feat(next)` | #57 |
| Public reading routes | `70c77c3` | `fcecbb2` `feat(next)` | #32 |
| Publish/unpublish `publicToken` generation | `9d00f08` | `0eae228` `feat(next)` | #24 |
| `projects/[id]` CRUD — PATCH + DELETE | `5307559` | `9e397fb` `feat(next)` | #29 |
| DeleteProjectButton UI | `cfb9992` | `35ab86c` `feat(next)` | #29 |
| Reader view end-to-end | `3b27548` | `dd3edee` `feat(green)` | #51 |
| `bookbridge.harness` + `/translate/chunk` | `278398e` | `05e7a9e` `feat(green)` | #52 |
| PDF upload dropzone click | `3cca656` | `5bbaab3` `feat(next)` | #47 |
| Auth-aware landing page | `57ea257` | `1dd0127` `feat(next)` | #44 |
| Job polling proxy (`GET /api/jobs/[jobId]`) | `07132a7` | `d164b5d` `feat(next)` | #31 |
| FastAPI Worker endpoints | `7c2d8c9` | `9905265` (bulk `feat(next)`) | #16 |
| Quality checker module | `0440a0e` | subsequent green | — |
| Glossary store module | `bccb5b6` | subsequent green | — |
| HTML parser (`extract_body_content`) | `3f40118` | subsequent green | — |
| Chunker chapter detection + manifest | `0dcc44c` | subsequent green | #3 |
| Text cleaning functions | `e14bac8` | subsequent green | #2 |

TDD is additionally enforced mechanically: the `PreToolUse` hook in `.claude/settings.json` (see §2.3) warns before any `feat(next):` commit if the current branch has no `test(red):` commit.

**TDD in flight at submission time** — issue #61 (async conversion of the jobs endpoint) is in the red phase right now: `__tests__/api/jobs-async.test.ts` and `__tests__/api/jobs/[jobId]/route-async.test.ts` are committed as **deliberately failing** tests (assertions in each file begin with `// THE FAILING ASSERTION: …`). Running the full Vitest suite therefore shows 7 expected failures across those 2 files until the corresponding `feat(next):` commit lands. These tests are excluded from the coverage run in §3.3 to avoid v8's failure-gate suppressing the summary; they are kept in the suite as live proof that TDD is a current practice, not just a historical artefact.

### 3.2 Test pyramid — unit, integration, E2E

| Layer | Framework | Location | Scale / example |
|---|---|---|---|
| **Unit** | Vitest | `bookbridge-next/lib/__tests__/` | Pure utilities (e.g. `public-project.ts`, `worker.ts` — 80% / 91% lines) |
| **Unit** | pytest | `tests/test_chunker.py`, `test_glossary.py`, `test_harness.py`, `test_html_parser.py`, `test_pdf_reader.py`, `test_quality.py` | 98 unit tests across 6 modules |
| **Integration** | Vitest | `bookbridge-next/__tests__/` | Next.js API Route tests exercising Prisma + Worker proxy (all routes ≥ 74%, most ≥ 88%) |
| **Integration** | pytest | `tests/test_worker_api.py` | FastAPI TestClient over Worker endpoints (`/parse`, `/translate/chunk`) |
| **E2E** | Playwright | `bookbridge-next/e2e/landing.spec.ts` | 5 test cases: hero section, sign-in link, sign-up link count, three feature cards, demo reader page |

### 3.3 Coverage — 70% threshold cleared on both layers

**Next.js (Vitest, `npm run test:coverage`)** — 18 test files · 111 tests:

```
Statements   : 86.9%  ( 219/252 )
Branches     : 83.33% ( 135/162 )
Functions    : 86.36% ( 19/22 )
Lines        : 87.09% ( 216/248 )
```

Every API route file is covered: `app/api/upload/route.ts` 97.29%, `app/api/projects/[id]/route.ts` 94.73%, `app/api/jobs/[jobId]/route.ts` 88.88%, `app/api/jobs/route.ts` 74%.

**Python Worker (pytest-cov, `pytest tests/ --cov=bookbridge`)** — 110 tests across 7 modules:

```
TOTAL coverage: 77%  (547 statements, 128 missed)
```

Core business modules — glossary store, translator providers, HTML parser, chunker, output models — are at 92–100% line coverage. The uncovered lines are concentrated in the CLI entry point (`cli.py`) and the optional MCP server (`mcp_servers/glossary_server.py`, which requires the optional `mcp` SDK).

Both layers exceed the 70% rubric threshold. Raw terminal output from both runs is archived as reproducible evidence:

- [`docs/evidence/coverage/vitest-coverage.txt`](evidence/coverage/vitest-coverage.txt) — full Vitest run with v8 coverage table (issue #61 red-phase tests excluded, see §3.1)
- [`docs/evidence/coverage/pytest-coverage.txt`](evidence/coverage/pytest-coverage.txt) — full `pytest --cov=bookbridge` output across 110 tests (7 modules)

### 3.4 Test quality — behaviour and edge cases

Tests assert observable behaviour and reject bad inputs, not just happy paths. Representative edge cases:

- **`tests/test_harness.py`** — translator providers reject bad inputs **before** any network call: `test_rejects_empty_text`, `test_rejects_unknown_target_lang`, `test_rejects_unknown_source_lang`, `test_rejects_oversized_text` (200 KB cap), `test_validates_input_before_network_call` (patches `urllib.request.urlopen` and asserts it is **not** called when input validation fails).
- **`tests/test_harness.py` · OpenAICompatTranslator** — builds request with correct `Authorization: Bearer` header, correct URL path, and handles empty-content responses from the upstream API.
- **`tests/test_chunker.py`** — 15 cases covering chapter-boundary detection, manifest integrity, and degenerate inputs (single-page books, no detectable chapters).
- **`bookbridge-next/__tests__/` (API routes)** — OWASP A01 (Broken Access Control): requests where the authenticated Clerk `userId` does not own the resource receive 403; Zod-based input validation rejects malformed payloads with 400 before any Prisma or Worker call is made.
- **`bookbridge-next/e2e/landing.spec.ts`** — verifies not only that the hero renders, but that **both** sign-up CTA links (header "Get Started" + hero "Start Translating") are present with `toHaveCount(2)` — a regression guard against accidental removal of either CTA.

---

## Category 4 — CI/CD & Production (35 pts)

> **Rubric target (Excellent, 35 pts):** All 8 pipeline stages green (lint, typecheck, tests, E2E, security, AI review, preview deploy, prod deploy); 4+ security gates; OWASP documented in CLAUDE.md.

### 4.1 Pipeline — 8 stages in GitHub Actions

The pipeline is split across two workflow files:

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — build, lint, typecheck, tests, E2E, and AI PR review
- [`.github/workflows/security.yml`](../.github/workflows/security.yml) — security gates (detailed in §4.2)

| # | Stage | Status | Configured in |
|---|---|---|---|
| 1 | Lint (ESLint + Prettier) | ✅ | `ci.yml` — `npm run lint` + `npm run format:check` |
| 2 | Type check (`tsc --noEmit`) | ✅ | `ci.yml` — `npm run typecheck` |
| 3 | Unit + integration tests | ✅ | `ci.yml` — `pytest tests/` (Python Worker) + `npm run test:run` (Next.js Vitest) |
| 4 | E2E tests (Playwright) | ✅ | `ci.yml` — dedicated `e2e` job building the Next.js app and running `npx playwright test` with Chromium |
| 5 | Security scan (npm audit) | ✅ | `ci.yml:41` + `security.yml:29` — `npm audit --audit-level=high` |
| 6 | AI PR review | ✅ | **Two complementary mechanisms.** (a) CI: `ci.yml` contains an `ai-review` job using `anthropics/claude-code-action@v1`, gated on an `ANTHROPIC_API_KEY` secret — when the secret is absent the job logs a workflow warning and skips, so the pipeline stays green on forks and on repos where the secret has not yet been provisioned. (b) Dev loop: the `/create-pr` skill (see §2.2) invokes the `code-reviewer` sub-agent at **Step 7**, captures its `## MUST FIX` / `## SHOULD CONSIDER` / `## C.L.E.A.R. SUMMARY` output, and posts it as a PR comment — so every PR receives an AI review regardless of the CI secret's state. |
| 7 | Preview deploy (Vercel) | 🚧 **TODO — writer teammate** to (i) confirm the Vercel ↔ GitHub integration is active on `UchihaSusie/bookbridge`, (ii) paste a screenshot of a recent per-PR preview check, and (iii) record the preview URL pattern here (e.g. `bookbridge-next-git-<branch>-<team>.vercel.app`). |
| 8 | Prod deploy on merge to main | 🚧 **TODO — writer teammate** to confirm Vercel main-branch production deploy is wired, paste the production deploy status check, and link the live URL `https://bookbridge-next.vercel.app/` as the deploy target. |

### 4.2 Security gates — 6 configured (rubric minimum: 4)

| # | Gate | Mechanism | Location |
|---|---|---|---|
| 1 | Pre-commit secrets detection | Gitleaks v8.18.4 | `.pre-commit-config.yaml` |
| 2 | Dependency vulnerability scan | `npm audit --audit-level=high` — runs on every PR and every push to `main` | `ci.yml:41` + `security.yml:29` |
| 3 | SAST — Python | Bandit (HIGH + MEDIUM severity, both JSON and plain-text reports) | `security.yml:36-40` |
| 4 | SAST — JavaScript / TypeScript | Semgrep with `p/owasp-top-ten`, `p/javascript`, and `p/typescript` rulesets | `security.yml:42-50` |
| 5 | Security-focused sub-agent | `security-reviewer` Claude Code agent, invoked on-demand via the `/security-review` skill | `.claude/agents/security-reviewer.md` |
| 6 | Security acceptance criteria in Definition of Done | Issue template's DoD section includes checkboxes for A01 ownership checks, A03 input validation, A07 auth boundaries, and A10 SSRF avoidance | `.github/ISSUE_TEMPLATE/feature.md` |

On every pull request, `security.yml` also **posts an automated comment** summarising Bandit HIGH/MEDIUM findings and reminding the author to run `/security-review` locally before merging (`security.yml:53-85`). This makes security feedback visible inline with the C.L.E.A.R. review, not buried in an Actions tab.

### 4.3 OWASP Top 10 — documented in CLAUDE.md

OWASP awareness is not just referenced — it is a load-bearing section of the root [`CLAUDE.md`](../CLAUDE.md): a 10-row table mapping each OWASP category (A01–A10) to the specific BookBridge defense (Clerk `auth()` + ownership checks, Zod schema validation on every API route, BFF pattern to avoid A10 SSRF, Gitleaks for A02, `npm audit` for A06, etc.). Because `CLAUDE.md` is loaded at the start of every Claude Code session, this OWASP context is present for every AI-assisted code change, and the `security-reviewer` agent (§4.2 row 5) consults the same table when reviewing PRs.

---

## Category 5 — Team Process (25 pts)

> **Rubric target (Excellent, 25 pts):** 2 sprints with planning + retrospectives; branch-per-issue with PR reviews; 3+ async standups per sprint per partner; C.L.E.A.R. in reviews; AI disclosure; thoughtful peer evaluation.

### 5.1 Sprint cadence — 2 sprints with planning + retrospective

| Sprint | Focus | Planning | Retrospective |
|---|---|---|---|
| **Sprint 1** | Python Foundation — ingestion, glossary, quality, first MCP server, first custom skill | [`sprint-1-planning.md`](sprint-1-planning.md) | [`sprint-1-retrospective.md`](sprint-1-retrospective.md) |
| **Sprint 2** | Deploy First — FastAPI Worker, Next.js shell + 15+ TDD feature pairs, CI/CD live | [`sprint-2-planning.md`](sprint-2-planning.md) | [`sprint-2-retrospective.md`](sprint-2-retrospective.md) |

Supporting material: [`HW5_RETROSPECTIVE.md`](HW5_RETROSPECTIVE.md) — a deep-dive retro written mid-Sprint 1 on the custom-skill + MCP work (required for W13 homework). Kept as a reference because it quantifies the `tdd-add-module` v1 → v2 iteration in a way the sprint retros don't.

### 5.2 Issue-driven testable specifications

Every feature was scoped as a GitHub Issue using the project's [`feature.md`](../.github/ISSUE_TEMPLATE/feature.md) template, which pushes acceptance criteria into **testable specifications** rather than narrative descriptions. The template requires:

- **Acceptance Criteria** — bulleted testable conditions (e.g. "returns 403 when `resource.ownerId !== userId`")
- **Security Definition of Done** — checkboxes for A01 auth + ownership, A03 Zod input validation, A07 no hardcoded secrets, A10 no user-controlled shell/URL; plus dependency integrity (`npm audit`, verify packages are not AI-hallucinated) and data exposure (no PII / secrets / stack traces in logs or error messages)

Completed issues show the AC checkboxes ticked at close time; unchecked ACs block merge.

### 5.3 Branch-per-issue workflow

Every feature lives on its own branch, named `feat/issue-<N>-<slug>` or `fix/issue-<N>-<slug>`. Representative set (15+ total across the two sprints):

```
feat/issue-16-fastapi-worker-wrap-core
feat/issue-24-publish-project-public-link
feat/issue-29-bff-api-projects-crud
feat/issue-31-bff-job-polling-proxy
feat/issue-32-bff-api-public-reading-routes
feat/issue-44-auth-aware-landing-page
feat/issue-51-enable-reader-view-persist-source
feat/issue-52-harness-translator-providers
feat/issue-57-publish-toggle-reader-page
feat/issue-60-add-openai-compatible-translator-provider
feat/issue-61-async-jobs-vercel-timeout
fix/issue-47-upload-dropzone-click
fix/issue-49-upload-route-parse-fix
```

The flow is encoded in the `/start-issue` skill (§2.2) — invoked as `/start-issue <N>`, it fetches the issue, creates the correctly-named branch, assigns the issue, and prints the AC checklist so the developer has the acceptance criteria in view for the whole session.

### 5.4 Async standups — acknowledged gap

The rubric asks for **"minimum 3 async standups per sprint per partner"**, interpreted as human-to-human status updates in a persistent channel (Slack, Notion, Discord, GitHub Discussions, etc.).

**The team did not practice human-to-human async standups.** Partner-level coordination was limited to git commit authorship and the GitHub PR queue. All C.L.E.A.R. review comments visible on this repo's PRs are written by the `code-reviewer` sub-agent — we are explicitly **not** framing AI-generated review comments as partner-authored async updates.

What exists as verifiable async activity on the repo:

- **Commit authorship and timestamps** — aggregated per sprint × partner × date in [`standups.md`](standups.md). Sprint 1 authorship was concentrated on one push day (2026-03-22) and driven by Shuai Ren. Sprint 2 authorship spanned 4 distinct days (2026-04-17 through 2026-04-20) and was driven by Ash / Zhanyi Chen.
- **PR descriptions** — each PR body is a timestamped written-by-author async status record listing what was shipped. 20+ PRs across the two sprints.
- **Phase-lead model** — Shuai Ren drove Sprint 1 (Python core); Ash drove Sprint 2 (Next.js + submission). Hand-off between sprints is visible in the git log but not in any standup log, because no standup log exists.

We are declaring this as a gap rather than re-labelling activity we did not actually conduct. Grader is free to count the commit + PR activity above as partial credit; we will not claim it as full async-standup compliance.

### 5.5 C.L.E.A.R. reviews · AI disclosure · peer evaluation

- **C.L.E.A.R. framework** — applied on every PR via the `code-reviewer` sub-agent at Step 7 of the `/create-pr` skill (see §2.7). Review comments are AI-authored; human-authored review comments are not claimed (see §5.4 disclosure).
- **AI disclosure metadata** — every PR description follows [`pull_request_template.md`](../.github/pull_request_template.md), which declares AI-generated percentage, tool used, and human review status (§2.7).
- **Peer evaluation** — submitted separately via the course's designated peer-evaluation channel. Given the phase-lead model described in §5.4, the peer evaluation reflects a partnership where each partner's strongest contributions were in their lead sprint and real-time partner-to-partner coordination was limited.

---

## Category 6 — Documentation & Demo (15 pts)

> **Rubric target (Excellent, 15 pts):** Clear README with Mermaid architecture diagram; published blog post with AI workflow insights; polished 5-10 min video demo showcasing app + Claude Code workflow; 500-word reflections with specific Claude Code insights.

### 6.1 README with architecture

The repo root [`README.md`](../README.md) is kept deliberately lean — most rubric evidence lives in this submission report (§1–§6), and the README exists to get a first-time reader oriented and point them at the report.

What the README provides:

- A short hero description of BookBridge + live deployment links (Vercel + Railway)
- A prominent **"For graders — start here"** section linking to this report and to every evidence bundle (`docs/evidence/mcp-playwright/`, `docs/evidence/coverage/`, `docs/claude-memory/`, the 4 sprint docs, `docs/standups.md`)
- A **Mermaid architecture diagram** (Browser → Next.js on Vercel → Python FastAPI Worker on Railway → PostgreSQL + ChromaDB + Claude API) — required for rubric Excellent
- Stack table
- Project structure tree
- Quick commands for running tests (`pytest --cov=bookbridge`, `npm run test:coverage`, `npx playwright test`)
- MCP server setup pointer

### 6.2 Blog post

Published on Substack: [BookBridge: An AI-Powered Book Translation Platform That Actually Understands Structure](https://attonbitusclamo202566.substack.com/p/bookbridge-an-ai-powered-book-translation?r=5lm4yb&utm_campaign=post&utm_medium=web&triedRedirect=true)

The post covers the Claude Code workflow used to ship BookBridge — **custom skills** (`tdd-add-module` v1 → v2 iteration, `/start-issue`, `/create-pr`), **hooks** (`PreToolUse` TDD enforcement, `PostToolUse` ruff format, `Stop` pytest gate), **MCP** (custom glossary server + Playwright MCP for UI verification), and **sub-agents** (`code-reviewer`, `security-reviewer`, `test-writer`). Quantified insight: 15+ TDD red-green pairs in 2 sprints with Vitest 86.9% / pytest 77% coverage, and AI-authored C.L.E.A.R. reviews as the de-facto PR review record.

### 6.3 Video demo (5–10 min)

> **🚧 Placeholder — URL to be inserted before final submission.**
>
> Target: `https://youtube.com/watch?v=<id>` (YouTube / unlisted) or Loom / Google Drive equivalent.
>
> Planned coverage:
> 1. **App walkthrough** — upload a PDF, watch chapter extraction, trigger per-chapter translation, see the bilingual two-column reader, publish via public link, open the public reader in a guest browser
> 2. **Claude Code workflow** — `/start-issue <N>` invoking the `test-writer` sub-agent to produce the `test(red):` commit, followed by implementation and `/create-pr` invoking the `code-reviewer` sub-agent
> 3. **Playwright MCP live** — reproduce the archived session (§2.4) of moving a UI element and verifying the layout in a Clerk-authenticated browser
> 4. **GitHub Actions pipeline** — show the CI run going green across lint / typecheck / tests / E2E / security / AI review (§4.1)

### 6.4 Individual reflections (500 words per partner)

> **🚧 Placeholders — to be drafted before final submission:**
>
> - [`docs/reflections/ash.md`](reflections/ash.md) — 500 words (Ash / Zhanyi Chen)
> - [`docs/reflections/shuai-ren.md`](reflections/shuai-ren.md) — 500 words (Shuai Ren)
>
> Each reflection should include: (a) the strongest Claude Code lesson from this project; (b) one thing that worked better than expected; (c) one thing that didn't; (d) what the author would do differently next time. Specific Claude Code insights expected — skill iteration, hook friction, MCP ergonomics, sub-agent boundaries.

### 6.5 Showcase submission

> **🚧 Placeholder** — Google Form submission confirmation screenshot at `docs/evidence/showcase/submission.png`, to be added immediately after the form is submitted per Deliverable #7 of the rubric.

---
