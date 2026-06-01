import type { PricingTier, ClassType } from '../types/database';

interface CalculateResult {
  unitPrice: number;
  salary: number;
  tierName: string;
  tierId: string | null;
}

/**
 * 根据公式（如 "1v1+1v4"）从定价阶梯中计算组合单价
 * 公式格式: "1v1+1v4" → 两个班型的单价之和
 */
export function calculateFormulaPrice(
  formula: string,
  studentGrade: string,
  tiers: PricingTier[],
  totalMonthHours: number,
): { unitPrice: number; tierName: string } {
  const parts = formula.split('+').map(p => p.trim()) as ClassType[];
  const sortedTiers = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  const matchedTier = sortedTiers.find(
    (t) => totalMonthHours >= t.min_hours && totalMonthHours <= t.max_hours,
  ) || sortedTiers[0];

  if (!matchedTier) throw new Error('未配置定价阶梯');

  let unitPrice = 0;
  for (const ct of parts) {
    const rate = matchedTier.rates?.find(r => r.grade === studentGrade && r.class_type === ct);
    if (rate) unitPrice += rate.price_per_hour;
  }

  return { unitPrice, tierName: matchedTier.name };
}

/**
 * 核心计算函数：根据总课时和定价阶梯，计算单节课的工资
 */
export function calculateRecordSalary(
  studentGrade: string,
  classType: ClassType,
  hours: number,
  totalMonthHours: number,
  tiers: PricingTier[],
  isCustom: boolean = false,
  customPrice?: number | null,
  customFormula?: string | null,
): CalculateResult {
  // 公式计算（如 "1v1+1v4"）
  if (isCustom && customFormula) {
    const { unitPrice, tierName } = calculateFormulaPrice(customFormula, studentGrade, tiers, totalMonthHours);
    return { unitPrice, salary: hours * unitPrice, tierName, tierId: null };
  }

  // 固定单价
  if (isCustom && customPrice != null && customPrice > 0) {
    return {
      unitPrice: customPrice,
      salary: hours * customPrice,
      tierName: '自定义',
      tierId: null,
    };
  }

  // 按 sort_order 排序，找到总课时所在的阶梯
  const sortedTiers = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  const matchedTier = sortedTiers.find(
    (t) => totalMonthHours >= t.min_hours && totalMonthHours <= t.max_hours,
  );

  if (!matchedTier) {
    // 如果没找到匹配的阶梯（数据不完整），用第一个阶梯兜底
    const fallback = sortedTiers[0];
    if (!fallback) {
      throw new Error('未配置定价阶梯，请先在定价设置中添加阶梯');
    }
    const rate = fallback.rates?.find(
      (r) => r.grade === studentGrade && r.class_type === classType,
    );
    if (!rate) {
      throw new Error(`未找到 ${studentGrade} ${classType} 在阶梯「${fallback.name}」中的单价`);
    }
    return {
      unitPrice: rate.price_per_hour,
      salary: hours * rate.price_per_hour,
      tierName: fallback.name,
      tierId: fallback.id,
    };
  }

  const rate = matchedTier.rates?.find(
    (r) => r.grade === studentGrade && r.class_type === classType,
  );

  if (!rate) {
    throw new Error(
      `未找到「${studentGrade}」年级「${classType}」在阶梯「${matchedTier.name}」中的单价，请补充定价设置`,
    );
  }

  return {
    unitPrice: rate.price_per_hour,
    salary: hours * rate.price_per_hour,
    tierName: matchedTier.name,
    tierId: matchedTier.id,
  };
}

/**
 * 获取某个月的总课时（含待处理的记录）
 */
export function getTotalMonthHours(
  records: { class_date: string; hours: number }[],
  targetMonth: Date,
): number {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  return records
    .filter((r) => {
      const d = new Date(r.class_date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, r) => sum + r.hours, 0);
}

/**
 * 批量重算指定月份的所有记录
 */
export function recalculateMonthRecords(
  records: { id: string; class_date: string; studentGrade: string; class_type: ClassType; hours: number; is_custom: boolean; custom_price: number | null }[],
  year: number,
  month: number,
  tiers: PricingTier[],
): Map<string, { unitPrice: number; salary: number; tierName: string }> {
  // 计算当月总课时
  const totalHours = records
    .filter((r) => {
      const d = new Date(r.class_date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, r) => sum + r.hours, 0);

  const results = new Map<string, { unitPrice: number; salary: number; tierName: string }>();

  for (const record of records) {
    const d = new Date(record.class_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const calc = calculateRecordSalary(
        record.studentGrade,
        record.class_type,
        record.hours,
        totalHours,
        tiers,
        record.is_custom,
        record.custom_price,
      );
      results.set(record.id, {
        unitPrice: calc.unitPrice,
        salary: calc.salary,
        tierName: calc.tierName,
      });
    }
  }

  return results;
}
