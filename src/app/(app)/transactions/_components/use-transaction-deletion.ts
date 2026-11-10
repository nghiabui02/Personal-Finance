import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast, toastError } from '@/components/ui/toast'
import { isStandalone, type Transaction, transactionsApi } from '@/lib/api/transactions'

/**
 * Deleting one transaction from the list.
 *
 * A standalone row goes at once, with the way back in the toast — a confirm
 * step would buy nothing that Undo does not. A transfer or a debt repayment
 * still asks first: reversing one touches a record Undo cannot rebuild.
 */
export function useTransactionDeletion(transactions: Transaction[]) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const confirmTx = transactions.find(tx => tx.id === confirmId)
  const consequence = confirmTx?.debt_payment_id
    ? 'The money goes back to the wallet and the debt is reopened for this amount.'
    : confirmTx?.wallet_id
      ? 'The amount goes back to the wallet it came from.'
      : 'This transaction will be permanently deleted.'

  /** Re-creates a deleted row. A new id, the same money. */
  function restore(tx: Transaction) {
    startTransition(async () => {
      try {
        await transactionsApi.create({
          type: tx.type,
          // Stored `amount` is the total; the server adds the fee back on top
          // of the base it is given, so the fee has to come off first.
          amount: Number(tx.amount) - Number(tx.bank_fee ?? 0),
          category_id: tx.category_id ?? undefined,
          wallet_id: tx.wallet_id ?? undefined,
          transaction_date: tx.transaction_date,
          note: tx.note ?? undefined,
          bank_fee: Number(tx.bank_fee) > 0 ? Number(tx.bank_fee) : undefined,
        })
        router.refresh()
      } catch (err) {
        toastError(err, 'Could not restore the transaction.')
      }
    })
  }

  function deleteTransaction(tx: Transaction) {
    startTransition(async () => {
      try {
        await transactionsApi.delete(tx.id)
        router.refresh()
        toast.success(
          'Transaction deleted.',
          isStandalone(tx) ? { label: 'Undo', onClick: () => restore(tx) } : undefined,
        )
      } catch (err) {
        toastError(err, 'Could not delete the transaction.')
      } finally {
        setConfirmId(null)
      }
    })
  }

  function requestDelete(id: string) {
    const tx = transactions.find(t => t.id === id)
    // No modal stands between two taps on the same row any more, and the
    // second delete would only report the row as not found.
    if (!tx || isPending) return
    if (isStandalone(tx)) deleteTransaction(tx)
    else setConfirmId(id)
  }

  return {
    isPending,
    isConfirming: confirmId !== null,
    consequence,
    requestDelete,
    confirm: () => { if (confirmTx) deleteTransaction(confirmTx) },
    cancel: () => setConfirmId(null),
  }
}
