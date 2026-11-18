'use client'
import { useTranslations } from 'next-intl'

import { ConfirmModal } from '@/components/ui/confirm-modal'
import { MONEY_SEGMENTS } from '@/components/ui/segment-nav'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Dot, Em } from '@/components/ui/verdict'
import { EmptyState } from '@/components/ui/empty-state'
import { formatVND } from '@/lib/utils/currency'
import { type Wallet, walletsApi } from '@/lib/api/wallets'
import { useState } from 'react'
import { WalletCard } from './wallet-card'
import { WalletModal } from './wallet-modal'
import { TransferModal } from './transfer-modal'
import { CreditPaymentModal } from './credit-payment-modal'
import { useDeleteConfirmation } from '@/lib/hooks/use-delete-confirmation'
import { AddButton } from '@/components/ui/add-button'

export default function WalletsClient({ wallets }: { wallets: Wallet[] }) {
  const t = useTranslations('wallets')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const { confirmId, isPending, ask, cancel, confirm } = useDeleteConfirmation(
    id => walletsApi.delete(id), t('couldNotDeleteTheWallet'),
  )
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferFromId, setTransferFromId] = useState<string | undefined>(undefined)
  const [payingCreditId, setPayingCreditId] = useState<string | null>(null)

  const spendable = wallets.filter(w => w.type !== 'credit')
  const totalAssets = spendable.reduce((sum, w) => sum + Number(w.balance), 0)
  // Credit balances are money owed, so they are stated separately rather than
  // netted into the headline — the two numbers answer different questions.
  const creditOwed = wallets
    .filter(w => w.type === 'credit')
    .reduce((sum, w) => sum + Math.abs(Number(w.balance)), 0)
  const confirmWallet = wallets.find(w => w.id === confirmId)

  function openModal(wallet: Wallet | null = null) {
    setEditingWallet(wallet)
    setModalOpen(true)
  }

  return (
    <>
      <ScreenHeader
        eyebrow={t('money')}
        headline={
          wallets.length === 0
            ? <>{t('noWalletsYetAddOneToStartTrackingWhereYourMoneySits')}</>
            : <>{t.rich('walletHoldings', { amount: formatVND(totalAssets), count: spendable.length, strong: chunks => <Em>{chunks}</Em> })}</>
        }
        support={creditOwed > 0
          ? <><span className="text-rose-600 dark:text-rose-400">{t('sentenceOwedOnCards', { value0: formatVND(creditOwed) })}</span><Dot /><span>{t('sentenceAccountsTotal', { value0: wallets.length })}</span></>
          : undefined}
        segments={MONEY_SEGMENTS}
        action={
          <AddButton onClick={() => openModal()}>{t('newWallet')}</AddButton>
        }
      />

      <div>
      {wallets.length === 0 ? (
        <EmptyState
          message={t('noWalletsYet')}
          action={{ label: t('addYourFirstWallet'), onClick: () => openModal() }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={() => openModal(wallet)}
              onDelete={() => ask(wallet.id)}
              onTransfer={() => { setTransferFromId(wallet.id); setTransferOpen(true) }}
              onPay={() => setPayingCreditId(wallet.id)}
              isDeleting={isPending && confirmId === wallet.id}
            />
          ))}
        </div>
      )}

      </div>

      {modalOpen && (
        <WalletModal
          key={editingWallet?.id ?? 'new'}
          editing={editingWallet}
          onClose={() => { setModalOpen(false); setEditingWallet(null) }}
        />
      )}

      {transferOpen && wallets.length >= 2 && (
        <TransferModal
          wallets={wallets}
          defaultFromId={transferFromId}
          onClose={() => { setTransferOpen(false); setTransferFromId(undefined) }}
        />
      )}

      {payingCreditId && (() => {
        const cw = wallets.find(w => w.id === payingCreditId)
        return cw ? (
          <CreditPaymentModal
            creditWallet={cw}
            wallets={wallets}
            onClose={() => setPayingCreditId(null)}
          />
        ) : null
      })()}

      {confirmId && confirmWallet && (
        <ConfirmModal
          title={t('deleteNamedWallet', { name: confirmWallet.name })}
          description={
            confirmWallet.type !== 'credit' && Number(confirmWallet.balance) > 0
              ? t('deleteWithBalance', { amount: formatVND(Number(confirmWallet.balance)) })
              : t('thisWalletWillBePermanentlyDeletedExistingTransactionsLinkedToItWill')
          }
          confirmLabel={t('deleteWallet')}
          isPending={isPending}
          onConfirm={confirm}
          onClose={cancel}
        />
      )}
    </>
  )
}
