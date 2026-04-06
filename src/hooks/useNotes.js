import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*, quests(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('notes-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotes()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, fetchNotes])

  const createNote = async ({ content, tags, linked_quest_id, inbox_source_id }) => {
    if (!user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        content,
        tags: tags || [],
        linked_quest_id,
        inbox_source_id,
      })
      .select()
      .single()
    return { data, error }
  }

  const updateNote = async (noteId, updates) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single()
    return { data, error }
  }

  const deleteNote = async (noteId) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
    return { error }
  }

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refresh: fetchNotes,
  }
}
