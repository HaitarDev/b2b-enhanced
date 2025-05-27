"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, createContext, useContext } from "react";

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create a context to expose the queryClient for situations when we can't use hooks
export const QueryClientContext = createContext<QueryClient | null>(null);

// Helper hook to get the QueryClient outside of a react-query hook
export function useQueryClientContext() {
  const queryClient = useContext(QueryClientContext);
  return queryClient;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Use lazy initialization with useEffect to avoid
  // "Text content did not match" hydration errors
  const [queryClient, setQueryClient] = useState<QueryClient | null>(null);

  useEffect(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          retry: 1,
          refetchOnWindowFocus: false,
          // Make queries more resilient for this app
          throwOnError: false,
        },
      },
    });

    setQueryClient(client);
  }, []);

  // Show children without query provider during SSR
  // This helps prevent hydration errors
  if (!queryClient) {
    return <>{children}</>;
  }

  return (
    <QueryClientContext.Provider value={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </QueryClientContext.Provider>
  );
}
