/**
 * Turning a request body into the arguments of a money function.
 *
 * Two functions take the same arguments from two routes (a transaction is
 * created, or edited), and two more (a debt payment, a further loan) take
 * another shared set. Written once here, the routes cannot drift apart on
 * which field is optional or what an empty string means.
 */

interface TransactionBody {
  type: string
  amount: unknown
  transaction_date: string
  category_id?: string | null
  wallet_id?: string | null
  note?: string | null
  bank_fee?: number | null
}

/** Arguments `create_transaction` and `update_transaction` have in common.
 *  `amount` is the base; the function adds the fee and moves the wallet by the total. */
export function transactionRpcParams(body: TransactionBody) {
  return {
    p_type: body.type,
    p_amount: Number(body.amount),
    p_transaction_date: body.transaction_date,
    p_category_id: body.category_id || null,
    p_wallet_id: body.wallet_id || null,
    p_note: body.note ?? null,
    p_bank_fee: body.bank_fee ?? null,
  }
}

interface DebtMovementBody {
  amount: unknown
  note?: string | null
  date?: string | null
  wallet_id?: string | null
}

/** Arguments `record_debt_payment` and `add_to_debt` have in common. */
export function debtMovementRpcParams(
  debtId: string,
  body: DebtMovementBody,
  categoryId: string | null,
  today: string,
) {
  return {
    p_debt_id: debtId,
    p_amount: Number(body.amount),
    p_date: body.date || today,
    p_wallet_id: body.wallet_id || null,
    p_category_id: categoryId,
    p_note: body.note ?? null,
  }
}
