import type { ServerClient } from './route'

/** Whether a debt is money lent out or borrowed in — or null when it is not the caller's.
 *  The direction decides which system category a payment or a further loan is filed under. */
export async function getOwnedDebtType(
  supabase: ServerClient,
  userId: string,
  debtId: string,
): Promise<'lend' | 'borrow' | null> {
  const { data } = await supabase
    .from('debts')
    .select('type')
    .eq('id', debtId)
    .eq('user_id', userId)
    .single()
  return data?.type ?? null
}
