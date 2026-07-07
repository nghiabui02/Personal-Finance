-- =============================================================================
-- Reset test data for the test account (test@gmail.com)
--
-- Xoá toàn bộ data của user test và seed lại bộ dữ liệu mẫu.
-- KHÔNG động vào auth (tài khoản, email, password giữ nguyên).
--
-- Ngày tháng là TƯƠNG ĐỐI theo ngày chạy script (timezone Asia/Ho_Chi_Minh):
-- luôn tạo ra dữ liệu cho "tháng này" + 2 tháng liền trước, nên chạy lại
-- bất kỳ lúc nào dashboard cũng có data.
--
-- Cách chạy: paste vào Supabase Dashboard → SQL Editor → Run
-- =============================================================================

DO $$
DECLARE
  v_uid uuid;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_m0 date := date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date; -- mùng 1 tháng này
  v_m1 date := v_m0 - interval '1 month';  -- mùng 1 tháng trước
  v_m2 date := v_m0 - interval '2 months'; -- mùng 1 của 2 tháng trước
  w_cash uuid; w_bank uuid; w_momo uuid; w_credit uuid;
  c_luong uuid; c_thuong uuid; c_dautu uuid; c_khac uuid;
  c_anuong uuid; c_dichuyen uuid; c_muasam uuid; c_hoadon uuid;
  c_giaitri uuid; c_suckhoe uuid; c_giaoduc uuid; c_nhacua uuid;
  c_chovay uuid; c_divay uuid; c_thuno uuid; c_trano uuid;
  d_minh uuid; d_lan uuid; d_hung uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'test@gmail.com';
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy user test@gmail.com — tạo tài khoản trước rồi chạy lại.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 1. Xoá sạch data cũ (theo thứ tự FK)
  -- ---------------------------------------------------------------------------
  DELETE FROM transactions WHERE user_id = v_uid;
  DELETE FROM debt_payments WHERE debt_id IN (SELECT id FROM debts WHERE user_id = v_uid);
  DELETE FROM debts WHERE user_id = v_uid;
  DELETE FROM budgets WHERE user_id = v_uid;
  DELETE FROM recurring_transactions WHERE user_id = v_uid;
  DELETE FROM saving_goals WHERE user_id = v_uid;
  DELETE FROM net_worth_snapshots WHERE user_id = v_uid;
  DELETE FROM ai_insights_cache WHERE user_id = v_uid;
  DELETE FROM categories WHERE user_id = v_uid;
  DELETE FROM wallets WHERE user_id = v_uid;

  -- ---------------------------------------------------------------------------
  -- 2. Ví
  -- ---------------------------------------------------------------------------
  INSERT INTO wallets (user_id, name, type, balance, icon, color, is_default)
    VALUES (v_uid, 'Tiền mặt', 'cash', 2450000, '💵', '#10b981', true) RETURNING id INTO w_cash;
  INSERT INTO wallets (user_id, name, type, balance, icon, color)
    VALUES (v_uid, 'Vietcombank', 'bank', 38650000, '🏦', '#3b82f6') RETURNING id INTO w_bank;
  INSERT INTO wallets (user_id, name, type, balance, icon, color)
    VALUES (v_uid, 'MoMo', 'e_wallet', 1250000, '📱', '#d946ef') RETURNING id INTO w_momo;
  INSERT INTO wallets (user_id, name, type, balance, icon, color, credit_limit, statement_day, payment_due_day)
    VALUES (v_uid, 'VPBank Credit', 'credit', 25300000, '💳', '#8b5cf6', 30000000, 25, 10) RETURNING id INTO w_credit;

  -- ---------------------------------------------------------------------------
  -- 3. Danh mục
  -- ---------------------------------------------------------------------------
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Lương', 'income', '💰', '#10b981') RETURNING id INTO c_luong;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Thưởng', 'income', '🎁', '#f59e0b') RETURNING id INTO c_thuong;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Đầu tư', 'income', '📈', '#3b82f6') RETURNING id INTO c_dautu;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Thu nhập khác', 'income', '💸', '#64748b') RETURNING id INTO c_khac;

  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Ăn uống', 'expense', '🍜', '#ef4444') RETURNING id INTO c_anuong;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Di chuyển', 'expense', '🚕', '#f97316') RETURNING id INTO c_dichuyen;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Mua sắm', 'expense', '🛍️', '#ec4899') RETURNING id INTO c_muasam;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Hóa đơn & Tiện ích', 'expense', '🧾', '#0ea5e9') RETURNING id INTO c_hoadon;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Giải trí', 'expense', '🎬', '#8b5cf6') RETURNING id INTO c_giaitri;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Sức khỏe', 'expense', '💊', '#14b8a6') RETURNING id INTO c_suckhoe;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Giáo dục', 'expense', '📚', '#6366f1') RETURNING id INTO c_giaoduc;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Nhà cửa', 'expense', '🏠', '#a16207') RETURNING id INTO c_nhacua;

  -- Danh mục nợ — đúng tên/icon app tự tạo trong lib/server/debt-categories.ts
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Cho vay', 'expense', '💸', '#6366f1') RETURNING id INTO c_chovay;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Đi vay', 'income', '🤝', '#f97316') RETURNING id INTO c_divay;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Thu nợ', 'income', '💰', '#10b981') RETURNING id INTO c_thuno;
  INSERT INTO categories (user_id, name, type, icon, color) VALUES (v_uid, 'Trả nợ', 'expense', '🏦', '#ef4444') RETURNING id INTO c_trano;

  -- ---------------------------------------------------------------------------
  -- 4. Giao dịch — tháng hiện tại (chỉ tới mùng 7 như một tháng đang dở dang)
  -- ---------------------------------------------------------------------------
  INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, note, transaction_date) VALUES
    (v_uid, w_bank,   c_luong,    'income',  25000000, 'Lương tháng này',    v_m0 + 4),
    (v_uid, w_bank,   c_nhacua,   'expense',  6000000, 'Tiền nhà',           v_m0),
    (v_uid, w_momo,   c_hoadon,   'expense',   350000, 'Tiền điện',          v_m0),
    (v_uid, w_cash,   c_anuong,   'expense',    85000, 'Bún bò sáng',        v_m0 + 1),
    (v_uid, w_momo,   c_dichuyen, 'expense',   120000, 'Grab đi làm',        v_m0 + 1),
    (v_uid, w_credit, c_anuong,   'expense',   450000, 'Ăn tối cùng team',   v_m0 + 2),
    (v_uid, w_credit, c_muasam,   'expense',  1290000, 'Áo khoác Uniqlo',    v_m0 + 3),
    (v_uid, w_credit, c_giaitri,  'expense',   260000, 'Netflix',            v_m0 + 4),
    (v_uid, w_cash,   c_anuong,   'expense',    65000, 'Cà phê',             v_m0 + 4),
    (v_uid, w_cash,   c_suckhoe,  'expense',   320000, 'Thuốc + vitamin',    v_m0 + 5),
    (v_uid, w_momo,   c_anuong,   'expense',   210000, 'Lẩu tối',            v_m0 + 5),
    (v_uid, w_momo,   c_dichuyen, 'expense',    55000, 'Grab',               v_m0 + 6),
    (v_uid, w_cash,   c_anuong,   'expense',    45000, 'Cà phê sáng',        v_m0 + 6);

  -- Tháng trước
  INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, note, transaction_date) VALUES
    (v_uid, w_bank,   c_luong,    'income',  25000000, 'Lương tháng trước',  v_m1 + 4),
    (v_uid, w_bank,   c_thuong,   'income',   3000000, 'Thưởng dự án',       v_m1 + 11),
    (v_uid, w_bank,   c_dautu,    'income',   1150000, 'Cổ tức VNM',         v_m1 + 27),
    (v_uid, w_cash,   c_thuno,    'income',   3000000, 'Minh trả nợ',        v_m1 + 19),
    (v_uid, w_bank,   c_nhacua,   'expense',  6000000, 'Tiền nhà',           v_m1),
    (v_uid, w_momo,   c_hoadon,   'expense',   380000, 'Tiền điện',          v_m1 + 1),
    (v_uid, w_momo,   c_hoadon,   'expense',   200000, 'Internet FPT',       v_m1 + 2),
    (v_uid, w_cash,   c_anuong,   'expense',    95000, 'Phở sáng',           v_m1 + 3),
    (v_uid, w_cash,   c_dichuyen, 'expense',   450000, 'Đổ xăng',            v_m1 + 5),
    (v_uid, w_credit, c_anuong,   'expense',   520000, 'Nhà hàng cuối tuần', v_m1 + 6),
    (v_uid, w_credit, c_muasam,   'expense',   750000, 'Giày thể thao',      v_m1 + 7),
    (v_uid, w_momo,   c_giaitri,  'expense',   240000, 'CGV xem phim',       v_m1 + 9),
    (v_uid, w_cash,   c_anuong,   'expense',   180000, 'Cơm trưa văn phòng', v_m1 + 10),
    (v_uid, w_bank,   c_suckhoe,  'expense',   850000, 'Khám tổng quát',     v_m1 + 13),
    (v_uid, w_credit, c_giaitri,  'expense',   260000, 'Netflix',            v_m1 + 14),
    (v_uid, w_momo,   c_anuong,   'expense',   320000, 'Ăn vặt + trà sữa',   v_m1 + 15),
    (v_uid, w_bank,   c_giaoduc,  'expense',  1200000, 'Khóa học tiếng Nhật',v_m1 + 17),
    (v_uid, w_momo,   c_muasam,   'expense',   430000, 'Đồ gia dụng',        v_m1 + 20),
    (v_uid, w_cash,   c_anuong,   'expense',   275000, 'Bữa tối gia đình',   v_m1 + 21),
    (v_uid, w_momo,   c_dichuyen, 'expense',    90000, 'Grab',               v_m1 + 23),
    (v_uid, w_cash,   c_anuong,   'expense',   480000, 'Liên hoan cùng bạn', v_m1 + 27),
    (v_uid, w_credit, c_muasam,   'expense',  2100000, 'Tai nghe Sony',      v_m1 + 27);

  -- 2 tháng trước
  INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, note, transaction_date) VALUES
    (v_uid, w_bank,   c_luong,    'income',  25000000, 'Lương',              v_m2 + 4),
    (v_uid, w_cash,   c_khac,     'income',    800000, 'Bán đồ cũ',          v_m2 + 19),
    (v_uid, w_bank,   c_divay,    'income',  10000000, 'Vay chị Lan',        v_m2 + 17),
    (v_uid, w_cash,   c_chovay,   'expense',  5000000, 'Cho Minh vay',       v_m2 + 14),
    (v_uid, w_bank,   c_nhacua,   'expense',  6000000, 'Tiền nhà',           v_m2),
    (v_uid, w_momo,   c_hoadon,   'expense',   410000, 'Tiền điện',          v_m2 + 1),
    (v_uid, w_cash,   c_anuong,   'expense',   220000, 'Ăn sáng cả tuần',    v_m2 + 2),
    (v_uid, w_cash,   c_dichuyen, 'expense',   400000, 'Đổ xăng',            v_m2 + 5),
    (v_uid, w_credit, c_muasam,   'expense',  1500000, 'Quà sinh nhật mẹ',   v_m2 + 7),
    (v_uid, w_momo,   c_anuong,   'expense',   350000, 'Buffet cùng bạn',    v_m2 + 9),
    (v_uid, w_momo,   c_giaitri,  'expense',   220000, 'CGV xem phim',       v_m2 + 11),
    (v_uid, w_bank,   c_giaoduc,  'expense',   350000, 'Mua sách',           v_m2 + 14),
    (v_uid, w_cash,   c_suckhoe,  'expense',   180000, 'Thuốc cảm',          v_m2 + 21),
    (v_uid, w_cash,   c_anuong,   'expense',   300000, 'Ăn tối cuối tuần',   v_m2 + 24),
    (v_uid, w_momo,   c_hoadon,   'expense',   200000, 'Internet FPT',       v_m2 + 27);

  -- ---------------------------------------------------------------------------
  -- 5. Ngân sách — tháng này + tháng trước
  -- ---------------------------------------------------------------------------
  INSERT INTO budgets (user_id, category_id, amount, month) VALUES
    (v_uid, c_anuong,   5000000, v_m0),
    (v_uid, c_dichuyen, 1500000, v_m0),
    (v_uid, c_muasam,   3000000, v_m0),
    (v_uid, c_giaitri,  1200000, v_m0),
    (v_uid, c_hoadon,   2500000, v_m0),
    (v_uid, c_anuong,   5000000, v_m1),
    (v_uid, c_dichuyen, 1500000, v_m1),
    (v_uid, c_muasam,   3000000, v_m1),
    (v_uid, c_giaitri,  1200000, v_m1),
    (v_uid, c_hoadon,   2500000, v_m1);

  -- ---------------------------------------------------------------------------
  -- 6. Mục tiêu tiết kiệm
  -- ---------------------------------------------------------------------------
  INSERT INTO saving_goals (user_id, name, icon, target_amount, current_amount, deadline, status, note) VALUES
    (v_uid, 'Du lịch Nhật Bản', '🗾', 50000000, 18500000, (v_m0 + interval '6 months')::date - 1, 'active', 'Đi Tokyo mùa thu'),
    (v_uid, 'Quỹ dự phòng', '🛟', 100000000, 45000000, NULL, 'active', '6 tháng chi tiêu'),
    (v_uid, 'MacBook Pro', '💻', 45000000, 45000000, v_m1, 'completed', NULL);

  -- ---------------------------------------------------------------------------
  -- 7. Vay nợ + lịch sử trả
  -- ---------------------------------------------------------------------------
  INSERT INTO debts (user_id, wallet_id, type, person_name, person_contact, amount, remaining_amount, due_date, status, note, created_at)
    VALUES (v_uid, w_cash, 'lend', 'Minh', '0901234567', 5000000, 2000000, (v_m0 + interval '1 month')::date + 30, 'active', 'Bạn đại học', v_m2 + 14)
    RETURNING id INTO d_minh;
  INSERT INTO debts (user_id, wallet_id, type, person_name, person_contact, amount, remaining_amount, due_date, status, note, created_at)
    VALUES (v_uid, w_bank, 'borrow', 'Chị Lan', NULL, 10000000, 10000000, (v_m0 + interval '2 months')::date + 29, 'active', 'Vay sửa xe', v_m2 + 17)
    RETURNING id INTO d_lan;
  INSERT INTO debts (user_id, wallet_id, type, person_name, person_contact, amount, remaining_amount, due_date, status, note, created_at)
    VALUES (v_uid, w_cash, 'lend', 'Hùng', NULL, 2000000, 0, v_m2, 'completed', NULL, (v_m2 - interval '1 month')::date + 9)
    RETURNING id INTO d_hung;

  INSERT INTO debt_payments (debt_id, amount, note, paid_at, type) VALUES
    (d_minh, 3000000, 'Trả lần 1', (v_m1 + 19)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh', 'payment'),
    (d_hung, 2000000, 'Trả đủ',    (v_m2 + 1)::timestamp  AT TIME ZONE 'Asia/Ho_Chi_Minh', 'payment');

  -- ---------------------------------------------------------------------------
  -- 8. Giao dịch định kỳ — next_run ở tháng sau để không tự sinh trùng data đã seed
  -- ---------------------------------------------------------------------------
  INSERT INTO recurring_transactions (user_id, wallet_id, category_id, type, amount, note, frequency, start_date, next_run_date) VALUES
    (v_uid, w_bank,   c_nhacua,  'expense',  6000000, 'Tiền nhà', 'monthly', (v_m2 - interval '4 months')::date,      (v_m0 + interval '1 month')::date),
    (v_uid, w_credit, c_giaitri, 'expense',   260000, 'Netflix',  'monthly', (v_m2 - interval '4 months')::date + 14, (v_m0 + interval '1 month')::date + 14),
    (v_uid, w_bank,   c_luong,   'income',  25000000, 'Lương',    'monthly', (v_m2 - interval '4 months')::date + 4,  (v_m0 + interval '1 month')::date + 4);

  -- ---------------------------------------------------------------------------
  -- 9. Lịch sử net worth cho biểu đồ Reports (9 điểm, mỗi tuần 1 điểm)
  -- ---------------------------------------------------------------------------
  INSERT INTO net_worth_snapshots (user_id, net_worth, recorded_date) VALUES
    (v_uid, 21000000, v_today - 58),
    (v_uid, 22500000, v_today - 51),
    (v_uid, 24000000, v_today - 44),
    (v_uid, 23200000, v_today - 37),
    (v_uid, 26000000, v_today - 30),
    (v_uid, 25400000, v_today - 23),
    (v_uid, 27800000, v_today - 16),
    (v_uid, 28900000, v_today - 9),
    (v_uid, 29400000, v_today - 2);

  RAISE NOTICE 'Đã reset data cho user % (%)', 'test@gmail.com', v_uid;
END $$;
