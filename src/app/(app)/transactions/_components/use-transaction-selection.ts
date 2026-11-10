import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast, toastError } from '@/components/ui/toast'
import { type Transaction, transactionsApi } from '@/lib/api/transactions'
import { plural } from '@/lib/utils/plural'

/**
 * Selection mode on the transactions list: which rows are ticked, and the two
 * things a batch can do — move to one category, or be deleted.
 *
 * @param scope Identifies the rows currently in view (period, tab, day…).
 *   When it changes the picks are dropped: rows ticked under one tab or day
 *   would otherwise stay selected out of sight and still be acted on.
 */
export function useTransactionSelection(transactions: Transaction[], scope: string) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Null is "not selecting". An empty Set is selection mode with nothing
  // picked yet, which still has to show the rows' checkboxes.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string> | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  // Selection mode stays on; only the picks go (state-adjust-during-render).
  const [prevScope, setPrevScope] = useState(scope)
  if (prevScope !== scope) {
    setPrevScope(scope)
    clearPicks()
  }

  const selected = selectedIds ? transactions.filter(tx => selectedIds.has(tx.id)) : []

  function clearPicks() {
    if (selectedIds?.size) setSelectedIds(new Set())
  }

  function toggle(id: string) {
    setSelectedIds(current => {
      const next = new Set(current ?? [])
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function end() {
    setSelectedIds(null)
    setIsConfirmingDelete(false)
  }

  /** `action` reports what happened, in the server's own count — not always
   *  the number selected, since deleting a transfer takes its sibling leg. */
  function run(action: (ids: string[]) => Promise<string>, fallback: string) {
    const ids = selected.map(tx => tx.id)
    startTransition(async () => {
      try {
        const message = await action(ids)
        end()
        router.refresh()
        toast.success(message)
      } catch (err) {
        toastError(err, fallback)
        // A recategorise refused part-way keeps the rows it did change, so the
        // list is reloaded rather than left showing the old categories.
        router.refresh()
      }
    })
  }

  function categorize(categoryId: string) {
    run(
      async ids => `${plural((await transactionsApi.categorizeMany(ids, categoryId)).updated, 'transaction')} moved.`,
      'Could not change the category.',
    )
  }

  function deleteSelected() {
    run(
      async ids => `${plural((await transactionsApi.deleteMany(ids)).deleted, 'transaction')} deleted.`,
      'Could not delete the selection.',
    )
  }

  return {
    isPending,
    isActive: selectedIds !== null,
    selectedIds,
    selected,
    isConfirmingDelete,
    toggleMode: () => (selectedIds ? end() : setSelectedIds(new Set())),
    toggle,
    clearPicks,
    end,
    askDelete: () => setIsConfirmingDelete(true),
    cancelDelete: () => setIsConfirmingDelete(false),
    categorize,
    deleteSelected,
  }
}
