'use client'

import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { ConfirmProvider } from '@/components/confirm-dialog'

interface ProvidersProps {
  children: React.ReactNode
}

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        toast({
          title: "Gagal memuat data",
          description: error.message || 'Nggak bisa terhubung ke server. Cek koneksi kamu, ya.',
          variant: "destructive",
        })
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // Reuse data for 30s before revalidating in the background
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient)

  return (
    <SessionProvider
      basePath="/api/auth"
      refetchInterval={0} // Disable automatic refetch to reduce CLIENT_FETCH_ERROR
      refetchOnWindowFocus={false} // Disable refetch on window focus
      refetchWhenOffline={false} // Disable refetch when offline
    >
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
