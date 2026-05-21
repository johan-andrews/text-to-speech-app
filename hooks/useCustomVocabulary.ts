import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCustomVocabulary() {
  return useQuery({
    queryKey: ['custom_vocabulary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_vocabulary').select('*').order('word')
      if (error) throw error
      return data ?? []
    },
    placeholderData: [],
  })
}

export function useAddVocabWord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ word, category, user_id }: { word: string; category?: string; user_id: string }) => {
      const { error } = await supabase.from('custom_vocabulary').insert({ word, category, user_id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom_vocabulary'] }),
  })
}

export function useDeleteVocabWord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('custom_vocabulary').delete().eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom_vocabulary'] }),
  })
}
