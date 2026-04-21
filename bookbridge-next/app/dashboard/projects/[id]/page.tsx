import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { FileText, BookOpen, ArrowLeft } from 'lucide-react'
import TranslateButton from './TranslateButton'
import DeleteProjectButton from './DeleteProjectButton'
import PublishToggle from './PublishToggle'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { number: 'asc' } },
      jobs: true,
      glossary: { orderBy: { english: 'asc' } },
    },
  })

  if (!project) notFound()
  if (project.ownerId !== userId) notFound()

  return (
    <div>
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {project.sourceLang} &rarr; {project.targetLang} &middot;{' '}
            {project.chapters.length} chapters
          </p>
          {project.chapters.length > 0 && (
            <Link
              href={`/read/${id}`}
              className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Start Reading
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${id}/glossary`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <BookOpen className="mr-1 inline h-4 w-4" />
            Glossary ({project.glossary.length})
          </Link>
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Public link</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Publish this book to share a read-only link with anyone — no sign-in required.
            </p>
          </div>
          <PublishToggle
            projectId={project.id}
            initialIsPublic={project.isPublic}
            initialPublicToken={project.publicToken}
          />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Chapters</h2>
        {project.chapters.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No chapters parsed yet. The PDF is being processed.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {project.chapters.map((chapter) => {
              const job = project.jobs.find(
                (j) => j.chapterId === chapter.id
              )
              const hasTranslation = !!chapter.translation

              return (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-zinc-400" />
                    <div>
                      <p className="font-medium">
                        Ch. {chapter.number}: {chapter.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Pages {chapter.startPage}–{chapter.endPage}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasTranslation ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Translated
                      </span>
                    ) : job?.status === 'PROCESSING' ? (
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        Translating...
                      </span>
                    ) : job?.status === 'QUEUED' ? (
                      <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                        Queued
                      </span>
                    ) : (
                      <TranslateButton
                        projectId={project.id}
                        chapterId={chapter.id}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
