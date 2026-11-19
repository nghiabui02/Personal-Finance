import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { type Category } from '@/lib/api/categories'
import { type Transaction } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import type { ParsedDraft } from '@/lib/api/parse-transaction'
import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import { findDuplicate, suggestCategoryId, type HistoryTransaction } from '@/lib/transaction-matching'
import { isDebtCategoryKey } from '@/lib/constants'
import type { DebtOption } from '@/lib/types'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'

/**
 * What the transaction form is holding, and what can be worked out from it:
 * which category is a debt one, whether the wallet can cover the spend, what
 * the history suggests, whether the same spend is already recorded.
 *
 * The form component only draws this and sends it; the rules are here.
 */
export function useTransactionForm({
  editing,
  categories,
  wallets,
  debts,
  recent,
  defaultDate,
}: {
  editing: Transaction | null
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  recent: HistoryTransaction[]
  defaultDate?: string
}) {
  const t = useTranslations('transactions')
  const [txType, setTxType] = useState<'income' | 'expense'>(editing?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState(editing?.user_category_id ?? '')
  const [walletId, setWalletId] = useState(
    editing ? (editing.wallet_id ?? '') : (wallets.find(w => w.is_default)?.id ?? '')
  )
  const [date, setDate] = useState(
    editing?.transaction_date ?? defaultDate ?? localYMD()
  )
  const [showFee, setShowFee] = useState(Number(editing?.bank_fee) > 0)
  const [amountValue, setAmountValue] = useState(
    editing ? Number(editing.amount) - Number(editing.bank_fee ?? 0) : 0
  )
  const [feeValue, setFeeValue] = useState(Number(editing?.bank_fee) || 0)
  const [selectedDebtId, setSelectedDebtId] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  // Bumping this remounts the amount field so a picked chip replaces whatever
  // was typed, instead of the uncontrolled input keeping its old value.
  const [preset, setPreset] = useState<FrequentTransaction | null>(null)
  const [note, setNote] = useState(editing?.note ?? '')

  /** Whether this form offers the category as a new choice. */
  function isOffered(category: Category): boolean {
    if (!category.is_active) return false
    if (!isDebtCategoryKey(category.system_key)) return true
    // Lend and Borrow come from creating a debt. Collect and Repay can be
    // picked, but only while creating, because only then a debt is chosen.
    return !editing && (category.system_key === 'collect_debt' || category.system_key === 'repay_debt')
  }

  const offeredCategoryIds = new Set(categories.filter(isOffered).map(c => c.id))

  function applyFrequent(f: FrequentTransaction) {
    setTxType(f.type)
    setCategoryId(f.categoryId && offeredCategoryIds.has(f.categoryId) ? f.categoryId : '')
    if (f.walletId) setWalletId(f.walletId)
    setSelectedDebtId('')
    setAmountValue(f.amount)
    setPreset(f)
  }

  /** Fills the form from a parsed draft. Nothing is saved until the user submits. */
  function applyDraft(d: ParsedDraft) {
    setTxType(d.type)
    setCategoryId(d.user_category_id && offeredCategoryIds.has(d.user_category_id) ? d.user_category_id : '')
    if (d.wallet_id) setWalletId(d.wallet_id)
    if (d.date) setDate(d.date)
    setNote(d.note ?? '')
    setSelectedDebtId('')
    setAmountValue(d.amount)
    setPreset({
      key: `draft-${d.amount}-${d.user_category_id ?? ''}`,
      type: d.type,
      amount: d.amount,
      categoryId: d.user_category_id,
      categoryName: '',
      categoryIcon: null,
      walletId: d.wallet_id,
      note: d.note,
      count: 0,
    })
  }

  // A row keeps the category it already has, even a legacy debt category, so
  // saving it unchanged never fails or clears the field.
  const choosableCategories = categories.filter(
    c => offeredCategoryIds.has(c.id) || c.id === editing?.user_category_id || c.id === categoryId,
  )

  // Detect if selected category is a debt-related one — by system_key, not
  // display name, so renaming a category (or i18n) never breaks this.
  const selectedCat = categories.find(c => c.id === categoryId)
  const isRepay   = selectedCat?.system_key === 'repay_debt'
  const isCollect = selectedCat?.system_key === 'collect_debt'
  const showDebtSelector = (isRepay || isCollect) && !editing

  // Filter debts by direction: repay=borrow debts, collect=lend debts
  const relevantDebts = showDebtSelector
    ? debts.filter(d => isRepay ? d.type === 'borrow' : d.type === 'lend')
    : []

  // No "not linked" choice: a debt category without a debt is what this form
  // used to let through.
  const debtOptions = relevantDebts.map(d => ({
    value: d.id,
    label: t('debtRemaining', { person: d.person_name, amount: formatVND(d.remaining_amount) }),
  }))
  const debtMissing = showDebtSelector && !selectedDebtId

  const selectedDebt = relevantDebts.find(d => d.id === selectedDebtId)

  function changeType(t: 'income' | 'expense') {
    setTxType(t)
    setCategoryId('')
    setSelectedDebtId('')
    setMoreOpen(false)
    setPreset(null)
  }

  function changeCategory(id: string) {
    setCategoryId(id)
    setSelectedDebtId('')
  }

  // Balances come down with the form, so overspending is caught as the user
  // types. Editing only needs to cover the *extra* spend: the original amount
  // is handed back to the same wallet first.
  const selectedWallet = wallets.find(w => w.id === walletId)
  const spendTotal = amountValue + (showFee ? feeValue : 0)
  const alreadyDeducted =
    editing && editing.wallet_id === walletId && editing.type === 'expense'
      ? Number(editing.amount)
      : 0
  const shortfall =
    txType === 'expense' && selectedWallet && !selectedDebtId
      ? spendTotal - alreadyDeducted - Number(selectedWallet.balance)
      : 0
  const overdrawn = shortfall > 0
  const overdraftMessage = overdrawn && selectedWallet
    ? `${selectedWallet.name} only has ${formatVND(Number(selectedWallet.balance))} — short by ${formatVND(shortfall)}.`
    : null

  // Offered, never applied on its own: a wrong silent tag is harder to notice
  // than an empty category, and the user is looking at the field anyway.
  const suggestedId = categoryId ? null : suggestCategoryId(note, recent)
  const suggestedCategory = suggestedId
    ? choosableCategories.find(c => c.id === suggestedId && c.type === txType) ?? null
    : null

  // The same spend typed twice, or typed once and then imported. Editing is
  // exempt: a row always matches itself.
  const duplicate = editing ? null : findDuplicate(
    { type: txType, amount: spendTotal, transaction_date: date, wallet_id: walletId || null },
    recent,
  )

  const canAddFee = txType === 'expense' && !!walletId && !showDebtSelector

  return {
    txType, categoryId, walletId, date, note, amountValue, feeValue, showFee, selectedDebtId, preset, moreOpen,
    setWalletId, setDate, setNote, setAmountValue, setFeeValue, setShowFee, setSelectedDebtId, setMoreOpen,
    applyFrequent, applyDraft, changeType, changeCategory,
    choosableCategories, offeredCategoryIds, isRepay, showDebtSelector, debtOptions, debtMissing, selectedDebt,
    selectedWallet, spendTotal, overdrawn, overdraftMessage,
    suggestedCategory, duplicate, canAddFee,
  }
}
