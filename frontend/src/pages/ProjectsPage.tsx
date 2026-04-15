import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { FolderOpen, Plus } from 'lucide-react'

interface Project {
  id: string
  name: string
  created_at: string
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => axios.get<Project[]>('/history/projects').then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: (n: string) =>
      axios.post<Project>(`/history/projects?name=${encodeURIComponent(n)}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setName('')
    },
  })

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-gray-400 text-sm mt-1">Group your generation jobs into projects.</p>
      </div>

      <div className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name…"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-500"
          onKeyDown={(e) => e.key === 'Enter' && name && create.mutate(name)}
        />
        <button
          onClick={() => name && create.mutate(name)}
          disabled={!name}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm rounded-xl transition-colors"
        >
          <Plus size={16} /> Create
        </button>
      </div>

      <div className="space-y-3">
        {projects?.map((p) => (
          <div
            key={p.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
          >
            <FolderOpen size={20} className="text-brand-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
        {!projects?.length && (
          <div className="text-center text-gray-500 py-16">No projects yet. Create one above.</div>
        )}
      </div>
    </div>
  )
}
