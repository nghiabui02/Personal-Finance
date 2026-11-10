'use client'

import { BankFeeField } from '@/components/ui/bank-fee-field'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { ModalActions } from '@/components/ui/modal-actions'
import { TabGroup } from '@/components/ui/tab-group'
import { type Category } from '@/lib/api/categories'
import { debtsApi } from '@/lib/api/debts'
import { type Transaction, transactionsApi } from '@/lib/api/transactions'
import { toWalletOptions, type Wallet } from '@/lib/api/wallets'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import type { HistoryTransaction } from '@/lib/transaction-matching'
import type { DebtOption } from '@/lib/types'
import { MONEY_IN, MONEY_OUT } from '@/lib/utils/colors'
import { formatVND } from '@/lib/utils/currency'
import { CategoryTiles } from './category-tiles'
import { CenteredAmountInput } from './centered-amount-input'
import { FrequentChips } from './frequent-chips'
import { QuickParse } from './quick-parse'
import { useTransactionForm } from './use-transaction-form'
import { readField } from '@/lib/utils/form'

interface TransactionFormProps {
  editing: Transaction | null
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  /** Repeats offered as one-tap chips. Empty until there is enough history. */
  frequent?: FrequentTransaction[]
  /** Recent transactions, read for the category suggestion and the duplicate
   *  warning. Empty disables both rather than breaking anything. */
  recent?: HistoryTransaction[]
  defaultDate?: string
  /** Called after a successful save. */
  onDone: () => void
  /** Called when the user backs out without saving. */
  onCancel: () => void
}

export function TransactionForm({ editing, categories, wallets, debts, frequent = [], recent = [], defaultDate, onDone, onCancel }: TransactionFormProps) {
  const { error, setError, isPending, submit } = useFormSubmit(onDone)
  const {
    txType, categoryId, walletId, date, note, amountValue, feeValue, showFee, selectedDebtId, preset, moreOpen,
    setWalletId, setDate, setNote, setAmountValue, setFeeValue, setShowFee, setSelectedDebtId, setMoreOpen,
    applyFrequent, applyDraft, changeType, changeCategory,
    isRepay, showDebtSelector, debtOptions, selectedDebt,
    selectedWallet, spendTotal, overdrawn, overdraftMessage,
    suggestedCategory, duplicate, canAddFee,
  } = useTransactionForm({ editing, categories, wallets, debts, recent, defaultDate })

  const walletOptions = toWalletOptions(wallets)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget

    const amount = Number(readField(form, 'amount'))
    const fee    = Number(readField(form, 'fee') || '0')

    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }
    if (!date) { setError('Please pick a date.'); return }
    if (overdrawn) { setError(overdraftMessage); return }

    submit(async () => {
      const base = {
        type: txType,
        amount,
        category_id: categoryId || undefined,
        wallet_id: walletId || undefined,
        transaction_date: date,
        note: note || (selectedDebt ? `Repayment to ${selectedDebt.person_name}` : undefined),
        // Folded into this one transaction — the server stores amount + fee
        // as the total, so the list shows a single row, not a separate fee row.
        bank_fee: fee > 0 ? fee : undefined,
      }

      if (editing) {
        await transactionsApi.update(editing.id, base)
      } else if (selectedDebtId && amount > 0) {
        // Debt payment: the payments API creates the transaction + adjusts balance atomically
        await debtsApi.addPayment(selectedDebtId, { amount, note: note || undefined, wallet_id: walletId || undefined, date })
      } else {
        await transactionsApi.create(base)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!editing && <QuickParse onDraft={applyDraft} />}

      <TabGroup
        tabs={[{ key: 'expense', label: '− Expense' }, { key: 'income', label: '+ Income' }]}
        value={txType}
        onChange={changeType}
        activeTextColors={{ expense: MONEY_OUT, income: MONEY_IN }}
      />

      <div className="pt-1 pb-0.5">
        <CenteredAmountInput
          key={`${txType}-${selectedDebtId || 'no-debt'}-${preset?.key ?? ''}`}
          name="amount"
          defaultValue={preset?.amount ?? (editing ? Number(editing.amount) - Number(editing.bank_fee ?? 0) : selectedDebt?.remaining_amount)}
          onValueChange={setAmountValue}
          autoFocus={!editing}
          txType={txType}
        />
        {overdraftMessage && (
          <p className="mt-2 text-center text-xs text-rose-600 dark:text-rose-400">{overdraftMessage}</p>
        )}
      </div>

      {!editing && frequent.length > 0 && !amountValue && (
        <FrequentChips frequent={frequent} activeKey={preset?.key} onPick={applyFrequent} />
      )}

      <CategoryTiles
        categories={categories}
        txType={txType}
        categoryId={categoryId}
        suggestedCategory={suggestedCategory}
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen(open => !open)}
        onChange={changeCategory}
      />

      <div className="grid grid-cols-2 gap-3">
        {wallets.length > 0
          ? <div>
              <CustomSelect label="Wallet" name="wallet_id" options={walletOptions}
                value={walletId} onChange={setWalletId} placeholder="None" />
              {selectedWallet && (
                <p className="mt-1 text-xs tabular-nums text-gray-400 dark:text-gray-500">
                  {formatVND(selectedWallet.balance)} {selectedWallet.type === 'credit' ? 'credit left' : 'available'}
                </p>
              )}
            </div>
          : <div />}
        <DatePicker label="Date" name="transaction_date" value={date} onChange={setDate} required />
      </div>

      {/* Debt selector — shown when category is Repay Debt / Collect Debt */}
      {showDebtSelector && (
        <div className="space-y-1.5">
          <CustomSelect
            label={isRepay ? 'Link to debt (borrowed)' : 'Link to debt (lent)'}
            name="debt_id"
            options={debtOptions}
            value={selectedDebtId}
            onChange={setSelectedDebtId}
            placeholder="Not linked"
          />
          {selectedDebt && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Remaining: {formatVND(selectedDebt.remaining_amount)} · Linking updates the debt record automatically
            </p>
          )}
        </div>
      )}

      <Input label="Note (optional)" name="note" value={note} onChange={e => setNote(e.target.value)}
        placeholder="e.g. Lunch with colleagues" />

      {canAddFee && (
        <BankFeeField
          isOpen={showFee}
          onOpenChange={setShowFee}
          defaultValue={Number(editing?.bank_fee) || 0}
          onValueChange={setFeeValue}
        >
          Included in this transaction — total charged will be{' '}
          <span className="font-medium text-gray-600 dark:text-gray-300 tabular-nums">
            {formatVND(amountValue + feeValue)}
          </span>.
        </BankFeeField>
      )}

      {duplicate && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          {selectedWallet?.name} already has {formatVND(spendTotal)} on this day
          {duplicate.note ? ` — “${duplicate.note}”` : ''}. Saving records it a second time.
        </p>
      )}

      {editing?.debt_payment_id && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          This is a debt repayment. Changing the amount moves the debt with it;
          the direction and category are fixed.
        </p>
      )}

      <FormError message={error} />

      <ModalActions
        isPending={isPending}
        disabled={overdrawn}
        submitLabel="Save transaction"
        submitVariant="success"
        onCancel={onCancel}
      />
    </form>
  )
}
