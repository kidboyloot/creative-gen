import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export interface VideoAsset {
  id: string
  variant: number
  format: string
  url: string
}

export interface VideoJobStatus {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  done: number
  total: number
  assets: VideoAsset[]
  errors: string[]
}

export function useVideoStatus(jobId: string | null) {
  return useQuery<VideoJobStatus>({
    queryKey: ['video-job', jobId],
    queryFn: () =>
      axios.get<VideoJobStatus>(`/video/status/${jobId}`).then((r) => r.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'done' || status === 'failed') return false
      return 3000
    },
  })
}
