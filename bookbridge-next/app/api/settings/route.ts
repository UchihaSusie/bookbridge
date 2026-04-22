import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

const updateSchema = z.object({
  apiKey: z.string().max(256).optional().nullable(),
  apiProvider: z.enum(['openai', 'claude', 'deepseek', 'custom']).optional(),
  apiBaseUrl: z.string().url().max(512).optional().nullable(),
})

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { apiProvider: true, apiBaseUrl: true, apiKey: true },
  })

  if (!user) {
    return NextResponse.json({ apiProvider: 'openai', apiBaseUrl: null, hasApiKey: false })
  }

  return NextResponse.json({
    apiProvider: user.apiProvider,
    apiBaseUrl: user.apiBaseUrl,
    hasApiKey: !!user.apiKey,
  })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.apiProvider !== undefined) data.apiProvider = parsed.data.apiProvider
  if (parsed.data.apiBaseUrl !== undefined) data.apiBaseUrl = parsed.data.apiBaseUrl
  if (parsed.data.apiKey !== undefined) data.apiKey = parsed.data.apiKey

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: data,
    create: {
      clerkId: userId,
      email: `${userId}@placeholder.local`,
      ...data,
    },
    select: { apiProvider: true, apiBaseUrl: true, apiKey: true },
  })

  return NextResponse.json({
    apiProvider: user.apiProvider,
    apiBaseUrl: user.apiBaseUrl,
    hasApiKey: !!user.apiKey,
  })
}
