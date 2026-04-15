import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export interface Asset {
  id: string
  type: 'image' | 'video' | 'collage'
  format: string
  variant: number
  url: string
}

export interface JobStatus {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  done: number
  total: number
  assets: Asset[]
}

export function useJobStatus(jobId: string | null) {
  return useQuery<JobStatus>({
    queryKey: ['job', jobId],
    queryFn: () =>
      axios.get<JobStatus>(`/generate/status/${jobId}`).then((r) => r.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'done' || status === 'failed') return false
      return 2000
    },
  })
}
