import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

const jobIdSchema = z.string().cuid()

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params

  if (!jobIdSchema.safeParse(jobId).success) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
  }

  const job = await prisma.translationJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      translatedContent: true,
      error: true,
      project: { select: { ownerId: true } },
    },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.project.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: {
    id: string
    status: string
    translatedContent?: string
    error?: string
  } = { id: job.id, status: job.status }

  if (job.status === 'SUCCEEDED' && job.translatedContent) {
    body.translatedContent = job.translatedContent
  }
  if (job.status === 'FAILED' && job.error) {
    body.error = job.error
  }

  return NextResponse.json(body, { headers: NO_STORE })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params

  if (!jobIdSchema.safeParse(jobId).success) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
  }

  const job = await prisma.translationJob.findUnique({
    where: { id: jobId },
    select: { project: { select: { ownerId: true } } },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.project.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.translationJob.delete({ where: { id: jobId } })

  return NextResponse.json({ ok: true })
}
