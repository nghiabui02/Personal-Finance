import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'
import { withAuth, badRequest, jsonError } from '@/lib/server/route'
import { CATEGORY_COLUMNS } from '@/lib/api/categories'
import { localYMD } from '@/lib/utils/date'

/**
 * Turns one line of everyday text into a draft transaction:
 *
 *   "cà phê 35k vcb"                      → expense · Food · 35.000 · VCB
 *   "lương tháng 9 25tr"                  → income  · Salary · 25.000.000
 *   "SO DU TK ...123 -82,000VND GRAB"     → expense · Transport · 82.000
 *
 * Returns a draft only. Nothing is written — the modal opens pre-filled so the
 * user confirms before anything lands in their ledger.
 */

const MAX_INPUT_CHARS = 600

const SYSTEM_PROMPT = `You extract a single financial transaction from a short piece of text.

The text is written by a Vietnamese user and may be:
- shorthand they typed ("cà phê 35k vcb", "grab 82k tiền mặt")
- a pasted bank SMS or app notification (Vietnamese banks: VCB, Techcombank, MB, ACB, BIDV, TPBank, VPBank)

Rules:
- Amounts use Vietnamese shorthand: "k"/"ng" = thousand, "tr"/"m" = million, "tỷ" = billion.
  "35k" = 35000. "1tr2" = 1200000. "25tr" = 25000000. Dots and commas are digit
  separators, never decimals: "82,000" = 82000, "1.500.000" = 1500000.
- type is "expense" unless the text clearly describes money coming in
  (lương, thưởng, nhận, hoàn tiền, bán, GHI CO, +).
- Pick category_id from the provided list. Match on meaning, not spelling.
  Use null when nothing fits — never invent an id.
- Pick wallet_id from the provided list when the text names or abbreviates one
  (vcb, techcom, tcb, mb, tiền mặt, tm, cash, momo). Use null otherwise.
- note: a short human label for the row, in the user's own words. Strip bank
  boilerplate (account numbers, balances, reference codes). Omit if the category
  already says everything.
- date: only set it when the text states one; otherwise null (today is used).
- confidence: 0-1. Below 0.5 means you are guessing at the amount or type.

Respond with JSON only:
{"type":"expense|income","amount":number,"category_id":string|null,"wallet_id":string|null,"note":string|null,"date":"YYYY-MM-DD"|null,"confidence":number}`

export const POST = withAuth(async (request, { supabase, user }) => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return jsonError(500, 'Groq is not configured.')

  const { text } = await request.json()
  const input = typeof text === 'string' ? text.trim() : ''
  if (!input) return badRequest('Type what you spent, or paste a bank message.')
  if (input.length > MAX_INPUT_CHARS) return badRequest('That text is too long to read as one transaction.')

  const [{ data: categories }, { data: wallets }] = await Promise.all([
    supabase.from('categories').select(CATEGORY_COLUMNS).order('name'),
    supabase.from('wallets').select('id, name, type').eq('user_id', user.id).order('name'),
  ])

  // Only ids the model may choose from — anything else is rejected below.
  const categoryList = (categories ?? []).map(c => ({ id: c.id, name: c.name, type: c.type }))
  const walletList = (wallets ?? []).map(w => ({ id: w.id, name: w.name, type: w.type }))

  const groq = new Groq({ apiKey })

  let draft: Record<string, unknown>
  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            text: input,
            today: localYMD(),
            categories: categoryList,
            wallets: walletList,
          }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })
    draft = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  } catch (err) {
    console.error('[api] parse-transaction: groq failed:', err)
    return jsonError(502, 'Could not read that. Try rewording it, or enter the transaction manually.')
  }

  const amount = Number(draft.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return badRequest('No amount found in that text.')
  }

  // The model is told to pick from the lists, but never trusted to have done so.
  const categoryId = categoryList.some(c => c.id === draft.category_id) ? String(draft.category_id) : null
  const walletId = walletList.some(w => w.id === draft.wallet_id) ? String(draft.wallet_id) : null
  const date = typeof draft.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : null

  return NextResponse.json({
    type: draft.type === 'income' ? 'income' : 'expense',
    amount: Math.round(amount),
    category_id: categoryId,
    wallet_id: walletId,
    note: typeof draft.note === 'string' && draft.note.trim() ? draft.note.trim().slice(0, 120) : null,
    date,
    confidence: typeof draft.confidence === 'number' ? draft.confidence : null,
  })
})
