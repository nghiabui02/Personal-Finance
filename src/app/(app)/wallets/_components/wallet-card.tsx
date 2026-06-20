import { formatVND } from '@/lib/utils/currency'
import { type Wallet, WALLET_TYPE_LABELS } from '@/lib/api/wallets'

interface WalletCardProps {
  wallet: Wallet
  onEdit: () => void
  onDelete: () => void
  onTransfer: () => void
  isDeleting: boolean
}

const WALLET_ICONS: Record<Wallet['type'], string> = {
  cash: '💵',
  bank: '🏦',
  e_wallet: '📱',
  investment: '📈',
  other: '💼',
}

export function WalletCard({ wallet, onEdit, onDelete, onTransfer, isDeleting }: WalletCardProps) {
  const defaultIcon = WALLET_ICONS[wallet.type]
  const bg = wallet.color ?? '#3b82f6'

  return (
    <div
      className="relative rounded-2xl p-5 text-white flex flex-col gap-3 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bg}ee, ${bg}99)` }}
    >
      {/* Default badge */}
      {wallet.is_default && (
        <span className="absolute top-4 right-4 text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">
          Default
        </span>
      )}

      {/* Icon + type */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{wallet.icon || defaultIcon}</span>
        <span className="text-xs font-medium opacity-80 bg-white/20 px-2 py-0.5 rounded-full">
          {WALLET_TYPE_LABELS[wallet.type]}
        </span>
      </div>

      {/* Name */}
      <p className="font-semibold text-base leading-tight">{wallet.name}</p>

      {/* Balance */}
      <p className="text-2xl font-bold tracking-tight">{formatVND(wallet.balance)}</p>

      {/* Actions */}
      <div className="flex gap-1.5 mt-1">
        <button
          onClick={onTransfer}
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>
          </svg>
          Transfer
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
          </svg>
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-red-500/60 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  )
}
