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

export default function WalletsClient({ wallets }: { wallets: Wallet[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferFromId, setTransferFromId] = useState<string | undefined>(undefined)

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0)
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
      <button
        onClick={() => openModal()}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors flex items-center justify-center"
        aria-label="New wallet"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
        </svg>
      </button>

      {wallets.length > 0 && (
        <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Total Balance
          </p>
          <p className="text-[2.5rem] font-bold tracking-tight text-white tabular-nums leading-none">
            {formatVND(totalBalance)}
          </p>
          <p className="text-sm text-slate-400 mt-1.5">
            across {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

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
