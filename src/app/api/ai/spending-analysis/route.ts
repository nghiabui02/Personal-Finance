import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'
import { withAuth, jsonError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const POST = withAuth(async (request, { supabase, user }) => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return jsonError(500, 'Groq not configured')

  const { periodLabel, period, totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, netWorthInfo, force } = await request.json()
  const periodType: 'week' | 'month' | 'quarter' | 'year' = period ?? 'month'

  // Balance-sheet snapshot fetched server-side — the client only knows the
  // period's in/out flows, but sound advice needs the current position too
  const [{ data: walletRows }, { data: debtRows }, { data: goalRows }] = await Promise.all([
    supabase.from('wallets')
      .select('name, type, balance, credit_limit')
      .eq('user_id', user.id),
    supabase.from('debts')
      .select('type, remaining_amount, due_date')
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('saving_goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', user.id).eq('status', 'active'),
  ])

  const wallets = walletRows ?? []
  const liquidAssets = wallets
    .filter(w => w.type !== 'credit')
    .reduce((s, w) => s + Number(w.balance), 0)
  const creditWallets = wallets.filter(w => w.type === 'credit' && Number(w.credit_limit) > 0)
  const creditLimitTotal = creditWallets.reduce((s, w) => s + Number(w.credit_limit), 0)
  const creditUsed = creditWallets.reduce((s, w) => s + Math.max(0, Number(w.credit_limit) - Number(w.balance)), 0)
  const receivable = (debtRows ?? []).filter(d => d.type === 'lend')
    .reduce((s, d) => s + Number(d.remaining_amount), 0)
  const payable = (debtRows ?? []).filter(d => d.type === 'borrow')
    .reduce((s, d) => s + Number(d.remaining_amount), 0)
  const netWorth = liquidAssets + receivable - creditUsed - payable

  // Check DB cache (skip if force-refresh). Version prefix invalidates old
  // cached results whenever the prompt changes materially.
  const cacheKey = `v5::${periodType}::${periodLabel}::${totalIncome}::${totalExpense}::${netWorth}`
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

  // --- Balance-sheet metrics (all pre-computed, standard personal-finance ratios) ---

  // Normalize the period's expense to a monthly figure for runway math
  const monthlyExpenseFactor: Record<typeof periodType, number> = { week: 4.33, month: 1, quarter: 1 / 3, year: 1 / 12 }
  const monthlyExpense = Math.round(totalExpense * monthlyExpenseFactor[periodType])
  const runwayMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : null
  const creditUtilPct = creditLimitTotal > 0 ? Math.round((creditUsed / creditLimitTotal) * 100) : null

  const goals = goalRows ?? []
  const goalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0)
  const goalCurrent = goals.reduce((s, g) => s + Number(g.current_amount), 0)
  const goalPct = goalTarget > 0 ? Math.round((goalCurrent / goalTarget) * 100) : null

  const overdueDebts = (debtRows ?? []).filter(d =>
    d.type === 'borrow' && Number(d.remaining_amount) > 0 && d.due_date && d.due_date < localYMD())

  const nwInfo = netWorthInfo as { current: number; changeAmount: number | null; changeDays: number | null } | undefined
  const netWorthChangeLine = nwInfo?.changeAmount != null && nwInfo.changeDays != null && nwInfo.changeDays > 0
    ? `Biến động tài sản ròng: ${nwInfo.changeAmount >= 0 ? 'TĂNG' : 'GIẢM'} ${fmt(Math.abs(nwInfo.changeAmount))}đ trong ${nwInfo.changeDays} ngày qua`
    : ''

  const assetSection = [
    '\n=== TÀI SẢN & DÒNG TIỀN HIỆN TẠI (số dư thực tế, không phải thu chi trong kỳ) ===',
    `Tiền khả dụng (tiền mặt + tài khoản + ví): ${fmt(liquidAssets)}đ`,
    creditLimitTotal > 0
      ? `Nợ thẻ tín dụng: ${fmt(creditUsed)}đ / hạn mức ${fmt(creditLimitTotal)}đ (đang dùng ${creditUtilPct}% hạn mức)`
      : 'Không có thẻ tín dụng.',
    receivable > 0 ? `Đang cho vay (chưa thu hồi): ${fmt(receivable)}đ` : '',
    payable > 0 ? `Đang đi vay (chưa trả): ${fmt(payable)}đ${overdueDebts.length ? ` — trong đó ${overdueDebts.length} khoản ĐÃ QUÁ HẠN` : ''}` : '',
    `Tài sản ròng (khả dụng + cho vay − nợ thẻ − đi vay): ${fmt(netWorth)}đ`,
    netWorthChangeLine,
    runwayMonths !== null
      ? `Quỹ dự phòng: tiền khả dụng đủ chi tiêu cho ${runwayMonths.toFixed(1)} tháng (mức chi ~${fmt(monthlyExpense)}đ/tháng)`
      : 'Chưa tính được quỹ dự phòng (chưa có chi tiêu trong kỳ).',
    goalPct !== null ? `Mục tiêu tiết kiệm: đã góp ${fmt(goalCurrent)}đ / ${fmt(goalTarget)}đ (${goalPct}%) cho ${goals.length} mục tiêu` : '',
    '',
    'Chuẩn tham chiếu tài chính cá nhân (dùng để đánh giá, KHÔNG tự tính lại):',
    '  - Quỹ dự phòng an toàn: 3-6 tháng chi tiêu. Dưới 1 tháng là rủi ro cao.',
    '  - Nợ thẻ tín dụng: nên giữ dưới 30% hạn mức; trên 80% là báo động.',
    '  - Thứ tự ưu tiên dòng tiền dư: (1) trả nợ quá hạn/nợ thẻ, (2) đắp quỹ dự phòng đủ 3 tháng, (3) góp mục tiêu tiết kiệm.',
  ].filter(Boolean).join('\n')

  // Score computed here so the model never does arithmetic. Weeks are scored on
  // spending control vs the previous week — salary lands once a month, so a week
  // without income is normal, NOT a deficit. Other periods use the savings-rate band.
  const prev = previous as { label?: string; totalIncome: number; totalExpense: number; categories?: { name: string; amount: number }[] } | undefined
  let suggestedScore: number
  if (periodType === 'week') {
    const prevExpense = Number(prev?.totalExpense ?? 0)
    const expenseChange = prevExpense > 0 ? (totalExpense - prevExpense) / prevExpense : null
    suggestedScore =
      expenseChange === null ? 60 :
      expenseChange <= -0.1 ? 78 :
      expenseChange <=  0.1 ? 68 :
      expenseChange <=  0.3 ? 55 : 40
  } else {
    const rate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
    suggestedScore =
      net < 0 ? 25 :
      rate >= 30 ? 90 :
      rate >= 20 ? 77 :
      rate >= 10 ? 62 : 47
  }
  suggestedScore -= 5 * overBudget.length
  if (nwInfo?.changeAmount != null && nwInfo.changeAmount > 0) suggestedScore += 4
  if (runwayMonths !== null) {
    if (runwayMonths >= 6) suggestedScore += 8
    else if (runwayMonths >= 3) suggestedScore += 4
    else if (runwayMonths < 1) suggestedScore -= 10
    else suggestedScore -= 4
  }
  if (creditUtilPct !== null) {
    if (creditUtilPct >= 80) suggestedScore -= 10
    else if (creditUtilPct >= 50) suggestedScore -= 5
  }
  if (netWorth < 0) suggestedScore -= 15
  if (overdueDebts.length > 0) suggestedScore -= 5
  suggestedScore = Math.max(0, Math.min(100, Math.round(suggestedScore)))

  const periodFocus: Record<typeof periodType, string> = {
    week:    'Kỳ phân tích là 1 TUẦN. QUAN TRỌNG: lương về theo THÁNG vào một ngày cố định, nên phần lớn các tuần KHÔNG có thu nhập — đó là điều bình thường, TUYỆT ĐỐI không gọi là "bội chi" hay đánh giá tiêu cực vì thiếu thu nhập. Đánh giá: tổng chi tuần này và so với tuần trước, ngày chi nhiều nhất, danh mục chiếm phần lớn, biến động tài sản ròng.',
    month:   'Kỳ phân tích là 1 THÁNG. Đánh giá: tỷ lệ tiết kiệm, các danh mục vượt ngân sách, danh mục chiếm tỷ trọng lớn, thay đổi so với tháng trước.',
    quarter: 'Kỳ phân tích là 1 QUÝ (3 tháng). Đánh giá: bức tranh 3 tháng, tháng nào chi nhiều nhất, danh mục tốn kém nhất quý, tỷ lệ tiết kiệm, một mục tiêu cụ thể cho quý tới.',
    year:    'Kỳ phân tích là 1 NĂM. Đánh giá: sức khỏe tài chính cả năm, tỷ lệ tiết kiệm năm, danh mục chiếm tỷ trọng lớn nhất, một mục tiêu cụ thể cho năm sau.',
  }

  // --- Optional deep-analysis sections (sent by the Reports screen) ---

  // Previous-period comparison, with all percentages pre-computed
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
    'Bạn nhận được BÁO CÁO TÀI CHÍNH CÁ NHÂN gồm 2 phần: (1) thu chi trong kỳ (dòng tiền), (2) tài sản & nợ hiện tại (bảng cân đối). Lời khuyên phải kết nối cả hai — ví dụ: chi tiêu trong kỳ đang ảnh hưởng thế nào đến quỹ dự phòng, tiền dư nên ưu tiên vào đâu.',
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
    periodType === 'week'
      ? `Chênh lệch thu − chi trong tuần: ${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}đ (lương về theo tháng vào ngày cố định — tuần không có lương là BÌNH THƯỜNG, không phải bội chi)`
      : net >= 0
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
    assetSection,
    cutSuggestions ? `\nGợi ý cắt giảm đã tính sẵn (dùng nguyên con số này nếu viết tip cắt giảm):\n${cutSuggestions}` : '',
    '',
    '=== OUTPUT JSON ===',
    '{',
    periodType === 'week'
      ? '  "summary": "1-2 câu tóm tắt: tổng chi tuần này, so với tuần trước (nếu có dữ liệu), danh mục chiếm nhiều nhất. KHÔNG nói về bội chi hay tỷ lệ tiết kiệm tuần.",'
      : '  "summary": "1-2 câu tóm tắt: tình hình kỳ này, tỷ lệ tiết kiệm, danh mục chiếm nhiều nhất",',
    `  "topSpend": "dựa đúng dòng đầu danh sách danh mục — ví dụ: ${topCat ? `${topCat.name} chiếm ${topCatPct}% chi tiêu (${fmt(topCat.amount)}đ)` : 'Ăn uống chiếm 45% chi tiêu (2.250.000đ)'}",`,
    '  "assets": "1-2 câu đánh giá sức khỏe tài sản hiện tại: tài sản ròng, quỹ dự phòng đủ mấy tháng, nợ (nếu có) — dùng đúng số trong mục TÀI SẢN & DÒNG TIỀN",',
    '  "insights": [',
    '    { "emoji": "<emoji khớp nội dung>", "text": "<nhận xét>", "type": "warning|tip|good" }',
    '  ],',
    `  "score": ${suggestedScore}`,
    '}',
    '',
    '=== QUY TẮC ===',
    '1. 4-6 insights, mỗi insight nói MỘT ý riêng, không trùng ý nhau, không lặp lại summary.',
    periodType === 'week'
      ? '2. "warning" CHỈ khi có vấn đề thật trong dữ liệu: vượt ngân sách, chi tăng mạnh (≥30%) so với tuần trước, một danh mục chiếm trên 40% tổng chi, quỹ dự phòng dưới 1 tháng, nợ thẻ trên 80% hạn mức, nợ quá hạn, hoặc tài sản ròng âm. TUYỆT ĐỐI không cảnh báo vì tuần không có thu nhập. Tài chính lành mạnh thì KHÔNG bịa cảnh báo — dùng "good".'
      : '2. "warning" CHỈ khi có vấn đề thật trong dữ liệu: vượt ngân sách, bội chi, tỷ lệ tiết kiệm dưới 10%, một danh mục chiếm trên 40% tổng chi, quỹ dự phòng dưới 1 tháng, nợ thẻ trên 80% hạn mức, nợ quá hạn, hoặc tài sản ròng âm. Tài chính lành mạnh thì KHÔNG bịa cảnh báo — dùng "good" để ghi nhận điểm tốt.',
    '3. Mỗi danh mục vượt ngân sách phải có 1 warning nêu rõ số tiền vượt.',
    '4. Có ít nhất 1 "tip" hành động được. Nếu là tip cắt giảm, dùng nguyên con số từ phần "Gợi ý cắt giảm đã tính sẵn".',
    comparisonSection ? '4b. Có ít nhất 1 insight về thay đổi đáng chú ý nhất so với kỳ trước, dùng đúng % đã tính sẵn trong mục SO SÁNH.' : '',
    '4c. Có ít nhất 1 insight kết nối dòng tiền kỳ này với tài sản hiện tại và hướng tới TƯƠNG LAI, theo "Thứ tự ưu tiên dòng tiền dư": tiền tiết kiệm được kỳ này nên đi đâu trước (trả nợ quá hạn/nợ thẻ → đắp quỹ dự phòng đủ 3 tháng → góp mục tiêu tiết kiệm). Nếu bội chi, chỉ rõ khoản thiếu hụt đang bào mòn tiền khả dụng/quỹ dự phòng.',
    '4d. Nếu quỹ dự phòng dưới 3 tháng: nêu rõ hiện đủ bao nhiêu tháng (số đã tính sẵn) và mức an toàn là 3-6 tháng. Nếu đã đạt 3-6 tháng trở lên: ghi nhận bằng 1 insight "good".',
    '5. Emoji khớp nội dung, không dùng một emoji 2 lần.',
    `6. "score" phải là đúng số ${suggestedScore} — đã được tính sẵn từ tỷ lệ tiết kiệm, ngân sách, quỹ dự phòng, nợ thẻ và tài sản ròng. Không tự tính lại.`,
    '7. Nếu chưa có giao dịch chi tiêu trong kỳ: summary khuyến khích bắt đầu ghi chép, 2 tip để bắt đầu, và vẫn đánh giá phần tài sản hiện tại trong "assets".',
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
