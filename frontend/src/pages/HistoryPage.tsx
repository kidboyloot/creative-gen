import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Clock, Download, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useGenerateStore } from '../store/generateStore'
import { useNavigate } from 'react-router-dom'

interface Job {
  id: string
  prompt: string
  formats: string[]
  types: string[]
  count: number
  status: string
  done: number
  total: number
  project_id: string | null
  created_at: string
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ['history'],
    queryFn: () => axios.get<Job[]>('/history').then((r) => r.data),
    refetchInterval: 5000,
  })

  function rerun(job: Job) {
    const store = useGenerateStore.getState()
    store.setPrompt(0, job.prompt)
    job.formats.forEach((f) => {
      if (!store.formats.includes(f)) store.toggleFormat(f)
    })
    navigate('/generate')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Clock size={20} className="animate-spin mr-2" /> Loading history…
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-gray-400 text-sm mt-1">All your past generation jobs.</p>
      </div>

      {!jobs?.length && (
        <div className="text-center text-gray-500 py-20">No generation history yet.</div>
      )}

      <div className="space-y-3">
        {jobs?.map((job) => (
          <div
            key={job.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{job.prompt}</p>
              <p className="text-xs text-gray-500 mt-1">
                {job.formats.join(', ')} · {job.types.join(', ')} · {job.count} variants ·{' '}
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>

            <span className={clsx('text-xs px-2 py-1 rounded-full capitalize', {
              'bg-yellow-500/20 text-yellow-400': job.status === 'running' || job.status === 'pending',
              'bg-green-500/20 text-green-400': job.status === 'done',
              'bg-red-500/20 text-red-400': job.status === 'failed',
            })}>
              {job.status}
            </span>

            <div className="flex gap-2">
              {job.status === 'done' && (
                <a
                  href={`/download/${job.id}`}
                  download
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Download ZIP"
                >
                  <Download size={15} />
                </a>
              )}
              <button
                onClick={() => rerun(job)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Re-run with same settings"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
