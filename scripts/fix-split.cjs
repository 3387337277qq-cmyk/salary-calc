const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xunzyblieclzajqrpaxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bnp5YmxpZWNsemFqcXJwYXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTAxOSwiZXhwIjoyMDk1ODg3MDE5fQ.2A-5CSBhjuGQwIjvVfWo6RhNGGuKJhL7TjfjOxaLleo'
);

async function main() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === '3387337277@qq.com');
  const userId = user.id;

  const { data: students } = await supabase.from('students').select('id, name').eq('user_id', userId);
  const byName = {};
  for (const s of students) byName[s.name] = s.id;

  // ===== 秋辰/皓燃/乔梓: 整堂课276元，3人平分 = 92/人 =====
  const group3 = [byName['秋辰'], byName['皓燃'], byName['乔梓']];
  const dates3 = ['2026-05-02','2026-05-03','2026-05-04','2026-05-16','2026-05-23'];

  for (const date of dates3) {
    for (const sid of group3) {
      const { data: recs } = await supabase.from('class_records')
        .select('id').eq('user_id', userId).eq('student_id', sid).eq('class_date', date);
      for (const r of (recs||[])) {
        await supabase.from('class_records').update({
          custom_price: 46,
          unit_price: 46,
          salary: 92,
          remarks: '三人班276元/节, 人均92元'
        }).eq('id', r.id);
      }
    }
  }
  console.log('✅ 秋辰班: 5节×276=1380, 人均92');

  // ===== 林雅歌/张淏翔: 整堂课128元，2人平分 = 64/人 =====
  const group2 = [byName['林雅歌'], byName['张淏翔']];
  const dates2 = ['2026-05-02','2026-05-03','2026-05-04','2026-05-16'];

  for (const date of dates2) {
    for (const sid of group2) {
      const { data: recs } = await supabase.from('class_records')
        .select('id').eq('user_id', userId).eq('student_id', sid).eq('class_date', date);
      for (const r of (recs||[])) {
        await supabase.from('class_records').update({
          custom_price: 32,
          unit_price: 32,
          salary: 64,
          remarks: '指定1v2, 128元/节, 人均64元'
        }).eq('id', r.id);
      }
    }
  }
  console.log('✅ 林雅歌班: 4节×128=512, 人均64');

  // ===== 标准多人班：也按整堂课平分 =====
  // 获取所有1v6和1v9的非自定义记录，找出同一日期有多个学生的
  const { data: mkRecords } = await supabase
    .from('class_records')
    .select('id, class_date, class_type, student_id, salary')
    .eq('user_id', userId).eq('is_custom', false)
    .gte('class_date','2026-05-01').lte('class_date','2026-05-31')
    .in('class_type', ['1v6','1v9']);

  // 按日期+类型分组
  const groups = {};
  for (const r of mkRecords) {
    const key = `${r.class_date}_${r.class_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  let splitCount = 0;
  for (const [key, recs] of Object.entries(groups)) {
    const n = recs.length;
    if (n <= 1) continue;
    // 取第一条的salary作为整堂课价格，平分
    const sessionPrice = parseFloat(recs[0].salary);
    const perPerson = Math.round(sessionPrice / n * 100) / 100;
    for (const r of recs) {
      await supabase.from('class_records').update({
        salary: perPerson,
        unit_price: Math.round(perPerson / 2 * 100) / 100,
      }).eq('id', r.id);
    }
    splitCount += n;
  }
  console.log(`✅ 标准多人班平分: ${splitCount}条`);

  // 最终统计
  const { data: final } = await supabase
    .from('class_records')
    .select('hours, salary')
    .eq('user_id', userId)
    .gte('class_date','2026-05-01').lte('class_date','2026-05-31');

  const totalHours = final.reduce((s,r) => s + parseFloat(r.hours||0), 0);
  const totalSalary = final.reduce((s,r) => s + parseFloat(r.salary||0), 0);

  console.log(`\n📊 五月最终:`);
  console.log(`  总课时: ${totalHours.toFixed(1)}h`);
  console.log(`  总工资: ¥${totalSalary.toFixed(0)}`);
}

main();
