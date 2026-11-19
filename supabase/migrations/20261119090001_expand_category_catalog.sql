-- Add 22 bilingual templates after deploying the matching catalog manifest.
-- Existing templates and personal categories are preserved; users opt in.
insert into public.categories (default_key, collection, type, name_vi, name_en, icon, color, search_aliases) values
  ('snacks', 'food_drink', 'expense', 'Ăn vặt', 'Snacks', '🍿', '#ef4444', array['an vat', 'snack', 'bim bim', 'banh keo']),
  ('vehicle_inspection', 'transport', 'expense', 'Đăng kiểm', 'Vehicle inspection', '🔧', '#f97316', array['dang kiem', 'kiem dinh xe', 'inspection']),
  ('vehicle_registration', 'transport', 'expense', 'Phí đăng ký xe', 'Vehicle registration fees', '📋', '#f97316', array['dang ky xe', 'bien so', 'truoc ba', 'registration']),
  ('vehicle_rental', 'transport', 'expense', 'Thuê xe', 'Vehicle rental', '🚙', '#f97316', array['thue xe', 'car rental', 'motorbike rental']),
  ('building_management', 'home', 'expense', 'Phí quản lý chung cư', 'Building management fees', '🏢', '#06b6d4', array['phi dich vu', 'chung cu', 'apartment fees']),
  ('cooking_gas', 'home', 'expense', 'Gas nấu ăn', 'Cooking gas', '🔥', '#06b6d4', array['gas nau an', 'binh gas', 'khi dot', 'lpg']),
  ('house_cleaning', 'home', 'expense', 'Dịch vụ dọn nhà', 'House cleaning', '🧹', '#06b6d4', array['don nha', 'giup viec', 've sinh nha', 'cleaner']),
  ('vaccinations', 'health', 'expense', 'Tiêm chủng', 'Vaccinations', '💉', '#14b8a6', array['tiem phong', 'vac xin', 'vaccine', 'immunization']),
  ('physiotherapy', 'health', 'expense', 'Vật lý trị liệu', 'Physiotherapy', '🩼', '#14b8a6', array['vat ly tri lieu', 'phuc hoi chuc nang', 'physical therapy', 'rehabilitation']),
  ('mental_health', 'health', 'expense', 'Tư vấn tâm lý', 'Mental health counseling', '🧠', '#14b8a6', array['tam ly', 'tham van', 'tri lieu tam ly', 'counseling', 'therapy']),
  ('attraction_tickets', 'travel', 'expense', 'Vé tham quan', 'Attraction tickets', '🎟️', '#0ea5e9', array['ve tham quan', 'bao tang', 'cong vien', 'sightseeing', 'museum']),
  ('checked_baggage', 'travel', 'expense', 'Hành lý ký gửi', 'Checked baggage', '🧳', '#0ea5e9', array['hanh ly ky gui', 'mua them hanh ly', 'baggage', 'luggage']),
  ('diapers_formula', 'family_pets', 'expense', 'Tã và sữa', 'Diapers and formula', '🍼', '#f59e0b', array['ta sua', 'bim sua', 'diaper', 'baby formula']),
  ('children_supplies', 'family_pets', 'expense', 'Đồ dùng trẻ em', 'Children''s supplies', '🧸', '#f59e0b', array['do choi', 'do dung tre em', 'baby supplies', 'kids']),
  ('extracurricular', 'family_pets', 'expense', 'Học ngoại khóa', 'Extracurricular activities', '🎨', '#f59e0b', array['ngoai khoa', 'hoc them', 'lop nang khieu', 'after school']),
  ('pet_grooming', 'family_pets', 'expense', 'Vệ sinh và chăm sóc thú cưng', 'Pet grooming', '🛁', '#f59e0b', array['tam cho', 'tam meo', 'cat tia long', 'pet spa', 'grooming']),
  ('pet_accessories', 'family_pets', 'expense', 'Phụ kiện thú cưng', 'Pet accessories', '🐕', '#f59e0b', array['phu kien thu cung', 'vong co', 'chuong', 'pet toys']),
  ('life_insurance', 'fees', 'expense', 'Bảo hiểm nhân thọ', 'Life insurance', '🛡️', '#64748b', array['bao hiem nhan tho', 'phi bao hiem nhan tho', 'life insurance premium']),
  ('loan_interest', 'fees', 'expense', 'Lãi vay', 'Loan interest', '🏦', '#64748b', array['lai vay', 'tien lai vay', 'lai the tin dung', 'loan interest', 'credit card interest']),
  ('commissions', 'income', 'income', 'Hoa hồng', 'Commissions', '🤝', '#22c55e', array['hoa hong', 'moi gioi', 'sales commission', 'referral commission']),
  ('allowances', 'income', 'income', 'Phụ cấp', 'Allowances', '💼', '#22c55e', array['phu cap', 'tro cap cong viec', 'work allowance']),
  ('overtime_pay', 'income', 'income', 'Tiền làm thêm giờ', 'Overtime pay', '⏰', '#22c55e', array['tang ca', 'lam them gio', 'overtime', 'ot pay'])
on conflict (default_key) do nothing;

do $$
begin
  if (select count(*) from public.categories where default_key in (
    'snacks', 'vehicle_inspection', 'vehicle_registration', 'vehicle_rental', 'building_management', 'cooking_gas', 'house_cleaning', 'vaccinations', 'physiotherapy', 'mental_health', 'attraction_tickets', 'checked_baggage', 'diapers_formula', 'children_supplies', 'extracurricular', 'pet_grooming', 'pet_accessories', 'life_insurance', 'loan_interest', 'commissions', 'allowances', 'overtime_pay'
  )) <> 22 then
    raise exception 'Catalog expansion did not provide all 22 required templates.';
  end if;
end;
$$;
