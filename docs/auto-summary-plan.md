# Auto-Summary and Contextual Translation Architecture

## Goal
Refactor the translation workflow to automate chapter summaries immediately after translation, provide smarter context retrieval using nearest-preceding summaries, and replace the slow batch-summarize UI with a targeted single-chapter approach. All summaries will be generated in English based on the source text.

## Interface & Data Flow Modifications

### 1. Python Worker Internal Processing (`worker_api/routes.py`)
- **Current**: `translate_and_callback` receives `source_text`, translates it, and sends the result back.
- **Change**: After a successful translation, reuse the existing LLM credentials to invoke `chat_completion` and generate a 100-word English summary based on the `source_text`.
- **Interface**: The `post_worker_callback` payload will now include an additional key: `"summary": "..."`.

### 2. Webhook Receiver: Python -> Next.js (`app/api/internal/worker-callback/route.ts`)
- **Current**: Validates `job_id`, `status`, `translated_content`. Updates `Chapter.translation` via Prisma.
- **Change**: 
  - Update `bodySchema` to include `summary: z.string().optional()`.
  - In the `prisma.$transaction`, update both `translation: payload.translated_content` and `summary: payload.summary`.

### 3. Context Assembly: Next.js -> Python (`app/api/jobs/route.ts`)
- **Current**: Queries strict adjacent chapters (`number - 1` and `number + 1`) regardless of whether they have summaries.
- **Change**: 
  - Query for chapters where `projectId` matches, `number < chapter.number`, and `summary: { not: null }`.
  - Order by `number: 'desc'` and `take: 2`.
  - Concatenate these summaries to pass as the `context` field to the Python worker.

### 4. Manual Summary API (`app/api/projects/[id]/summarize/route.ts`)
- **Current**: Scans the entire project for chapters without summaries and initiates a background worker loop (very slow).
- **Change**: Refactor to accept a specific `chapterId` in the request body. It will trigger a `/summarize` request to the Python worker for that single chapter and store it in the database.

### 5. UI Layer (`ChapterExplorer.tsx` & `TranslateButton.tsx`)
- **Change 1**: Remove the batch "Generate Summaries" button from the left sidebar to prevent full-book blocking operations.
- **Change 2**: Add a new action next to the Translate button in the main panel. If a summary exists, show a "View Summary" toggle. If a summary does not exist, show a "Generate Summary" button that calls the refactored single-chapter API.
