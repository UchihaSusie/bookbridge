# BookBridge Workflow Checklist

> 本文档依据 `HW-rubic/HW-rubics.md` Rubric（共 200 分）整理，每项均标注所属评分项及分值依据。
> 每项附有推荐时机，请在对应阶段完成后打勾。

---

## Application Quality（40 分）

> Rubric: *"Production-ready, deployed on Vercel, polished UI, 2+ user roles, real problem solved, portfolio-worthy"*

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ⬜ | 生产就绪（Production-ready），UI 精良 | Application Quality 40pts | Sprint 4 |
| ⬜ | 2+ 用户角色或独立功能区域 | Functional Requirements: "2+ user roles or distinct feature areas" | Sprint 2–3 |
| ⬜ | 解决真实问题，portfolio 级别质量 | Functional Requirements: "Real-world use case, portfolio/interview-worthy" | Sprint 4 |
| ⬜ | 通过公开 URL 可访问（Vercel 部署） | Functional Requirements: "Deployed and accessible via public URL" | Sprint 2 |

---

## Architecture（Technical Requirements）

> Rubric: Technical Requirements → Architecture

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | Next.js App Router 全栈应用 | Architecture: "Next.js full-stack application (App Router or Pages Router)" | Sprint 1 已确立 |
| ✅ | PostgreSQL 数据库 | Architecture: "Database (PostgreSQL recommended, or equivalent)" | Sprint 1 已确立 |
| ⬜ | 身份认证（Clerk 已选定） | Architecture: "Authentication (Auth.js/NextAuth, Clerk, or equivalent)" | Sprint 2 |
| ⬜ | 部署至 Vercel，支持 Preview Deploy | Architecture: "Deployed on Vercel (or equivalent platform with preview deploys)" | Sprint 2 |

---

## Claude Code Mastery（55 分）

> Rubric: *"Rich CLAUDE.md with @imports and git evolution; 2+ iterated skills with usage evidence; 2+ hooks enforcing quality; MCP server integrated via .mcp.json; agents with evidence; parallel worktree development; 2+ PRs with writer/reviewer + C.L.E.A.R. + AI disclosure"*

### CLAUDE.md & Memory（W10）

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | Comprehensive CLAUDE.md，使用 @imports 模块化组织 | Claude Code Mastery: "Comprehensive CLAUDE.md with @imports for modular organization" | Sprint 1 已完成 |
| ✅ | CLAUDE.md 演进在 git history 中可见 | Claude Code Mastery: "Evidence of CLAUDE.md evolution across the project (visible in git history)" | 持续 |
| ✅ | 项目约定、架构决策、测试策略已文档化 | Claude Code Mastery: "Project conventions, architecture decisions, and testing strategy documented" | Sprint 1 已完成 |
| ✅ | OWASP Top 10 awareness 记录在 CLAUDE.md | Security: "OWASP top 10 awareness documented in CLAUDE.md" | **Sprint 2 开始前** |
| ⬜ | Auto-memory 使用（session memory 有记录/截图） | Claude Code Mastery: "Auto-memory usage for persistent project context" | 持续，截止前截图留证 |

### Custom Skills（W12）— 最少 2 个，当前已有 3 个

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | `tdd-add-module` skill v1→v2（已从 v1 迭代） | Custom Skills: "At least one skill iterated from v1 to v2 based on real usage" | Sprint 1 已完成 |
| ✅ | `start-issue` skill（fetch issue, create branch, print AC） | Custom Skills: "At least 2 skills in `.claude/skills/`" | Sprint 1 已完成 |
| ✅ | `create-pr` skill（quality checks, C.L.E.A.R. PR + AI disclosure） | Custom Skills: "At least 2 skills in `.claude/skills/`" | Sprint 1 已完成 |
| ⬜ | 所有 skill 均有团队使用证据（session log / 截图） | Custom Skills: "Evidence of team usage (session logs or screenshots)" | 持续收集 |

### Hooks（W12）— 最少 2 个

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | PostToolUse hook（ruff format + ruff check --fix on Write/Edit） | Hooks: "At least one PreToolUse or PostToolUse hook" | 已完成 |
| ✅ | Stop hook（pytest quality gate — runs `pytest tests/ -q --tb=short` on session end） | Hooks: "At least one quality-enforcement hook (e.g., Stop hook that runs tests)" | 已完成 |
| ✅ | PreToolUse TDD guard（warns on `feat(next):` commit without prior `test(red):` on branch） | Hooks: "At least 2 hooks configured in `.claude/settings.json`" | 已完成 |
| ✅ | 共至少 2 个 hook 配置在 `.claude/settings.json`（现有 3 个：PostToolUse + Stop + PreToolUse） | Hooks: "At least 2 hooks configured in `.claude/settings.json`" | 已完成 |

### MCP Servers（W12）— 最少 1 个

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | Glossary MCP server 已实现 | MCP Servers: "At least 1 MCP server integrated" | Sprint 1 已完成 |
| ✅ | `.mcp.json` 配置文件提交至仓库 | MCP Servers: "Configuration shared via `.mcp.json` in repository" | Sprint 1 已完成 |
| ⬜ | 开发工作流中有使用证据（session log / 截图） | MCP Servers: "Evidence of use in development workflow (session logs or screenshots)" | 持续收集 |

### Agents（W12-W13）— 最少 1 个，三选一

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | Sub-agents 在 `.claude/agents/`（`security-reviewer` + `code-reviewer` + `product-architect` + `test-writer`） | Agents: "Custom sub-agents in `.claude/agents/`" | 2026-04-17 完成（4 agents） |
| ⬜ | 有使用证据（session log / PR / 截图显示 agent 输出） | Agents: "Evidence of use (session log, PR, or screenshots showing agent output)" | 持续收集 |

> `security-reviewer` 同时满足「Agents」和「Security Gate 3 SAST」两条要求。`code-reviewer` 提供 C.L.E.A.R. 结构化 review，开发过程中手动调用（`/code-reviewer`），PR 提交后 CI 自动运行 security review 并以 PR comment 形式留证。`test-writer` 在 `/start-issue` Step 7 中自动调用，写入失败测试并提交 `test(red):`，确保 TDD git 历史证据。

### Parallel Development（W12）

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ⬜ | 使用 git worktree 进行并行功能开发 | Parallel Development: "Evidence of worktree usage for parallel feature development" | **Sprint 3** |
| ⬜ | 至少 2 个 feature 并行开发（git branch history 可见） | Parallel Development: "At least 2 features developed in parallel (visible in git branch history)" | Sprint 3–4 |

### Writer/Reviewer Pattern + C.L.E.A.R.（W12）

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ⬜ | 至少 2 个 PR 使用 writer/reviewer pattern（一个 agent 写，另一个审查） | Writer/Reviewer: "At least 2 PRs using the writer/reviewer pattern (one agent writes, another reviews)" | **Sprint 2 起每个 PR 都做** |
| ✅ | PR review 中有 C.L.E.A.R. 框架（visible in PR comments） | Writer/Reviewer: "C.L.E.A.R. framework applied in PR reviews (visible in PR comments)" | 基础设施已就绪 |
| ✅ | PR body 包含 AI disclosure metadata（% AI-generated、tool used、human review applied） | Writer/Reviewer: "AI disclosure metadata in PRs (% AI-generated, tool used, human review applied)" | 基础设施已就绪 |

> **基础设施已全部就绪：**
> - `.github/pull_request_template.md` — 每个 PR 自动包含 AI disclosure 表格和 C.L.E.A.R. self-review checklist
> - `security.yml` CI — 每个 PR 自动运行 Claude security review 并以 PR comment 形式发布（满足"visible in PR comments"要求）
> - `/code-reviewer` — 开发过程中手动调用，发现问题后返回 writer 修改，再开 PR
> - **剩余工作**：提交 2+ 个实际 PR，使上述流程留下可见记录

---

## Testing & TDD（30 分）

> Rubric: *"TDD red-green-refactor for 3+ features visible in git; 70%+ coverage; unit + integration + E2E (Playwright); tests verify behavior and edge cases"*

### Infrastructure（一次性准备工作）

| 状态 | 要求 | 推荐时机 |
|---|---|---|
| ✅ | `test-writer` sub-agent 创建（`.claude/agents/test-writer.md`）— 自动写失败测试并提交 `test(red):` | 2026-04-17 完成 |
| ✅ | `start-issue` Step 7 — `feat`/`next.js`/`tdd` label 的 issue 自动触发 `test-writer` | 2026-04-17 完成 |
| ✅ | Bootstrap Vitest + coverage (`vitest.config.ts`, `vitest.setup.ts`, 70% thresholds on `app/api/**` + `lib/**`) | 已完成 2026-04-17 |
| ✅ | Bootstrap Playwright (`playwright.config.ts`, `e2e/` 目录, chromium project, storageState auth) | 已完成 2026-04-17 |

### TDD Features（需要在 git history 中留证）

每个 Next.js feature 的完整流程：`/start-issue <N>` → test-writer 自动提交 `test(red):` → 实现代码 → `feat(next):` commit → `refactor:` commit（如有）

| 状态 | Feature | git 证据要求 | 推荐时机 |
|---|---|---|---|
| ⬜ | **Feature 1**: `POST /api/upload`（PDF → Worker /parse → chapter list） | `test(red): add failing tests for POST /api/upload` 先于 `feat(next): implement POST /api/upload` | Sprint 2 |
| ⬜ | **Feature 2**: `POST /api/jobs`（create translation job） | `test(red): add failing tests for POST /api/jobs` 先于 `feat(next): implement POST /api/jobs` | Sprint 2–3 |
| ⬜ | **Feature 3**: `GET /api/projects/[id]/glossary`（fetch glossary terms） | `test(red): add failing tests for GET /api/glossary` 先于 `feat(next): implement GET /api/glossary` | Sprint 3 |

> **验证方法（grader 视角）：** `git log --oneline` 中，每个 Feature 的 `test(red):` commit SHA 必须早于对应的 `feat(next):` commit SHA。

### Coverage & E2E

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ⬜ | Unit + integration tests（Vitest）— API route handlers，含 auth guard / input validation / ownership / edge case | TDD: "Unit + integration tests (Vitest or Jest)" | Sprint 2 起，每个 feature |
| ⬜ | 至少 1 个 E2E test（Playwright）— 覆盖 upload → job → view 全流程 | TDD: "At least 1 E2E test (Playwright)" | Sprint 3–4 |
| ⬜ | 70%+ 测试覆盖率（`npx vitest run --coverage`，threshold 配置在 `vitest.config.ts`） | TDD: "70%+ test coverage" | Sprint 4 前达到 |

### 下一步行动清单（按优先级）

1. ✅ ~~`vitest.config.ts` + `vitest.setup.ts` + `playwright.config.ts` 已创建，`ci.yml` 已配置~~
2. **Sprint 2 第一步**：初始化 Next.js app（`npx create-next-app@15 ...`），安装 `vitest @vitest/coverage-v8 @testing-library/react @playwright/test`，提交 `feat(next): bootstrap Next.js app with Vitest + Playwright`
3. **每个 Sprint 2 feature issue**：`/start-issue <N>` → test-writer 自动提交 `test(red):` → 实现 → `feat(next):`
4. **Sprint 2 结束前**：确认 `git log` 中有 2+ 对 `test(red):` / `feat(next):` commit 对；开 2+ 个 PR 留下 writer/reviewer 证据
5. **Sprint 3**：完成第 3 个 TDD feature；写 `e2e/upload-and-translate.spec.ts`（先 `test(red):` commit，再实现 UI）
6. **Sprint 4 结束前**：`npm run test:coverage` 输出 ≥70%，截图留证；连接 Vercel，开 production deploy

---

## CI/CD Pipeline（35 分）— GitHub Actions

> Rubric: *"All 8 pipeline stages green (lint, typecheck, tests, E2E, security, AI review, preview, prod deploy); 4+ security gates; OWASP in CLAUDE.md"*

| 状态 | 阶段 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | Lint（ESLint + Prettier）— `ci.yml` `nextjs` job 中 `npm run lint`，`hashFiles('package.json')` guard | CI/CD: "Lint (ESLint + Prettier)" | ci.yml 已配置，Next.js init 时自动激活 |
| ✅ | Type checking（tsc --noEmit）— `ci.yml` `nextjs` job 中 `npm run typecheck`，同上 guard | CI/CD: "Type checking (tsc --noEmit)" | ci.yml 已配置，Next.js init 时自动激活 |
| ✅ | Unit / integration tests — `ci.yml` `nextjs` job `npm run test:coverage`，coverage artifact 上传 | CI/CD: "Unit and integration tests" | ci.yml 已配置，Next.js init 时自动激活 |
| ✅ | E2E tests（Playwright）— `ci.yml` `e2e` job，`hashFiles('playwright.config.ts')` guard（文件已存在） | CI/CD: "E2E tests (Playwright)" | ci.yml 已配置，E2E 测试写完后自动运行 |
| ✅ | Security scan（npm audit — `security.yml`） | CI/CD: "Security scan (npm audit)" | 已完成 |
| ✅ | AI PR review（Claude security review posted as PR comment via `security.yml`） | CI/CD: "AI PR review (claude-code-action or claude -p)" | Sprint 2 已完成 |
| ⬜ | Preview deploy（Vercel，每个 PR） | CI/CD: "Preview deploy (Vercel)" | **Sprint 2**（Vercel 连接后自动） |
| ⬜ | Production deploy on merge to main | CI/CD: "Production deploy on merge to main" | **Sprint 2** |

---

## Security Gates（35 分中的安全部分）— 最少 4 个

> Rubric: *"minimum 4 gates from the 8-gate pipeline"* — **已满足（5/8 active）**

| 状态 | Gate | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | Pre-commit secrets detection（Gitleaks — `.pre-commit-config.yaml`） | Security: "Pre-commit secrets detection (Gitleaks or equivalent)" | Sprint 2 已完成 |
| ✅ | Dependency scanning（npm audit in CI — `.github/workflows/security.yml`） | Security: "Dependency scanning (npm audit in CI)" | Sprint 2 已完成 |
| ✅ | Security-focused sub-agent（`security-reviewer.md` in `.claude/agents/` + CI PR comment） | Security: "At least one SAST tool or security-focused sub-agent" | Sprint 2 已完成 |
| ✅ | Security acceptance criteria in Definition of Done（`.github/ISSUE_TEMPLATE/feature.md`） | Security: "Security acceptance criteria in Definition of Done" | Sprint 2 已完成 |
| ✅ | OWASP Top 10 awareness 记录在 CLAUDE.md | Security: "OWASP top 10 awareness documented in CLAUDE.md" | Sprint 2 已完成 |

---

## Team Process（25 分）

> Rubric: *"2 sprints with planning + retrospectives; branch-per-issue with PR reviews; 3+ async standups/sprint/partner; C.L.E.A.R. in reviews; AI disclosure; thoughtful peer evaluation"*

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | Sprint 1 retrospective 文档 | Team Process: "2 sprints documented (sprint planning + retrospective each)" | Sprint 1 已完成 |
| ✅ | Sprint 2 planning 文档（`docs/sprint-2-planning.md`） | Team Process: "2 sprints documented" | 已完成 2026-04-17 |
| ⬜ | Sprint 2 retrospective 文档 | Team Process: "2 sprints documented" | Sprint 2 结束时 |
| ⬜ | GitHub Issues 含可测试的 Acceptance Criteria | Team Process: "GitHub Issues with acceptance criteria as testable specifications" | **Sprint 2 起强制执行** |
| ⬜ | Branch-per-issue workflow，所有 PR 对应 issue，含 PR review | Team Process: "Branch-per-issue workflow with PR reviews" | **Sprint 2 起强制执行** |
| ⬜ | Async standups（每人每 sprint 至少 3 次，留存记录） | Team Process: "Async standups (minimum 3 per sprint per partner)" | 持续，每 sprint 至少 3 次 |
| ✅ | C.L.E.A.R. framework 用于 PR reviews（PR comments 可见） | Team Process: "C.L.E.A.R. framework applied in PR reviews" | 基础设施已就绪（CI 自动发布 PR comment） |
| ⬜ | Peer evaluations | Team Process: "Peer evaluations" | 截止前提交 |

---

## Documentation & Demo（15 分）

> Rubric: *"Clear README with Mermaid architecture diagram; published blog post with AI workflow insights; polished 5-10 min video demo; 500-word reflections with specific Claude Code insights"*

| 状态 | 交付物 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ✅ | README 含 Mermaid 架构图 | Documentation: "Clear README with Mermaid architecture diagram" | Sprint 1 已完成 |
| ⬜ | Technical blog post 发布（Medium / dev.to） | Deliverables #4: "Technical blog post (published on Medium, dev.to, or similar)" | Sprint 4 结束后 |
| ⬜ | Video demo（5–10 min，展示 app + Claude Code workflow） | Deliverables #5: "Video demonstration (5-10 min, showcasing app + Claude Code workflow)" | Sprint 4 结束后 |
| ⬜ | Individual reflections（每人 500 words，含 Claude Code 具体见解） | Deliverables #6: "Individual reflections (one per partner, 500 words)" | 截止前提交 |
| ✅ | GitHub repo 完整 `.claude/` 配置（skills, hooks, agents, MCP） | Deliverables #1: "GitHub repository with full `.claude/` configuration" | hooks 已完成（PostToolUse + Stop + PreToolUse） |
| ⬜ | Vercel production URL | Deliverables #2: "Deployed application (Vercel production URL)" | Sprint 2 结束即可访问 |
| ⬜ | Showcase submission（Google Form：项目名、URL、缩略图、视频、博客） | Deliverables #7: "Showcase submission via Google Form" | 截止日当天 |

---

## Bonus（最多 +10 分）

> Rubric: *"Bonus (up to 10 extra points)"*

| 状态 | 要求 | Rubric 依据 | 推荐时机 |
|---|---|---|---|
| ⬜ | Property-based testing with fast-check | Bonus: "+3 pts" | Sprint 3–4 |
| ⬜ | Mutation testing with Stryker | Bonus: "+3 pts" | Sprint 3–4 |
| ⬜ | Agent SDK feature applying W13 patterns（内置到应用中） | Bonus: "+4 pts" | Sprint 3–4 |

---

## 评分汇总

| 类别 | 分值 | 对应章节 |
|---|---|---|
| Application Quality | 40 | Application Quality |
| Claude Code Mastery | 55 | Claude Code Mastery |
| Testing & TDD | 30 | Testing & TDD |
| CI/CD & Production | 35 | CI/CD Pipeline + Security Gates |
| Team Process | 25 | Team Process |
| Documentation & Demo | 15 | Documentation & Demo |
| **合计** | **200** | |
| Bonus | +10 | Bonus |

> **Note:** 个人成绩由 peer evaluations 调整（±10%）。
