import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The note search box on the transactions list.
 *
 * The query itself lives in the URL (`?q=`), so a search survives a reload and
 * the back button. This holds only what the URL does not: whether the box is
 * open, and the text typed but not yet submitted.
 */
export function useNoteSearch(searchQuery: string) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(!!searchQuery)
  const [value, setValue] = useState(searchQuery)

  // Sync from URL changes, e.g. browser back/forward (state-adjust-during-render)
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery)
    setValue(searchQuery)
    setIsOpen(!!searchQuery)
  }

  function clear() {
    setValue('')
    setIsOpen(false)
    // Closing the search box drops the query, not the filters the user set.
    const url = new URL(window.location.href)
    url.searchParams.delete('q')
    router.push(url.pathname + url.search)
  }

  function submit() {
    const query = value.trim()
    if (!query) {
      clear()
      return
    }
    // A note search looks across all time, so the period no longer applies.
    const url = new URL(window.location.href)
    url.searchParams.set('q', query)
    url.searchParams.delete('view')
    url.searchParams.delete('month')
    url.searchParams.delete('week')
    url.searchParams.delete('date')
    router.push(url.pathname + url.search)
  }

  return { isOpen, value, setValue, open: () => setIsOpen(true), submit, clear }
}

export type NoteSearch = ReturnType<typeof useNoteSearch>
