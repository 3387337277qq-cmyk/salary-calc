const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xunzyblieclzajqrpaxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bnp5YmxpZWNsemFqcXJwYXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTAxOSwiZXhwIjoyMDk1ODg3MDE5fQ.2A-5CSBhjuGQwIjvVfWo6RhNGGuKJhL7TjfjOxaLleo'
);

async function main() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === '3387337277@qq.com');
  const userId = user.id;

  // 获取所有学生
  const { data: students } = await supabase.from('students').select('id, name').eq('user_id', userId);
  const byName = {};
  for (const s of students) byName[s.name] = s.id;

  // ============ 1. 林雅歌 & 张淏翔: 固定 1v2 64元/时 ============
  const yage = byName['林雅歌'];
  const haoxiang = byName['张淏翔'];
  const datesLY = ['2026-05-02', '2026-05-03', '2026-05-04', '2026-05-16'];

  for (const date of datesLY) {
    for (const sid of [yage, haoxiang]) {
      const { data: recs } = await supabase.from('class_records')
        .select('id').eq('user_id', userId).eq('student_id', sid).eq('class_date', date);
      for (const r of (recs || [])) {
        await supabase.from('class_records').update({
          class_type: '1v2',
          is_custom: true,
          custom_rule: '指定1v2单价64元/时',
          custom_price: 64,
          unit_price: 64,
          salary: 128, // 2hrs × 64
          remarks: '特殊指定: 按1v2 64元/时'
        }).eq('id', r.id);
      }
    }
  }
  console.log('✅ 林雅歌&张淏翔: 4节×128=512元');

  // ============ 2. 秋辰&皓燃&乔梓: 1v1+1v4 = 138元/时 ============
  const qiuchen = byName['秋辰'];
  const haoran = byName['皓燃'];
  const qiaozi = byName['乔梓'];
  const dates3 = ['2026-05-02', '2026-05-03', '2026-05-04', '2026-05-16', '2026-05-23'];

  for (const date of dates3) {
    for (const sid of [qiuchen, haoran, qiaozi]) {
      const { data: recs } = await supabase.from('class_records')
        .select('id').eq('user_id', userId).eq('student_id', sid).eq('class_date', date);
      for (const r of (recs || [])) {
        await supabase.from('class_records').update({
          class_type: '1v3',
          is_custom: true,
          custom_rule: '1v1+1v4 (54+84=138元/时)',
          custom_price: 138,
          unit_price: 138,
          salary: 276, // 2hrs × 138
          remarks: '特殊指定: 三人班按1v1+1v4'
        }).eq('id', r.id);
      }
    }
  }
  console.log('✅ 秋辰&皓燃&乔梓: 5节×276=1380元');

  // ============ 3. 人数乘三规则: 1v2→1v6, 1v3→1v9 ============
  // 排除上述特殊指定的记录

  // 1v2 → 1v6 (排除 is_custom 的)
  const { data: v2Records } = await supabase
    .from('class_records')
    .select('id, class_type, is_custom')
    .eq('user_id', userId)
    .gte('class_date', '2026-05-01').lte('class_date', '2026-05-31')
    .eq('class_type', '1v2')
    .eq('is_custom', false);

  let count1v2 = 0;
  for (const r of (v2Records || [])) {
    await supabase.from('class_records').update({ class_type: '1v6' }).eq('id', r.id);
    count1v2++;
  }
  console.log(`✅ 1v2→1v6: ${count1v2}条 (人数2×3=6)`);

  // 1v3 → 1v9 (排除 is_custom)
  const { data: v3Records } = await supabase
    .from('class_records')
    .select('id, class_type, is_custom')
    .eq('user_id', userId)
    .gte('class_date', '2026-05-01').lte('class_date', '2026-05-31')
    .eq('class_type', '1v3')
    .eq('is_custom', false);

  let count1v3 = 0;
  for (const r of (v3Records || [])) {
    await supabase.from('class_records').update({ class_type: '1v9' }).eq('id', r.id);
    count1v3++;
  }
  console.log(`✅ 1v3→1v9: ${count1v3}条 (人数3×3=9)`);

  // ============ 4. 重新按第五档计算 ============
  console.log('\n重新计算...');
  const { data: records } = await supabase
    .from('class_records')
    .select('id, student_id, class_type, hours, is_custom, custom_price, student:students(grade)')
    .eq('user_id', userId)
    .gte('class_date', '2026-05-01').lte('class_date', '2026-05-31');

  const { data: tier5 } = await supabase
    .from('pricing_tiers')
    .select('id, name, pricing_rates(*)')
    .eq('user_id', userId).eq('name', '第五档').single();

  const rates = tier5?.pricing_rates || [];
  let updated = 0, custom = 0;

  for (const r of records) {
    if (r.is_custom && r.custom_price) { custom++; continue; }
    const grade = r.student?.grade;
    const rate = rates.find(rr => rr.grade === grade && rr.class_type === r.class_type);
    if (!rate) {
      console.log(`  ⚠ ${grade} ${r.class_type} 无匹配`);
      continue;
    }
    await supabase.from('class_records').update({
      unit_price: rate.price_per_hour,
      salary: r.hours * rate.price_per_hour,
    }).eq('id', r.id);
    updated++;
  }

  // 统计
  const { data: final } = await supabase
    .from('class_records')
    .select('hours, salary, class_type, is_custom')
    .eq('user_id', userId)
    .gte('class_date', '2026-05-01').lte('class_date', '2026-05-31');

  const totalHours = final.reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const totalSalary = final.reduce((s, r) => s + parseFloat(r.salary || 0), 0);

  // 按类型统计
  const byType = {};
  for (const r of final) {
    const key = r.is_custom ? '自定义' : r.class_type;
    byType[key] = (byType[key] || 0) + 1;
  }

  console.log(`\n📊 五月最终汇总:`);
  console.log(`  总课时: ${totalHours.toFixed(1)}h`);
  console.log(`  总工资: ¥${totalSalary.toFixed(0)}`);
  console.log(`  更新: ${updated}条, 自定义: ${custom}条`);
  console.log(`  按类型:`, byType);
}

main();
