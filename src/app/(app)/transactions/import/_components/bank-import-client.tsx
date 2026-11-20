'use client'
import { useTranslations } from 'next-intl'

import Link from '@/components/ui/navigation-link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ImportPreviewRow, ImportResult } from '@/lib/api/bank-import'
import type { Category } from '@/lib/api/categories'
import type { Wallet } from '@/lib/api/wallets'
import { suggestCategoryId, type HistoryTransaction } from '@/lib/transaction-matching'
import { formatSignedVND, formatVND } from '@/lib/utils/currency'
import { ImportReview, type ReviewedRow } from './import-review'
import { ImportSource } from './import-source'
import { useCsvSource, useStatementReview } from './use-bank-import'
import { netOf } from '@/lib/utils/totals'

/** Review is local; saving is a single atomic request, safe to retry after a lost response. */
export function BankImportClient({ wallets, categories, recent }: {
  wallets: Wallet[]; categories: Category[]; recent: HistoryTransaction[]
}) {
  const t = useTranslations('transactions')
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '')
  const source = useCsvSource()
  // Debt and transfer categories are driven by their own records, so they are
  // not offered here — and a suggestion that lands on one is dropped too.
  const importable = categories.filter(category => category.is_active && !category.system_key)
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
      <Link href="/transactions" className="text-sm text-gray-500 hover:text-brand">{t('backToTransactions')}</Link>
      <div>
        <h1 className="text-xl font-semibold">{t('importVcbCsv')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('uploadMapColumnsThenReviewYourWalletChangesOnlyAfterConfirmation')}</p>
      </div>
      {!wallets.length ? <p className="text-sm">{t.rich('sentenceCreateABankWalletBeforeImporting', { value0: chunks => <Link href="/wallets" className="text-brand underline">{chunks}</Link> })}</p>
        : result && wallet ? <ImportSuccess result={result} wallet={wallet} /> : (
          <>
            <ImportSource source={source} wallets={wallets} walletId={walletId} disabled={busy || !!rows} onWalletChange={setWalletId} />
            {rows ? <form onSubmit={review.confirm} className="space-y-4">
              <ImportReview rows={rows} categories={importable} disabled={busy} onChange={review.updateRow} />
              <ReviewActions rows={rows} busy={busy} onBack={review.back} />
            </form> : <Button loading={busy} disabled={busy || !source.csv || !!source.parseError} onClick={review.preview}>{busy ? t('checking') : t('reviewTransactions')}</Button>}
          </>
        )}
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}

function ImportSuccess({ result, wallet }: { result: ImportResult; wallet: Wallet }) {
  const t = useTranslations('transactions')
  return (
    <div className="rounded-xl border border-hairline p-5 space-y-4" role="status">
      <p>{t('sentenceImportedAlreadyImportedAndSkipped', { value0: result.imported, value1: result.skipped })}</p>
      <p>{t.rich('sentenceBalanceAfterImport', { value0: () => <strong>{formatVND(result.balance)}</strong> })}</p>
      <p className="text-sm text-gray-500">{t('compareWithTheBankBalanceAtTheSameTimeReconciliationIsA')}</p>
      <Link href={`/wallets/${wallet.id}`} className="inline-block text-sm text-brand underline">{t('openWalletToReconcileBalance')}</Link>
    </div>
  )
}

function ReviewActions({ rows, busy, onBack }: { rows: ReviewedRow[]; busy: boolean; onBack: () => void }) {
  const t = useTranslations('transactions')
  const selected = rows.filter(row => row.selected)
  const net = netOf(selected)
  const canSave = selected.length > 0 && selected.every(row => row.title.trim()) && !rows.some(row => row.conflict)
  return (
    <div className="sticky bottom-0 rounded-xl border border-hairline bg-white dark:bg-gray-900 p-4 space-y-3">
      <p className="text-sm">{t('sentenceSelectedWalletChange', { value0: selected.length, value1: formatSignedVND(net) })}</p>
      <p className="text-xs text-gray-500">{t('theBatchMustRespectTheWalletSAvailableBalanceIfAnyRow')}</p>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" disabled={busy} onClick={onBack}>{t('back')}</Button>
        <Button type="submit" loading={busy} disabled={busy || !canSave}>{busy ? t('importing') : t('confirmImport')}</Button>
      </div>
    </div>
  )
}
