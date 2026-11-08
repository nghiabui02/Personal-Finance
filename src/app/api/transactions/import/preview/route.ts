import { NextResponse } from 'next/server'
import { withAuth, badRequest, rpcError } from '@/lib/server/route'
import { importDatabaseError, importWallet, parseImportRequest } from '@/lib/server/bank-import'
import { CsvError } from '@/lib/imports/bank-csv'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const { walletId, rows } = parseImportRequest(await request.json())
    const wallet = await importWallet(supabase, user.id, walletId)
    // Bound query URLs and avoid the default result cap hiding older imports.
    const keysPerQuery = 50
    const batches = Array.from({ length: Math.ceil(rows.length / keysPerQuery) }, (_, index) => rows.slice(index * keysPerQuery, (index + 1) * keysPerQuery))
    const results = await Promise.all(batches.map(batch => supabase.from('bank_statement_imports')
      .select('source_key, amount, type, transaction_date')
      .eq('user_id', user.id).eq('wallet_id', walletId).in('source_key', batch.map(row => row.source_key))))
    const failed = results.find(result => result.error)
    if (failed?.error) return rpcError(importDatabaseError(failed.error))
    const existing = new Map(results.flatMap(result => result.data ?? []).map(entry => [entry.source_key, entry]))
    return NextResponse.json({ balance: Number(wallet.balance), rows: rows.map(row => {
      const previous = existing.get(row.source_key)
      const conflict = !!previous && (Number(previous.amount) !== row.amount || previous.type !== row.type || previous.transaction_date !== row.date)
      return { ...row, identity: undefined, source_key: undefined, duplicate: !!previous, conflict }
    }) })
  } catch (error) {
    if (error instanceof CsvError) return badRequest(error.message)
    throw error
  }
})
