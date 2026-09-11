import Link from 'next/link'
import { MONEY_IN, MONEY_OUT } from '@/lib/utils/colors'
import { formatVND } from '@/lib/utils/currency'
import { type Wallet, WALLET_TYPE_ICONS, WALLET_TYPE_LABELS } from '@/lib/api/wallets'
import { getCreditCycle, daysUntil } from '@/lib/utils/credit'
import { localYMD } from '@/lib/utils/date'

interface WalletCardProps {
  wallet: Wallet
  onEdit: () => void
  onDelete: () => void
  onTransfer: () => void
  onPay: () => void
  isDeleting: boolean
}

function CreditCardInfo({ wallet }: { wallet: Wallet }) {
  const limit = wallet.credit_limit ?? 0
  const available = wallet.balance
  const used = limit - available
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0

  const today = localYMD()
  const cycle = wallet.statement_day && wallet.payment_due_day
    ? getCreditCycle(wallet.statement_day, wallet.payment_due_day, today)
    : null

  const daysLeft = cycle ? daysUntil(cycle.dueDate, today) : null
  const barColor = pct > 80 ? MONEY_OUT : pct > 50 ? '#f97316' : MONEY_IN

  return (
    <div className="flex flex-col gap-2.5">
      {/* Available credit */}
      <div>
        <p className="text-xs opacity-70 mb-0.5">Available credit</p>
        <p className="text-2xl font-bold tracking-tight">{formatVND(available)}</p>
        <p className="text-xs opacity-60">of {formatVND(limit)} limit</p>
      </div>

      {/* Utilization bar */}
      <div className="w-full bg-white/20 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-xs opacity-70 -mt-1">{pct.toFixed(0)}% used · {formatVND(used)} spent</p>

      {/* Due date */}
      {cycle && daysLeft !== null && (
        <div className="bg-white/15 rounded-xl px-3 py-2">
          <p className="text-xs opacity-70">Payment due {cycle.dueDate}</p>
          <p className="text-sm font-semibold">
            {daysLeft > 0
              ? `${daysLeft} days left`
              : daysLeft === 0
              ? 'Due today!'
              : `${Math.abs(daysLeft)} days overdue`}
          </p>
        </div>
      )}
    </div>
  )
}

export function WalletCard({ wallet, onEdit, onDelete, onTransfer, onPay, isDeleting }: WalletCardProps) {
  const defaultIcon = WALLET_TYPE_ICONS[wallet.type]
  const bg = wallet.color ?? '#3b82f6'
  const isCredit = wallet.type === 'credit'

  return (
    <div
      className="relative rounded-2xl p-5 text-white flex flex-col gap-3 overflow-hidden animate-fade-up"
      style={{ background: `linear-gradient(135deg, ${bg}ee, ${bg}99)` }}
    >
      {wallet.is_default && (
        <span className="absolute top-4 right-4 text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">
          Default
        </span>
      )}

      <Link href={`/wallets/${wallet.id}`} className="flex flex-col gap-3 group">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{wallet.icon || defaultIcon}</span>
          <span className="text-xs font-medium opacity-80 bg-white/20 px-2 py-0.5 rounded-full">
            {WALLET_TYPE_LABELS[wallet.type]}
          </span>
        </div>

        <p className="font-semibold text-base leading-tight group-hover:underline underline-offset-2">
          {wallet.name}
        </p>

        {isCredit ? (
          <CreditCardInfo wallet={wallet} />
        ) : (
          <p className="text-2xl font-bold tracking-tight">{formatVND(wallet.balance)}</p>
        )}
      </Link>

      <div className="flex gap-1.5 mt-1">
        {isCredit ? (
          <button
            onClick={onPay}
            className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75"/>
            </svg>
            Pay
          </button>
        ) : (
          <button
            onClick={onTransfer}
            className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>
            </svg>
            Transfer
          </button>
        )}
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
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-rose-500/60 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
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
