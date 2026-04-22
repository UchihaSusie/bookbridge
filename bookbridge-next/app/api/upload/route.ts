import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { workerFetch } from '@/lib/worker'

// /parse walks every page of the PDF and runs OCR-cleanup; a 300-page book can
// legitimately take 30+ seconds on a cold worker. Lift the route budget so the
// platform doesn't kill us before the worker responds. maxDuration is a no-op
// on local dev and on Vercel hobby (capped at 10s) but required for Pro.
export const maxDuration = 60
const PARSE_TIMEOUT_MS = 55_000

interface WorkerChunk {
  chunk_id: number
  title: string
  start_page: number
  end_page: number
  page_count: number
  content?: string | null
}

interface WorkerParseResponse {
  job_id: string
  status: string
  chunks?: WorkerChunk[]
  error?: string | null
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string) || 'Untitled'
  const targetLang = (formData.get('targetLang') as string) || 'zh-Hans'
  const chapterCountRaw = formData.get('chapterCount') as string | null
  const chapterCount = chapterCountRaw ? parseInt(chapterCountRaw, 10) : null

  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json(
      { error: 'A PDF file is required.' },
      { status: 400 }
    )
  }

  await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email: `${userId}@placeholder.local` },
  })

  const project = await prisma.project.create({
    data: {
      title,
      sourceFile: file.name,
      targetLang,
      ownerId: userId,
      status: 'PARSING',
    },
  })

  const workerForm = new FormData()
  workerForm.append('file', file)
  if (chapterCount && chapterCount > 0) {
    workerForm.append('chapter_count', String(chapterCount))
  }

  let parseData: WorkerParseResponse | null = null
  let workerErrorDetail: string | null = null
  let workerErrorStatus: number | null = null

  try {
    const workerRes = await workerFetch('/parse', {
      method: 'POST',
      body: workerForm,
      timeoutMs: PARSE_TIMEOUT_MS,
    })
    if (workerRes.ok) {
      parseData = (await workerRes.json()) as WorkerParseResponse
    } else {
      workerErrorStatus = workerRes.status
      try {
        const errJson = await workerRes.json()
        workerErrorDetail =
          typeof errJson?.detail === 'string' ? errJson.detail : 'Worker error'
      } catch {
        workerErrorDetail = 'Worker error'
      }
    }
  } catch (err) {
    workerErrorDetail = err instanceof Error ? err.message : 'Worker unavailable'
  }

  const chunks = parseData?.chunks ?? []

  if (chunks.length > 0 && parseData) {
    await prisma.$transaction([
      prisma.chapter.createMany({
        data: chunks.map((ch) => ({
          projectId: project.id,
          number: ch.chunk_id,
          title: ch.title,
          startPage: ch.start_page,
          endPage: ch.end_page,
          pageCount: ch.page_count,
          sourceContent: typeof ch.content === 'string' ? ch.content : null,
        })),
      }),
      prisma.translationJob.create({
        data: {
          projectId: project.id,
          status: 'COMPLETED',
          workerId: parseData.job_id,
        },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: { status: 'READY' },
      }),
    ])
    return NextResponse.json({ projectId: project.id })
  }

  const errorMessage = workerErrorDetail ?? 'Worker returned no chapters'
  await prisma.$transaction([
    prisma.translationJob.create({
      data: {
        projectId: project.id,
        status: 'FAILED',
        workerId: parseData?.job_id ?? null,
        error: errorMessage,
      },
    }),
    prisma.project.update({
      where: { id: project.id },
      data: { status: 'DRAFT' },
    }),
  ])

  const clientStatus = workerErrorStatus === 422 || workerErrorStatus === 413 ? workerErrorStatus : 502
  return NextResponse.json(
    { projectId: project.id, error: errorMessage },
    { status: clientStatus }
  )
}
