const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xunzyblieclzajqrpaxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bnp5YmxpZWNsemFqcXJwYXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTAxOSwiZXhwIjoyMDk1ODg3MDE5fQ.2A-5CSBhjuGQwIjvVfWo6RhNGGuKJhL7TjfjOxaLleo'
);

const allStudents = [
  { name: '南恩硕', grade: '高三' },
  { name: '刘文硕', grade: '高三' },
  { name: '秋辰', grade: '高三' },
  { name: '皓燃', grade: '高三' },
  { name: '乔梓', grade: '高三' },
  { name: '林雅歌', grade: '高二' },
  { name: '张淏翔', grade: '高三' },
  { name: '李良浩煜', grade: '高三' },
  { name: '林嘉祥', grade: '高三' },
  { name: '胡静涵', grade: '高三' },
  { name: '彭妍可', grade: '高二' },
  { name: '阚上涵', grade: '高三' },
  { name: '余姿靓', grade: '高二' },
  { name: '吴思睿', grade: '高三' },
  { name: '杨喻琦', grade: '高三' },
  { name: '胡一佳', grade: '高三' },
  { name: '卢毅', grade: '高三' },
  { name: '庞舒婷', grade: '高三' },
];

// 五月完成(✅)的课程: [日期, 学生名数组, 上课类型, 课时, 单价, 备注]
const records = [
  // === 五一期间 (21+3=24节) ===
  ['2026-05-01', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-02', ['刘文硕'], '1v1', 2, 58, ''],
  ['2026-05-02', ['秋辰', '皓燃', '乔梓'], '1v3', 2, null, '自定义: 1v1价+1v2价×2'],
  ['2026-05-02', ['林雅歌', '张淏翔'], '1v2', 2, 68, ''],
  ['2026-05-02', ['李良浩煜'], '1v1', 2, 58, ''],
  ['2026-05-02', ['林嘉祥'], '1v1', 2, 48, ''],
  ['2026-05-02', ['胡静涵'], '1v1', 2, 58, ''],
  ['2026-05-03', ['刘文硕'], '1v1', 2, 58, ''],
  ['2026-05-03', ['秋辰', '皓燃', '乔梓'], '1v3', 2, null, '自定义: 1v1价+1v2价×2'],
  ['2026-05-03', ['林雅歌', '张淏翔'], '1v2', 2, 68, ''],
  ['2026-05-03', ['李良浩煜'], '1v1', 2, 58, ''],
  ['2026-05-03', ['胡静涵'], '1v1', 2, 58, ''],
  ['2026-05-04', ['李良浩煜'], '1v1', 2, 58, ''],
  ['2026-05-04', ['秋辰', '皓燃', '乔梓'], '1v3', 2, null, '自定义: 1v1价+1v2价×2'],
  ['2026-05-04', ['林雅歌', '张淏翔'], '1v2', 2, 68, ''],
  ['2026-05-04', ['彭妍可'], '1v1', 2, 48, ''],
  ['2026-05-04', ['阚上涵'], '1v1', 2, 48, ''],
  ['2026-05-05', ['李良浩煜'], '1v1', 2, 58, ''],
  ['2026-05-05', ['阚上涵'], '1v1', 2, 48, ''],
  ['2026-05-05', ['南恩硕', '胡静涵'], '1v2', 2, 112, ''],
  ['2026-05-05', ['彭妍可'], '1v1', 2, 48, ''],
  // === 5.9-5.10 (6节) ===
  ['2026-05-09', ['余姿靓'], '1v1', 2, 58, ''],
  ['2026-05-09', ['吴思睿'], '1v1', 2, 48, ''],
  ['2026-05-10', ['李良浩煜'], '1v1', 2, 58, ''],
  ['2026-05-10', ['杨喻琦'], '1v1', 2, 58, ''],
  ['2026-05-10', ['彭妍可'], '1v1', 2, 48, ''],
  ['2026-05-10', ['南恩硕', '胡静涵'], '1v2', 2, 112, ''],
  // === 5.11-5.17 (14+1+1=16节) ===
  ['2026-05-11', ['余姿靓'], '1v1', 2, 58, ''],
  ['2026-05-11', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-12', ['余姿靓'], '1v1', 2, 58, ''],
  ['2026-05-12', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-13', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-13', ['余姿靓'], '1v1', 2, 58, ''],
  ['2026-05-15', ['阚上涵'], '1v1', 2, 48, ''],
  ['2026-05-16', ['秋辰', '皓燃', '乔梓'], '1v3', 2, null, '自定义: 1v1价+1v2价×2'],
  ['2026-05-16', ['张淏翔', '林雅歌'], '1v2', 2, 68, ''],
  ['2026-05-16', ['吴思睿'], '1v1', 2, 48, ''],
  ['2026-05-16', ['刘文硕'], '1v1', 2, 58, ''],
  ['2026-05-16', ['林嘉祥', '彭妍可'], '1v2', 2, 102, ''],
  ['2026-05-17', ['李良浩煜', '胡静涵'], '1v2', 2, 112, ''],
  ['2026-05-17', ['杨喻琦', '胡一佳'], '1v2', 2, 112, ''],
  // === 5.18-5.24 (12+1=13节) ===
  ['2026-05-18', ['余姿靓'], '1v1', 2, 58, ''],
  ['2026-05-19', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-19', ['余姿靓'], '1v1', 2, 58, ''],
  ['2026-05-20', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-23', ['秋辰', '皓燃', '乔梓'], '1v3', 2, null, '自定义: 1v1价+1v2价×2'],
  ['2026-05-23', ['林雅歌', '张淏翔'], '1v2', 2, 68, ''],
  ['2026-05-23', ['吴思睿'], '1v1', 2, 48, ''],
  ['2026-05-23', ['刘文硕'], '1v1', 2, 58, ''],
  ['2026-05-23', ['林嘉祥', '彭妍可'], '1v2', 2, 102, ''],
  ['2026-05-24', ['李良浩煜', '胡静涵'], '1v2', 2, 112, ''],
  ['2026-05-24', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-24', ['杨喻琦', '胡一佳', '卢毅'], '1v3', 2, 99, ''],
  // === 5.25-5.31 ===
  ['2026-05-25', ['林雅歌'], '1v1', 2, 58, ''],
  ['2026-05-25', ['南恩硕'], '1v1', 2, 58, ''],
  ['2026-05-25', ['余姿靓'], '1v1', 2, 58, ''],
  ['2026-05-26', ['林雅歌'], '1v1', 2, 58, ''],
  ['2026-05-26', ['余姿靓'], '1v1', 2, 58, ''],
];

async function main() {
  // Step 1: 获取或创建用户
  console.log('=== Step 1: 用户 ===');
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  let user = (users || []).find(u => u.email === '3387337277@qq.com');

  if (!user) {
    console.log('创建新用户...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: '3387337277@qq.com',
      password: 'qqaawsed990',
      email_confirm: true,
    });
    if (error) { console.error('创建用户失败:', error.message); process.exit(1); }
    user = data.user;
  }
  console.log('用户ID:', user.id);

  // Step 2: 创建学生
  console.log('\n=== Step 2: 学生 ===');
  const studentMap = {};

  for (const s of allStudents) {
    // 先查是否存在
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', s.name)
      .maybeSingle();

    if (existing) {
      studentMap[s.name] = existing.id;
      console.log(`  ✓ ${s.name} (${s.grade})`);
      continue;
    }

    const { data: created, error } = await supabase
      .from('students')
      .insert({
        user_id: user.id,
        name: s.name,
        grade: s.grade,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.log(`  ✗ ${s.name}: ${error.message}`);
    } else {
      studentMap[s.name] = created.id;
      console.log(`  + ${s.name} (${s.grade})`);
    }
  }

  // Step 3: 导入课程记录
  console.log('\n=== Step 3: 导入课程 ===');
  let count = 0;
  let errors = 0;

  // 先清理五月旧数据
  const { data: oldRecords } = await supabase
    .from('class_records')
    .select('id')
    .eq('user_id', user.id)
    .gte('class_date', '2026-05-01')
    .lte('class_date', '2026-05-31');

  if (oldRecords && oldRecords.length > 0) {
    console.log(`清理旧记录 ${oldRecords.length} 条...`);
    await supabase.from('class_records').delete().eq('user_id', user.id)
      .gte('class_date', '2026-05-01').lte('class_date', '2026-05-31');
  }

  for (const [date, studentNames, classType, hours, unitPrice, remark] of records) {
    for (const studentName of studentNames) {
      const studentId = studentMap[studentName];
      if (!studentId) {
        console.log(`  ⚠ 找不到学生: ${studentName}`);
        errors++;
        continue;
      }

      const isCustom = remark.includes('自定义');
      const recordData = {
        user_id: user.id,
        student_id: studentId,
        class_date: date,
        class_type: classType,
        hours: hours,
        source: 'manual',
      };

      if (isCustom) {
        recordData.is_custom = true;
        recordData.custom_rule = '1v1单价(58) + 1v2单价(112) = 170';
        recordData.custom_price = 170;
        recordData.unit_price = 170;
        recordData.salary = hours * 170;
        recordData.remarks = remark;
      } else if (unitPrice) {
        recordData.unit_price = unitPrice;
        recordData.salary = hours * unitPrice;
        if (remark) recordData.remarks = remark;
      }

      const { error } = await supabase.from('class_records').insert(recordData);
      if (error) {
        console.log(`  ✗ ${date} ${studentName}: ${error.message}`);
        errors++;
      } else {
        count++;
      }
    }
  }

  console.log(`\n✅ 导入 ${count} 条，失败 ${errors} 条`);

  // Step 4: 统计
  const { data: mayRecords } = await supabase
    .from('class_records')
    .select('hours, salary')
    .eq('user_id', user.id)
    .gte('class_date', '2026-05-01')
    .lte('class_date', '2026-05-31');

  const totalHours = (mayRecords || []).reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const totalSalary = (mayRecords || []).reduce((s, r) => s + parseFloat(r.salary || 0), 0);

  console.log(`\n📊 五月汇总:`);
  console.log(`  总课时: ${totalHours.toFixed(1)} 小时`);
  console.log(`  总工资: ¥${totalSalary.toFixed(0)}`);
  console.log(`  记录数: ${(mayRecords || []).length} 条`);
}

main();
