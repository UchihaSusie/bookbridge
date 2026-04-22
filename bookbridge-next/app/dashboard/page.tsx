import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react'
import prisma from '@/lib/prisma'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-parchment text-ink-light',
  PARSING: 'bg-highlight text-ink-light',
  READY: 'bg-accent-light text-accent',
  TRANSLATING: 'bg-highlight text-ink',
  COMPLETED: 'bg-green-100 text-green-700',
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    include: { chapters: { select: { translation: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">My Library</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your translation projects
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-parchment" />
          <h3 className="mt-4 font-serif text-lg font-medium text-ink">No books yet</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Upload a PDF to start translating.
          </p>
          <Link
            href="/dashboard/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const translatedCount = project.chapters.filter(
              (c) => c.translation
            ).length
            const totalChapters = project.chapters.length
            const progress =
              totalChapters > 0
                ? Math.round((translatedCount / totalChapters) * 100)
                : 0

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group rounded-xl border border-parchment bg-white p-5 transition hover:border-accent/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-serif font-semibold text-ink group-hover:text-accent">
                    {project.title}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[project.status] || statusColors.DRAFT}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  {project.sourceLang} &rarr; {project.targetLang}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {totalChapters} chapters
                  </span>
                  <span className="flex items-center gap-1">
                    {progress === 100 ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {progress}% translated
                  </span>
                </div>
                {totalChapters > 0 && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-parchment">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
