import { useQuery } from '@tanstack/react-query'
import { fetchImportStatus, type ShopifyImportStatus } from '../api/shopify'

export function useShopifyImportStatus(jobId: string | null) {
  return useQuery<ShopifyImportStatus>({
    queryKey: ['shopify', 'import', jobId],
    queryFn: () => fetchImportStatus(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      if (s === 'done' || s === 'failed') return false
      return 2000
    },
  })
}
