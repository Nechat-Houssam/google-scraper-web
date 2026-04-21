'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="h-8 w-8 rounded-full bg-blue-600 animate-pulse" />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
