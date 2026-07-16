'use client'

import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { formatVND } from '@/lib/utils/currency'
import { type Wallet, walletsApi } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { WalletCard } from './wallet-card'
import { WalletModal } from './wallet-modal'
import { TransferModal } from './transfer-modal'
import { CreditPaymentModal } from './credit-payment-modal'

export default function WalletsClient({ wallets }: { wallets: Wallet[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferFromId, setTransferFromId] = useState<string | undefined>(undefined)
  const [payingCreditId, setPayingCreditId] = useState<string | null>(null)

  const totalAssets = wallets.reduce((sum, w) => w.type === 'credit' ? sum : sum + Number(w.balance), 0)
  const confirmWallet = wallets.find(w => w.id === confirmId)

  function openModal(wallet: Wallet | null = null) {
    setEditingWallet(wallet)
    setModalOpen(true)
  }

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await walletsApi.delete(confirmId); router.refresh() }
      catch { /* toast later */ }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      {/* Total balance hero */}
      {wallets.length > 0 && (
        <div className="bg-[#111111] dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl px-5 py-5 mb-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30 mb-2">Total Balance</p>
          <p className="text-3xl sm:text-4xl font-light tabular-nums leading-none text-white">
            {formatVND(totalAssets)}
          </p>
          {wallets.length > 0 && (
            <p className="text-xs tabular-nums text-white/30 mt-2">
              {wallets.filter(w => w.type !== 'credit').length} wallet{wallets.filter(w => w.type !== 'credit').length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          {wallets.length > 0 ? `${wallets.length} wallet${wallets.length > 1 ? 's' : ''}` : ''}
        </p>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          New wallet
        </button>
      </div>

      {wallets.length === 0 ? (
        <EmptyState
          message="No wallets yet."
          action={{ label: 'Add your first wallet', onClick: () => openModal() }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={() => openModal(wallet)}
              onDelete={() => setConfirmId(wallet.id)}
              onTransfer={() => { setTransferFromId(wallet.id); setTransferOpen(true) }}
              onPay={() => setPayingCreditId(wallet.id)}
              isDeleting={isPending && confirmId === wallet.id}
            />
          ))}
        </div>
      )}

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
          title={`Delete "${confirmWallet.name}"?`}
          description={
            Number(confirmWallet.balance) > 0
              ? `This wallet has a remaining balance of ${formatVND(Number(confirmWallet.balance))}. It will be automatically transferred to your default wallet before deletion.`
              : 'This wallet will be permanently deleted. Existing transactions linked to it will not be deleted.'
          }
          confirmLabel="Delete wallet"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </>
  )
}
