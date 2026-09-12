import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Guards a wallet against being spent past what it holds.
 *
 * For ordinary wallets `balance` is money on hand. For credit cards it is the
 * credit still available (the database also caps it at the card's limit), so
 * the same comparison answers both questions: can this wallet cover the spend?
 */

interface BalanceCheck {
  ok: boolean
  /** Ready-to-show sentence when `ok` is false. */
  message?: string
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

/**
 * @param needed  Amount leaving the wallet. Pass the *net* change when editing
 *                an existing row — the part already deducted is still deducted.
 */
export async function checkWalletCanCover(
  supabase: SupabaseClient,
  userId: string,
  walletId: string,
  needed: number,
): Promise<BalanceCheck> {
  if (needed <= 0) return { ok: true }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('name, type, balance')
    .eq('id', walletId)
    .eq('user_id', userId)
    .single()

  if (!wallet) return { ok: false, message: 'Wallet not found.' }

  const available = Number(wallet.balance)
  if (available >= needed) return { ok: true }

  return {
    ok: false,
    message: wallet.type === 'credit'
      ? `${wallet.name} has only ${formatAmount(available)}đ of credit left.`
      : `${wallet.name} only has ${formatAmount(available)}đ.`,
  }
}
