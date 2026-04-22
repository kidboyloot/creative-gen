import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      // Hard redirect (not a <Navigate>) because the landing is a static HTML
      // page served from /public, outside the React Router tree.
      window.location.replace('/welcome/')
    }
  }, [isAuthenticated])

  if (!isAuthenticated) return null
  return <>{children}</>
}
