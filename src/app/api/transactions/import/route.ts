import { NextResponse } from 'next/server'
import { withAuth, badRequest, rpcError } from '@/lib/server/route'
import { importDatabaseError, importWallet, parseImportRequest } from '@/lib/server/bank-import'
import { CsvError, validateDecisions } from '@/lib/imports/bank-csv'

/** One RPC commits the selected rows, source identities, and balance together. */
export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const { walletId, rows, decisions } = parseImportRequest(await request.json())
    await importWallet(supabase, user.id, walletId)
    const choices = validateDecisions(decisions, rows)
    const byRow = new Map(rows.map(row => [row.row, row]))
    const entries = choices.map(choice => ({ ...byRow.get(choice.row)!, ...choice }))
    const { data, error } = await supabase.rpc('import_bank_statement', { p_wallet_id: walletId, p_entries: entries })
    if (error) return rpcError(importDatabaseError(error))
    console.info('[bank-import] completed', { userId: user.id, walletId, imported: data.imported, skipped: data.skipped })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof CsvError) return badRequest(error.message)
    throw error
  }
})
