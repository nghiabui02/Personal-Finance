'use client'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { MONEY_SEGMENTS } from '@/components/ui/segment-nav'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Dot, Em } from '@/components/ui/verdict'
import { toastError } from '@/components/ui/toast'
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

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await walletsApi.delete(confirmId); router.refresh() }
      catch (err) { toastError(err, 'Could not delete the wallet.') }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      <ScreenHeader
        eyebrow="Money"
        headline={
          wallets.length === 0
            ? <>No wallets yet — add one to start tracking where your money sits.</>
            : <>You hold <Em>{formatVND(totalAssets)}</Em> across {spendable.length} wallet{spendable.length === 1 ? '' : 's'}.</>
        }
        support={creditOwed > 0
          ? <><span className="text-rose-600 dark:text-rose-400">{formatVND(creditOwed)} owed on cards</span><Dot /><span>{wallets.length} accounts total</span></>
          : undefined}
        segments={MONEY_SEGMENTS}
        action={
          <Button onClick={() => openModal()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            New wallet
          </Button>
        }
      />

      <div>
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
