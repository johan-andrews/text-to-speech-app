import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DictationSession {
  id: string
  raw_text: string
  cleaned_text: string
  provider: string
  duration_ms: number
  language: string
  title: string
  is_starred: boolean
  created_at: string
}

export function useDictationHistory() {
  return useQuery({
    queryKey: ['dictation_history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('dictation_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10) // Display exactly the 10 latest entries!
      
      if (error) throw error
      return (data ?? []) as DictationSession[]
    },
    placeholderData: [],
    staleTime: 0, // Ensure real-time queries with no stale caching delays!
  })
}

export function useSaveSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (session: Partial<DictationSession> & { user_id: string }) => {
      // 1. Insert the new session
      const { data: newSession, error: insertError } = await supabase
        .from('dictation_sessions')
        .insert(session)
        .select()
        .single()
      if (insertError) throw insertError

      // 2. Fetch all current non-deleted sessions for this user to check rolling limit
      const { data: existing, error: fetchError } = await supabase
        .from('dictation_sessions')
        .select('id')
        .eq('user_id', session.user_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      
      // 3. Keep exactly the 10 latest entries. Delete the rest.
      if (!fetchError && existing && existing.length > 10) {
        const idsToDelete = existing.slice(10).map(item => item.id)
        if (idsToDelete.length > 0) {
          await supabase
            .from('dictation_sessions')
            .update({ is_deleted: true }) // Soft delete the oldest ones exceeding the limit
            .in('id', idsToDelete)
        }
      }

      return newSession
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dictation_history'] }),
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('dictation_sessions').update({ is_deleted: true }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dictation_history'] }),
  })
}

export function useToggleStar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_starred }: { id: string; is_starred: boolean }) => {
      await supabase.from('dictation_sessions').update({ is_starred }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dictation_history'] }),
  })
}
