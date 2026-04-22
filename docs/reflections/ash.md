# Individual Reflection — Zhanyi Chen (Ash)
**Project:** BookBridge | **Course:** AI Assisted Coding (Vibe Coding)

---

## (a) Strongest Claude Code Lesson: TDD Alone Isn't Enough

I came into this project thinking that if the tests pass, the feature works. I left with a different opinion.

In Sprint 2, Claude wrote `POST /api/jobs` as a synchronous endpoint — call the Worker, wait for translation, return the result. My TDD tests checked the response shape, error states, and auth. All green. What none of them tested was time. Real translations with DeepSeek take well over 10 seconds. Vercel's hobby-tier timeout is 10 seconds. The endpoint was guaranteed to fail on any real input, and the test suite had no idea.

I only caught it during a manual smoke test with an actual API key — the UI just froze. PR #65 was the full fix: `POST /api/jobs` now returns `202 Accepted` immediately, the Worker translates in the background and POSTs results back to `/api/internal/worker-callback`, and the frontend polls `GET /api/jobs/:id` every two seconds. One of the new TDD tests explicitly asserts the BFF returns 202 even when the Worker sleeps 30 seconds — that test would have caught the original bug on day one.

The real lesson: I never told Claude that timing mattered. TDD checks what the code does. Smoke tests check how it holds up in the real world. You need both.

## (b) What Worked Better Than Expected: `start-issue` and `create-pr`

I didn't expect workflow skills to make that much of a difference, but `start-issue` and `create-pr` genuinely changed how we worked as a pair.

`start-issue` pulled the issue details, created the branch, and put the acceptance criteria right in front of me before I wrote anything. `create-pr` handled the description, C.L.E.A.R. checklist, and AI disclosure every single time without me thinking about it. But the bigger win was consistency — my partner and I stopped producing PRs in different formats. Once the skill encoded our Definition of Done, we didn't need to coordinate it anymore. Documentation would never have enforced that as reliably.

## (c) What Didn't Work: Running Everything on Every Change

I set up the full test suite to run after each file change and triggered the `code-reviewer` sub-agent on every PR. In theory: rigorous. In practice: a one-line fix was eating 3–5 minutes and a noticeable chunk of tokens before I could move on.

The problem is that a sub-agent reviewer can't tell a rename from a database schema change — it gives both the same treatment. Over dozens of small commits, that adds up fast. I should have scoped the full review to PRs that actually touch routes, data models, or auth, and used a lightweight lint check for everything else.

## (d) What I'd Do Differently: Read the Changelog First

Partway through the project I found out that Claude Code had moved skills to `.claude/commands/`, which meant I'd been typing `skill run /create-pr` manually instead of just `/create-pr`. Not a disaster, but annoying — and completely avoidable.


