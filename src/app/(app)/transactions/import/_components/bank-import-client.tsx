'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ImportPreviewRow, ImportResult } from '@/lib/api/bank-import'
import type { Category } from '@/lib/api/categories'
import type { Wallet } from '@/lib/api/wallets'
import { suggestCategoryId, type HistoryTransaction } from '@/lib/transaction-matching'
import { formatVND } from '@/lib/utils/currency'
import { ImportReview, type ReviewedRow } from './import-review'
import { ImportSource } from './import-source'
import { useCsvSource, useStatementReview } from './use-bank-import'

/** Review is local; saving is a single atomic request, safe to retry after a lost response. */
export function BankImportClient({ wallets, categories, recent }: {
  wallets: Wallet[]; categories: Category[]; recent: HistoryTransaction[]
}) {
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '')
  const source = useCsvSource()
  // Debt and transfer categories are driven by their own records, so they are
  // not offered here — and a suggestion that lands on one is dropped too.
  const importable = categories.filter(category => !category.system_key)
  const suggestCategory = (row: ImportPreviewRow) => {
    const id = suggestCategoryId(row.description, recent)
    return importable.some(category => category.id === id && category.type === row.type) ? id : null
  }
  const review = useStatementReview(
    { csv: source.csv, delimiter: source.delimiter, mapping: source.mapping, wallet_id: walletId },
    source.records,
    suggestCategory,
  )
  const { rows, result, busy } = review
  const error = review.error ?? source.error
  const wallet = wallets.find(item => item.id === walletId)

  return (
    <div className="max-w-3xl mx-auto pb-6 space-y-5">
      <Link href="/transactions" className="text-sm text-gray-500 hover:text-brand">Back to transactions</Link>
      <div>
        <h1 className="text-xl font-semibold">Import VCB CSV</h1>
        <p className="mt-1 text-sm text-gray-500">Upload, map columns, then review. Your wallet changes only after confirmation.</p>
      </div>
      {!wallets.length ? <p className="text-sm">Create a <Link href="/wallets" className="text-brand underline">bank wallet</Link> before importing.</p>
        : result && wallet ? <ImportSuccess result={result} wallet={wallet} /> : (
          <>
            <ImportSource source={source} wallets={wallets} walletId={walletId} disabled={busy || !!rows} onWalletChange={setWalletId} />
            {rows ? <form onSubmit={review.confirm} className="space-y-4">
              <ImportReview rows={rows} categories={importable} disabled={busy} onChange={review.updateRow} />
              <ReviewActions rows={rows} busy={busy} onBack={review.back} />
            </form> : <Button disabled={busy || !source.csv || !!source.parseError} onClick={review.preview}>{busy ? 'Checking…' : 'Review transactions'}</Button>}
          </>
        )}
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}

function ImportSuccess({ result, wallet }: { result: ImportResult; wallet: Wallet }) {
  return (
    <div className="rounded-xl border border-hairline p-5 space-y-4" role="status">
      <p>{result.imported} imported · {result.skipped} already imported and skipped.</p>
      <p>Balance after import: <strong>{formatVND(result.balance)}</strong></p>
      <p className="text-sm text-gray-500">Compare with the bank balance at the same time. Reconciliation is a separate confirmation; do not compare an old closing balance with today&rsquo;s wallet.</p>
      <Link href={`/wallets/${wallet.id}`} className="inline-block text-sm text-brand underline">Open wallet to reconcile balance</Link>
    </div>
  )
}

function ReviewActions({ rows, busy, onBack }: { rows: ReviewedRow[]; busy: boolean; onBack: () => void }) {
  const selected = rows.filter(row => row.selected)
  const net = selected.reduce((total, row) => total + (row.type === 'income' ? row.amount : -row.amount), 0)
  const canSave = selected.length > 0 && selected.every(row => row.title.trim()) && !rows.some(row => row.conflict)
  return (
    <div className="sticky bottom-0 rounded-xl border border-hairline bg-white dark:bg-gray-900 p-4 space-y-3">
      <p className="text-sm">{selected.length} selected · Wallet change: {net >= 0 ? '+' : '−'}{formatVND(Math.abs(net))}</p>
      <p className="text-xs text-gray-500">The batch must respect the wallet&rsquo;s available balance. If any row fails, the entire batch rolls back.</p>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" disabled={busy} onClick={onBack}>Back</Button>
        <Button type="submit" disabled={busy || !canSave}>{busy ? 'Importing…' : 'Confirm import'}</Button>
      </div>
    </div>
  )
}
