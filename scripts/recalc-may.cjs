const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xunzyblieclzajqrpaxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bnp5YmxpZWNsemFqcXJwYXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTAxOSwiZXhwIjoyMDk1ODg3MDE5fQ.2A-5CSBhjuGQwIjvVfWo6RhNGGuKJhL7TjfjOxaLleo'
);

async function main() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = (users || []).find(u => u.email === '3387337277@qq.com');
  const userId = user.id;

  // 获取所有五月记录（含学生年级）
  console.log('获取五月记录...');
  const { data: records } = await supabase
    .from('class_records')
    .select('id, student_id, class_type, hours, is_custom, custom_price, custom_rule, student:students(grade)')
    .eq('user_id', userId)
    .gte('class_date', '2026-05-01')
    .lte('class_date', '2026-05-31');
  console.log(`  共 ${records.length} 条记录`);

  // 获取第五档(120+)价格
  const { data: tiers } = await supabase
    .from('pricing_tiers')
    .select('id, name, pricing_rates(*)')
    .eq('user_id', userId)
    .eq('min_hours', 120)
    .single();

  if (!tiers) { console.error('找不到第五档'); return; }
  const rates = tiers.pricing_rates || [];
  console.log(`  使用档位: ${tiers.name}`);
  console.log(`  价格条目: ${rates.length} 条\n`);

  // 逐条更新
  let updated = 0, skipped = 0, custom = 0;
  for (const r of records) {
    const grade = r.student?.grade;
    if (!grade) { skipped++; continue; }

    const rate = rates.find(rr => rr.grade === grade && rr.class_type === r.class_type);
    if (!rate) {
      console.log(`  ⚠ 找不到价格: ${grade} ${r.class_type}`);
      skipped++;
      continue;
    }

    if (r.is_custom && r.custom_price) {
      // 自定义：保持原自定义价格
      custom++;
      continue;
    }

    const unitPrice = rate.price_per_hour;
    const salary = r.hours * unitPrice;

    const { error } = await supabase
      .from('class_records')
      .update({ unit_price: unitPrice, salary: salary })
      .eq('id', r.id);

    if (error) {
      console.log(`  ❌ 更新失败: ${error.message}`);
      skipped++;
    } else {
      updated++;
    }
  }

  // 重新统计
  const { data: mayRecords } = await supabase
    .from('class_records')
    .select('hours, salary, is_custom')
    .eq('user_id', userId)
    .gte('class_date', '2026-05-01')
    .lte('class_date', '2026-05-31');

  const totalHours = mayRecords.reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const totalSalary = mayRecords.reduce((s, r) => s + parseFloat(r.salary || 0), 0);

  console.log(`\n✅ 更新 ${updated} 条, 自定义保持 ${custom} 条, 跳过 ${skipped} 条`);
  console.log(`\n📊 五月（按第五档 120+）:`);
  console.log(`  总课时: ${totalHours.toFixed(1)} 小时`);
  console.log(`  总工资: ¥${totalSalary.toFixed(0)}`);
}

main();
