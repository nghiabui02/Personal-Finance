'use client'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatVND } from '@/lib/utils/currency'
import { type Wallet, walletsApi } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { WalletCard } from './wallet-card'
import { WalletModal } from './wallet-modal'

export default function WalletsClient({ wallets }: { wallets: Wallet[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0)
  const confirmWallet = wallets.find(w => w.id === confirmId)

  function openModal(wallet: Wallet | null = null) {
    setEditingWallet(wallet)
    setModalOpen(true)
  }

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try {
        await walletsApi.delete(confirmId)
        router.refresh()
      } catch {
        // add toast later
      } finally {
        setConfirmId(null)
      }
    })
  }

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Wallets</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage your accounts and balances</p>
        </div>
        <Button onClick={() => openModal()} className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          New wallet
        </Button>
      </div>

      {wallets.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 mb-6 text-white">
          <p className="text-sm font-medium opacity-80 mb-1">Total Balance</p>
          <p className="text-3xl font-bold tracking-tight">{formatVND(totalBalance)}</p>
          <p className="text-xs opacity-60 mt-1">{wallets.length} wallet{wallets.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No wallets yet.</p>
          <button onClick={() => openModal()} className="mt-2 text-sm text-blue-600 hover:underline">
            Add your first wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={() => openModal(wallet)}
              onDelete={() => setConfirmId(wallet.id)}
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

      {confirmId && (
        <ConfirmModal
          title={`Delete "${confirmWallet?.name}"?`}
          description="This wallet will be permanently deleted. Existing transactions linked to it will not be deleted."
          confirmLabel="Delete wallet"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </>
  )
}
