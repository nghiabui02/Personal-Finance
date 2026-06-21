import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Groq not configured' }, { status: 500 })

  const { periodLabel, period, totalIncome, totalExpense, categories, budgets, force } = await req.json()
  const periodType: 'week' | 'month' | 'quarter' | 'year' = period ?? 'month'

  // Check DB cache (skip if force-refresh)
  const cacheKey = `${periodType}::${periodLabel}::${totalIncome}::${totalExpense}`
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

  const periodContext: Record<typeof periodType, string> = {
    week:    'Đây là phân tích TUẦN. Tập trung vào: ngày nào chi nhiều nhất, thói quen chi tiêu trong tuần, so sánh với mức chi hợp lý trong 7 ngày.',
    month:   'Đây là phân tích THÁNG. Tập trung vào: danh mục vượt ngân sách, tỷ lệ tiết kiệm tháng, xu hướng chi tiêu.',
    quarter: 'Đây là phân tích QUÝ (3 tháng). Tập trung vào: tổng kết 3 tháng, danh mục tốn kém nhất trong quý, tỷ lệ tiết kiệm trung bình, mục tiêu cho quý tới.',
    year:    'Đây là phân tích NĂM. Tập trung vào: tổng kết tài chính cả năm, tỷ lệ tiết kiệm, danh mục chiếm tỷ trọng lớn nhất, đánh giá sức khỏe tài chính tổng thể và mục tiêu năm sau.',
  }

  const prompt = [
    'Bạn là cố vấn tài chính cá nhân thông minh. Phân tích dữ liệu và đưa ra nhận xét THỰC TẾ, CỤ THỂ bằng tiếng Việt.',
    periodContext[periodType],
    '',
    `=== DỮ LIỆU KỲ: ${periodLabel} ===`,
    `Thu nhập: ${fmt(totalIncome)}đ`,
    `Chi tiêu: ${fmt(totalExpense)}đ`,
    `Tiết kiệm: ${fmt(net)}đ (${savingsRate}% thu nhập)`,
    overBudget.length ? `Vượt ngân sách: ${overBudget.map(b => b.name).join(', ')}` : '',
    '',
    'Chi tiêu theo danh mục:',
    catList || '  (chưa có dữ liệu)',
    budgetSection,
    '',
    '=== YÊU CẦU OUTPUT ===',
    'Trả về JSON (không markdown):',
    '{',
    '  "summary": "1-2 câu tóm tắt tình hình, đề cập tỷ lệ tiết kiệm và danh mục chiếm nhiều nhất",',
    '  "topSpend": "danh mục tốn nhiều nhất: tên, số tiền, % tổng chi — ví dụ: Ăn uống chiếm 45% chi tiêu (2.250.000đ)",',
    '  "insights": [',
    '    { "emoji": "<emoji phù hợp>", "text": "<nội dung>", "type": "warning|tip|good" }',
    '  ],',
    '  "score": <số 0-100>',
    '}',
    '',
    '=== QUY TẮC ===',
    '1. Mỗi insight BẮT BUỘC đề cập tên danh mục cụ thể hoặc con số thực từ dữ liệu',
    '2. Cần có ít nhất 1 insight loại "warning" (cảnh báo chi tiêu bất thường)',
    '3. Cần có ít nhất 1 insight loại "tip" với gợi ý cắt giảm: "Giảm X% [danh mục] → tiết kiệm ~Yđ/tháng"',
    '4. Nếu có danh mục vượt ngân sách → bắt buộc có warning về danh mục đó',
    '5. 4-5 insights tổng, chọn emoji phù hợp nội dung (không dùng cùng emoji 2 lần)',
    '6. Score: tiết kiệm ≥30% = 85-100 | 20-29% = 70-84 | 10-19% = 55-69 | 0-9% = 40-54 | bội chi = 0-39',
    '7. Không dùng "VND", chỉ dùng số và "đ"',
    '8. Nếu không có dữ liệu: score=50, khuyến khích bắt đầu ghi chép',
  ].filter(Boolean).join('\n')

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
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
        return NextResponse.json({ error: 'rate_limit' }, { status: 429 })
      }
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
}
