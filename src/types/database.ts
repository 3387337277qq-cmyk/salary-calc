// 数据库类型定义

export interface Student {
  id: string;
  user_id: string;
  name: string;
  grade: string;
  subject: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 1v1 到 1v20
export type ClassType = '1v1' | '1v2' | '1v3' | '1v4' | '1v5' | '1v6' | '1v7' | '1v8' | '1v9' | '1v10' | '1v11' | '1v12' | '1v13' | '1v14' | '1v15' | '1v16' | '1v17' | '1v18' | '1v19' | '1v20';

export const CLASS_TYPES: ClassType[] = [
  '1v1', '1v2', '1v3', '1v4', '1v5', '1v6', '1v7', '1v8', '1v9', '1v10',
  '1v11', '1v12', '1v13', '1v14', '1v15', '1v16', '1v17', '1v18', '1v19', '1v20',
];

export interface ModificationEntry {
  changed_at: string;
  changed_fields: string[];
  previous_values: Record<string, unknown>;
  remarks: string;
}

export interface ClassRecord {
  id: string;
  user_id: string;
  student_id: string;
  class_date: string;
  class_type: ClassType;
  hours: number;
  unit_price: number | null;
  salary: number | null;
  is_custom: boolean;
  custom_rule: string | null;
  custom_price: number | null;
  remarks: string | null;
  modification_history: ModificationEntry[];
  source: 'manual' | 'ocr';
  created_at: string;
  updated_at: string;
  student?: Student;
}

export interface PricingTier {
  id: string;
  user_id: string;
  name: string;
  min_hours: number;
  max_hours: number;
  sort_order: number;
  created_at: string;
  rates?: PricingRate[];
}

export interface PricingRate {
  id: string;
  tier_id: string;
  grade: string;
  class_type: ClassType;
  price_per_hour: number;
}

export interface ClassRecordInput {
  student_id: string;
  class_date: string;
  class_type: ClassType;
  hours: number;
  is_custom: boolean;
  custom_rule?: string;
  custom_price?: number;
  remarks?: string;
}

export interface StudentInput {
  name: string;
  grade: string;
  subject?: string;
  notes?: string;
}

export interface MonthlySummary {
  totalHours: number;
  totalSalary: number;
  tierName: string;
  recordCount: number;
  breakdownByType: { classType: ClassType; hours: number; salary: number; count: number }[];
  breakdownByStudent: { studentId: string; studentName: string; grade: string; hours: number; salary: number; count: number }[];
}

export interface OcrResult {
  studentName: string;
  date: string;
  classType: ClassType;
  hours: number;
  confidence: 'high' | 'medium' | 'low';
  matchedStudentId?: string;
}
