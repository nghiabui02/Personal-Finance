import { Select } from '@/components/ui/select'
import type { Wallet } from '@/lib/api/wallets'
import { MAX_IMPORT_ROWS } from '@/lib/imports/bank-csv'
import { CsvColumnMapping } from './csv-column-mapping'
import type { useCsvSource } from './use-bank-import'

export function ImportSource({ source, wallets, walletId, disabled, onWalletChange }: {
  source: ReturnType<typeof useCsvSource>; wallets: Wallet[]; walletId: string
  disabled: boolean; onWalletChange: (id: string) => void
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4 rounded-xl border border-hairline p-4">
      <Select label="Bank wallet" value={walletId} onChange={event => onWalletChange(event.target.value)}>
        {wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
      </Select>
      <div>
        <label htmlFor="bank-csv" className="block text-sm font-medium mb-1">VCB statement CSV</label>
        <input id="bank-csv" type="file" accept=".csv,text/csv" onChange={event => { void source.loadFile(event.target.files?.[0]) }} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2" />
        <p className="text-xs text-gray-500 mt-2">CSV UTF-8 only, up to 1 MB and {MAX_IMPORT_ROWS} transactions. Remove totals/footer records before uploading. No banking credentials needed.</p>
      </div>
      {source.csv && <Select label="CSV separator" value={source.delimiter} onChange={event => source.changeDelimiter(event.target.value)}>
        <option value=",">Comma (,)</option><option value=";">Semicolon (;)</option><option value={'\t'}>Tab</option>
      </Select>}
      {source.parseError && <p role="alert" className="text-sm text-rose-600">{source.parseError}</p>}
      {!!source.records.length && <CsvColumnMapping records={source.records} mapping={source.mapping} onChange={source.setMapping} />}
    </fieldset>
  )
}
