import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'
import { withAuth, jsonError } from '@/lib/server/route'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const POST = withAuth(async (request, { supabase, user }) => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return jsonError(500, 'Groq not configured')

  const { periodLabel, period, totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, force } = await request.json()
  const periodType: 'week' | 'month' | 'quarter' | 'year' = period ?? 'month'

  // Check DB cache (skip if force-refresh). Version prefix invalidates old
  // cached results whenever the prompt changes materially.
  const cacheKey = `v3::${periodType}::${periodLabel}::${totalIncome}::${totalExpense}`
  if (!force) {
    const { data: cached } = await supabase
      .from('ai_insights_cache')
      .select('result')
      .eq('user_id', user.id)
      .eq('cache_key', cacheKey)
      .single()
    if (cached?.result) return NextResponse.json(cached.result)
  }

  const groq = new Groq({ apiKey })

  const net = totalIncome - totalExpense
  const fmt = (n: number) => n.toLocaleString('vi-VN')

  const cats = ((categories ?? []) as { name: string; icon: string | null; amount: number }[])
  const catList = cats
    .slice(0, 8)
    .map(c => {
      const pct = totalExpense > 0 ? ((c.amount / totalExpense) * 100).toFixed(0) : 0
      return `  - ${c.icon ?? ''} ${c.name}: ${fmt(c.amount)}đ (${pct}% tổng chi)`
    })
    .join('\n')

  const typedBudgets = (budgets as { name: string; budgeted: number; spent: number }[] | undefined) ?? []
  const overBudget = typedBudgets.filter(b => b.spent > b.budgeted)
  const budgetSection = typedBudgets.length
    ? '\nNgân sách:\n' + typedBudgets
        .map(b => {
          const over = b.spent > b.budgeted
          return `  - ${b.name}: tiêu ${fmt(b.spent)}đ / ngân sách ${fmt(b.budgeted)}đ${over ? ' ⚠️ VƯỢT NGÂN SÁCH' : ''}`
        })
        .join('\n')
    : ''

  const savingsRate = totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : '0'

  // Pre-compute derived stats so the model never does arithmetic itself
  const periodDays: Record<typeof periodType, number> = { week: 7, month: 30, quarter: 91, year: 365 }
  const avgPerDay = Math.round(totalExpense / periodDays[periodType])
  const topCat = cats[0]
  const topCatPct = topCat && totalExpense > 0 ? Math.round((topCat.amount / totalExpense) * 100) : 0
  const cutSuggestions = cats
    .filter(c => c.amount >= totalExpense * 0.15)
    .slice(0, 3)
    .map(c => `  - Giảm 20% "${c.name}" → tiết kiệm ~${fmt(Math.round(c.amount * 0.2))}đ`)
    .join('\n')

  const periodFocus: Record<typeof periodType, string> = {
    week:    'Kỳ phân tích là 1 TUẦN. Đánh giá: mức chi 7 ngày so với thu nhập, ngày chi nhiều nhất (nếu có dữ liệu theo ngày), danh mục nào đang chiếm phần lớn tuần này.',
    month:   'Kỳ phân tích là 1 THÁNG. Đánh giá: tỷ lệ tiết kiệm, các danh mục vượt ngân sách, danh mục chiếm tỷ trọng lớn, thay đổi so với tháng trước.',
    quarter: 'Kỳ phân tích là 1 QUÝ (3 tháng). Đánh giá: bức tranh 3 tháng, tháng nào chi nhiều nhất, danh mục tốn kém nhất quý, tỷ lệ tiết kiệm, một mục tiêu cụ thể cho quý tới.',
    year:    'Kỳ phân tích là 1 NĂM. Đánh giá: sức khỏe tài chính cả năm, tỷ lệ tiết kiệm năm, danh mục chiếm tỷ trọng lớn nhất, một mục tiêu cụ thể cho năm sau.',
  }

  // --- Optional deep-analysis sections (sent by the Reports screen) ---

  // Previous-period comparison, with all percentages pre-computed
  const prev = previous as { label?: string; totalIncome: number; totalExpense: number; categories?: { name: string; amount: number }[] } | undefined
  let comparisonSection = ''
  if (prev && (prev.totalIncome > 0 || prev.totalExpense > 0)) {
    const pctChange = (cur: number, old: number) => old > 0 ? Math.round(((cur - old) / old) * 100) : null
    const describe = (label: string, cur: number, old: number) => {
      const ch = pctChange(cur, old)
      return `${label} kỳ trước: ${fmt(old)}đ${ch !== null ? ` → kỳ này ${ch >= 0 ? 'tăng' : 'giảm'} ${Math.abs(ch)}%` : ''}`
    }
    const catChanges = cats
      .map(c => {
        const old = prev.categories?.find(p => p.name === c.name)?.amount ?? 0
        const ch = pctChange(c.amount, old)
        return ch !== null && Math.abs(ch) >= 15
          ? `  - ${c.name}: ${ch >= 0 ? 'tăng' : 'giảm'} ${Math.abs(ch)}% (${fmt(old)}đ → ${fmt(c.amount)}đ)`
          : null
      })
      .filter(Boolean)
      .slice(0, 4)
      .join('\n')
    comparisonSection = [
      `\n=== SO SÁNH VỚI KỲ TRƯỚC${prev.label ? ` (${prev.label})` : ''} ===`,
      describe('Chi tiêu', totalExpense, prev.totalExpense),
      describe('Thu nhập', totalIncome, prev.totalIncome),
      catChanges ? `Danh mục thay đổi đáng kể (% đã tính sẵn):\n${catChanges}` : '',
    ].filter(Boolean).join('\n')
  }

  // Timeline: peak spending day/month, pre-digested so the model reads facts, not raw series
  const tl = (timeline ?? []) as { label: string; income: number; expense: number }[]
  let timelineSection = ''
  if (tl.length) {
    if (periodType === 'week') {
      timelineSection = '\nChi tiêu theo ngày trong tuần:\n' + tl.map(p => `  - ${p.label}: ${fmt(p.expense)}đ`).join('\n')
    } else if (periodType === 'month') {
      const top = [...tl].filter(p => p.expense > 0).sort((a, b) => b.expense - a.expense).slice(0, 3)
      const zeroDays = tl.filter(p => p.expense === 0).length
      if (top.length) {
        timelineSection = `\nNgày chi nhiều nhất trong tháng: ${top.map(p => `ngày ${p.label} (${fmt(p.expense)}đ)`).join(', ')}. Số ngày không chi tiêu: ${zeroDays}.`
      }
    } else {
      timelineSection = '\nThu chi theo tháng:\n' + tl.map(p => `  - ${p.label}: chi ${fmt(p.expense)}đ / thu ${fmt(p.income)}đ`).join('\n')
    }
  }

  // Largest individual expenses — lets insights call out concrete purchases
  const bigTxs = (topTransactions ?? []) as { note: string | null; category: string | null; amount: number; date: string }[]
  const topTxSection = bigTxs.length
    ? '\nCác khoản chi lớn nhất kỳ này:\n' + bigTxs
        .map(t => `  - ${t.note || 'Không ghi chú'}${t.category ? ` [${t.category}]` : ''}: ${fmt(t.amount)}đ (${t.date})`)
        .join('\n')
    : ''

  const system = [
    'Bạn là cố vấn tài chính cá nhân cho một người dùng Việt Nam (đơn vị: đồng).',
    '',
    'Nguyên tắc bắt buộc:',
    '- CHỈ dùng số liệu được cung cấp trong tin nhắn. Không bịa số, không tự tính toán % — mọi con số và % cần thiết đã được tính sẵn.',
    '- Chỉ nói về xu hướng/so sánh kỳ trước nếu có mục "SO SÁNH VỚI KỲ TRƯỚC". Chỉ nhắc đến giao dịch hoặc ngày cụ thể nếu chúng xuất hiện trong dữ liệu.',
    '- Mỗi nhận xét phải gắn với tên danh mục hoặc con số thực. Cấm lời khuyên chung chung kiểu "hãy chi tiêu hợp lý hơn", "nên theo dõi chi tiêu", "cân nhắc cắt giảm".',
    '- Giọng thân thiện, tự nhiên, xưng "bạn". Mỗi insight tối đa 2 câu ngắn.',
    '- Định dạng tiền: 1.234.567đ. Không dùng chữ "VND".',
    '- Trả về JSON thuần đúng schema, không markdown, không giải thích thêm.',
  ].join('\n')

  const userMsg = [
    periodFocus[periodType],
    '',
    `=== DỮ LIỆU KỲ: ${periodLabel} ===`,
    `Thu nhập: ${fmt(totalIncome)}đ`,
    `Chi tiêu: ${fmt(totalExpense)}đ (trung bình ${fmt(avgPerDay)}đ/ngày)`,
    net >= 0
      ? `Tiết kiệm: ${fmt(net)}đ (${savingsRate}% thu nhập)`
      : `BỘI CHI: ${fmt(-net)}đ (chi vượt thu)`,
    overBudget.length ? `Danh mục vượt ngân sách: ${overBudget.map(b => `${b.name} (vượt ${fmt(b.spent - b.budgeted)}đ)`).join(', ')}` : 'Không có danh mục nào vượt ngân sách.',
    '',
    'Top danh mục chi (tối đa 8, % tính trên tổng chi — có thể không cộng đủ 100%):',
    catList || '  (chưa có giao dịch chi tiêu nào)',
    budgetSection,
    timelineSection,
    topTxSection,
    comparisonSection,
    cutSuggestions ? `\nGợi ý cắt giảm đã tính sẵn (dùng nguyên con số này nếu viết tip cắt giảm):\n${cutSuggestions}` : '',
    '',
    '=== OUTPUT JSON ===',
    '{',
    '  "summary": "1-2 câu tóm tắt: tình hình kỳ này, tỷ lệ tiết kiệm, danh mục chiếm nhiều nhất",',
    `  "topSpend": "dựa đúng dòng đầu danh sách danh mục — ví dụ: ${topCat ? `${topCat.name} chiếm ${topCatPct}% chi tiêu (${fmt(topCat.amount)}đ)` : 'Ăn uống chiếm 45% chi tiêu (2.250.000đ)'}",`,
    '  "insights": [',
    '    { "emoji": "<emoji khớp nội dung>", "text": "<nhận xét>", "type": "warning|tip|good" }',
    '  ],',
    '  "score": <số nguyên 0-100>',
    '}',
    '',
    '=== QUY TẮC ===',
    '1. 3-5 insights, mỗi insight nói MỘT ý riêng, không trùng ý nhau, không lặp lại summary.',
    '2. "warning" CHỈ khi có vấn đề thật trong dữ liệu: vượt ngân sách, bội chi, tỷ lệ tiết kiệm dưới 10%, hoặc một danh mục chiếm trên 40% tổng chi. Tài chính lành mạnh thì KHÔNG bịa cảnh báo — dùng "good" để ghi nhận điểm tốt.',
    '3. Mỗi danh mục vượt ngân sách phải có 1 warning nêu rõ số tiền vượt.',
    '4. Có ít nhất 1 "tip" hành động được. Nếu là tip cắt giảm, dùng nguyên con số từ phần "Gợi ý cắt giảm đã tính sẵn".',
    comparisonSection ? '4b. Có ít nhất 1 insight về thay đổi đáng chú ý nhất so với kỳ trước, dùng đúng % đã tính sẵn trong mục SO SÁNH.' : '',
    '5. Emoji khớp nội dung, không dùng một emoji 2 lần.',
    '6. Score theo tỷ lệ tiết kiệm: ≥30% → 85-100 | 20-29% → 70-84 | 10-19% → 55-69 | 0-9% → 40-54 | bội chi → 0-39. Sau đó trừ 5 điểm cho mỗi danh mục vượt ngân sách (không xuống dưới 0).',
    '7. Nếu chưa có giao dịch chi tiêu: score=50, summary khuyến khích bắt đầu ghi chép, 2 tip để bắt đầu.',
  ].filter(Boolean).join('\n')

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      })
      const data = JSON.parse(completion.choices[0].message.content ?? '{}')

      await supabase.from('ai_insights_cache').upsert({
        user_id: user.id,
        cache_key: cacheKey,
        result: data,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,cache_key' })

      return NextResponse.json(data)
    } catch (err: unknown) {
      const e = err as { status?: number }
      if (e?.status === 429 && attempt < 2) {
        await sleep((attempt + 1) * 4000)
        continue
      }
      console.error('[AI spending analysis]', err)
      if (e?.status === 429) {
        return jsonError(429, 'rate_limit')
      }
      return jsonError(500, 'Analysis failed')
    }
  }

  return jsonError(500, 'Analysis failed')
})
