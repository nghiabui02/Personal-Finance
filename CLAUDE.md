@AGENTS.md

# Personal Finance App

Ứng dụng quản lý tài chính cá nhân, dùng cho một người duy nhất.

## Tech Stack

- **Frontend + Backend:** Next.js (App Router, Turbopack)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS
- **Package manager:** pnpm
- **Deploy:** Vercel (FE + BE) + Supabase (DB)

## Các tính năng đã thiết kế

### MVP (làm trước)
1. Đăng ký / đăng nhập
2. Thêm, sửa, xóa thu nhập
3. Thêm, sửa, xóa chi tiêu
4. Quản lý danh mục (category) thu/chi
5. Dashboard tổng quan
6. Lọc giao dịch theo tháng
7. Biểu đồ chi tiêu theo danh mục
8. Ngân sách theo danh mục

### Tính năng tiếp theo
- Quản lý ví / tài khoản (tiền mặt, ngân hàng, ví điện tử)
- Mục tiêu tiết kiệm
- Giao dịch định kỳ (lặp lại hàng tháng)
- Quản lý vay nợ (cho vay / đi vay, trả từng phần)
- Báo cáo tài chính (tuần/tháng/năm)
- Xuất dữ liệu (CSV, PDF)

## Database Schema

```sql
-- users: quản lý bởi Supabase Auth

-- wallets: ví / tài khoản
wallets (id, user_id, name, type, balance, color, icon, is_default)

-- categories: danh mục thu/chi
categories (id, user_id, name, icon, color, type [income|expense], parent_id, is_default)

-- transactions: giao dịch thu/chi
transactions (id, user_id, wallet_id, category_id, type, amount, note, transaction_date, payment_method, is_recurring, recurring_id)

-- budgets: ngân sách theo tháng
budgets (id, user_id, category_id, amount, month)

-- saving_goals: mục tiêu tiết kiệm
saving_goals (id, user_id, name, icon, target_amount, current_amount, deadline, status, note)

-- recurring_transactions: giao dịch định kỳ
recurring_transactions (id, user_id, wallet_id, category_id, type, amount, note, frequency, start_date, end_date, next_run_date)

-- debts: vay nợ
debts (id, user_id, wallet_id, type [lend|borrow], person_name, person_contact, amount, remaining_amount, due_date, status, note)

-- debt_payments: lịch sử trả nợ
debt_payments (id, debt_id, amount, note, paid_at)
```

## Cấu trúc thư mục

```
app/
├── (auth)/          ← login, register
├── (dashboard)/     ← các màn hình chính sau khi login
│   ├── dashboard/
│   ├── transactions/
│   ├── budgets/
│   ├── wallets/
│   ├── debts/
│   ├── reports/
│   └── settings/
└── api/             ← API routes (BE)
lib/
└── supabase/
    ├── client.ts    ← dùng ở browser (React components)
    └── server.ts    ← dùng ở Server Components, API routes
```

## Trạng thái hiện tại

- [x] Khởi tạo Next.js project
- [x] Cài đặt Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- [x] Tạo Supabase client (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- [x] Cấu hình `.env.local`
- [ ] Tạo database schema trên Supabase
- [ ] Setup Auth (đăng ký / đăng nhập)
- [ ] Dashboard
- [ ] Quản lý giao dịch

## Supabase

- Region: Singapore
