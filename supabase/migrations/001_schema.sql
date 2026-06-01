-- 教师工资计算器 - 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本

-- ============================================
-- 1. 学生表
-- ============================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. 课程记录表
-- ============================================
CREATE TABLE IF NOT EXISTS public.class_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  class_type TEXT NOT NULL CHECK (class_type IN ('1v1', '1v2', '1v3', '1v6')),
  hours NUMERIC(4,1) NOT NULL CHECK (hours > 0),
  unit_price NUMERIC(8,2),
  salary NUMERIC(10,2),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  custom_rule TEXT,
  custom_price NUMERIC(8,2),
  remarks TEXT,
  modification_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ocr')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. 定价阶梯表
-- ============================================
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  min_hours NUMERIC(5,1) NOT NULL,
  max_hours NUMERIC(5,1) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. 定价详情表
-- ============================================
CREATE TABLE IF NOT EXISTS public.pricing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  class_type TEXT NOT NULL CHECK (class_type IN ('1v1', '1v2', '1v3', '1v6')),
  price_per_hour NUMERIC(8,2) NOT NULL CHECK (price_per_hour > 0),
  UNIQUE (tier_id, grade, class_type)
);

-- ============================================
-- 5. 应用设置表
-- ============================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  UNIQUE (user_id, key)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_class_records_user_date ON public.class_records(user_id, class_date);
CREATE INDEX IF NOT EXISTS idx_class_records_student ON public.class_records(student_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_user ON public.pricing_tiers(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rates_tier ON public.pricing_rates(tier_id);

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

-- students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own students"
  ON public.students FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- class_records
ALTER TABLE public.class_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own class records"
  ON public.class_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- pricing_tiers
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own pricing tiers"
  ON public.pricing_tiers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- pricing_rates
ALTER TABLE public.pricing_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own pricing rates"
  ON public.pricing_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.pricing_tiers
      WHERE pricing_tiers.id = pricing_rates.tier_id
      AND pricing_tiers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pricing_tiers
      WHERE pricing_tiers.id = pricing_rates.tier_id
      AND pricing_tiers.user_id = auth.uid()
    )
  );

-- app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own settings"
  ON public.app_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
