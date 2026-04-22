import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import prisma from '@/lib/prisma'

// Server-to-server endpoint. The Python Worker POSTs here with the result of
// a background /translate/chunk/async translation. We verify a shared secret
// in X-Worker-Secret and then persist the outcome so the BFF poller can see
// it. No user auth — Clerk is not in this path.

const bodySchema = z.union([
  z.object({
    job_id: z.string().min(1).max(128),
    status: z.literal('SUCCEEDED'),
    translated_content: z.string().min(1),
    summary: z.string().optional(),
  }),
  z.object({
    job_id: z.string().min(1).max(128),
    status: z.literal('FAILED'),
    error: z.string().optional(),
  }),
])

function secretsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export async function POST(req: NextRequest) {
  const expected = process.env.WORKER_CALLBACK_SECRET
  if (!expected) {
    console.error('[worker-callback] WORKER_CALLBACK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Callback receiver not configured' },
      { status: 500 }
    )
  }

  const provided = req.headers.get('x-worker-secret') ?? ''
  if (!provided || !secretsEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid callback body' }, { status: 400 })
  }

  const payload = parsed.data

  const data =
    payload.status === 'SUCCEEDED'
      ? { status: 'SUCCEEDED' as const, translatedContent: payload.translated_content }
      : { status: 'FAILED' as const, error: payload.error ?? 'Translation failed' }

  try {
    // Atomic: the poller must never observe a SUCCEEDED job whose
    // chapter.translation is still null. Old sync path wrapped both writes
    // in a transaction; we preserve that invariant here.
    await prisma.$transaction(async (tx) => {
      const job = await tx.translationJob.update({
        where: { id: payload.job_id },
        data,
        select: { id: true, chapterId: true },
      })

      if (payload.status === 'SUCCEEDED' && job.chapterId) {
        await tx.chapter.update({
          where: { id: job.chapterId },
          data: {
            translation: payload.translated_content,
            ...(payload.summary ? { summary: payload.summary } : {}),
          },
        })
      }
    })
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    console.error('[worker-callback] failed to update job', {
      jobId: payload.job_id,
      err: String(err),
    })
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
