'use client'
import { getCategoryName } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'

import { AmountInput } from '@/components/ui/amount-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { CategorySelect } from '@/components/ui/category-select'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Category } from '@/lib/api/categories'
import { toast } from '@/components/ui/toast'
import { formatSignedVND, formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { type Wallet, walletsApi } from '@/lib/api/wallets'
import { useState } from 'react'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { readField } from '@/lib/utils/form'
import { SignedAmount } from '@/components/ui/signed-amount'
import { isDebtCategoryKey } from '@/lib/constants'

/**
 * Type in the balance the bank actually shows; the gap is filed as one
 * adjustment transaction. Nothing is overwritten, so the history still adds up.
 */
export function ReconcileModal({
  wallet,
  categories,
  onClose,
}: {
  wallet: Wallet
  categories: Category[]
  onClose: () => void
}) {
  const locale = useLocale()
  const common = useTranslations('common')
  const t = useTranslations('wallets')
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
  const [date, setDate] = useState(localYMD())
  const [actual, setActual] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState('')

  const isCredit = wallet.type === 'credit'
  const recorded = Number(wallet.balance)
  const delta = actual === null ? null : actual - recorded

  // The gap becomes an income or an expense row, so only categories pointing
  // that way can hold it.
  const direction = delta !== null && delta > 0 ? 'income' : 'expense'
  const availableCategories = categories.filter(category => category.is_active
    && category.type === direction && !isDebtCategoryKey(category.system_key))
  const selectedCategory = availableCategories.find(category => category.id === categoryId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const value = Number(readField(form, 'actual_balance'))
    const note = readField(form, 'note').trim()

    if (!Number.isFinite(value)) { setError(t('enterTheBalanceShownByYourBank')); return }

    submit(async () => {
      const result = await walletsApi.reconcile(wallet.id, {
        actual_balance: value,
        note,
        date,
        user_category_id: selectedCategory?.id,
      })
      toast.success(
        result.delta === 0
          ? t('alreadyMatchesNothingToAdjust')
          : t('reconciledAmount', { amount: formatSignedVND(result.delta, result.delta > 0) })
      )
    })
  }

  return (
    <Modal title={t('reconcileWallet', { name: wallet.name })} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-hairline px-4 py-3">
          <p className="eyebrow text-gray-400 dark:text-gray-500 mb-1">
            {isCredit ? t('recordedAvailableCredit') : t('recordedBalance')}
          </p>
          <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatVND(recorded)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{common(`walletTypes.${wallet.type}`)}</p>
        </div>

        <AmountInput
          label={isCredit ? t('availableCreditOnYourStatement') : t('balanceShownByYourBank')}
          name="actual_balance"
          defaultValue={recorded}
          onValueChange={setActual}
          required
        />

        {delta !== null && (
          <div className="rounded-xl border border-hairline px-4 py-3">
            {delta === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('matchesWhatSRecordedNothingToAdjust')}</p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t.rich(selectedCategory ? 'reconcileAsCategory' : 'reconcileAsCorrection', { amount: () => <SignedAmount amount={delta} positive={delta > 0} />, category: selectedCategory ? getCategoryName(selectedCategory, locale) : '', direction })}
              </p>
            )}
          </div>
        )}

        {delta !== null && delta !== 0 && availableCategories.length > 0 && (
          <CategorySelect
            label={t('reason')}
            name="reason"
            categories={availableCategories}
            placeholder={t('balanceCorrection')}
            value={selectedCategory?.id ?? ''}
            onChange={setCategoryId}
            searchable
          />
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 items-end">
          <DatePicker label={t('date')} name="date" value={date} onChange={setDate} required />
          <Input
            label={t('noteOptional')}
            name="note"
            placeholder={t('eGInterest')}
          />
        </div>

        <FormError message={error} />

        <ModalActions
          isPending={isPending}
          disabled={delta === 0}
          submitLabel={t('reconcile')}
          pendingLabel="Saving…"
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
