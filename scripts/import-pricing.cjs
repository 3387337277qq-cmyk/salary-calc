const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xunzyblieclzajqrpaxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bnp5YmxpZWNsemFqcXJwYXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTAxOSwiZXhwIjoyMDk1ODg3MDE5fQ.2A-5CSBhjuGQwIjvVfWo6RhNGGuKJhL7TjfjOxaLleo'
);

const CLASS_TYPES = Array.from({length: 20}, (_, i) => `1v${i+1}`);

const tiers = [
  {
    name: '第一档',
    min_hours: 0, max_hours: 59.9, sort_order: 1,
    data: [
      { grade: '高三', prices: [54,64,74,84,98,108,120,132,145,158,171,184,198,212,226,240,255,270,285,300] },
      { grade: '高一至高二', prices: [48,58,68,78,90,102,114,126,139,152,165,178,192,206,220,234,249,264,279,294] },
      { grade: '初三', prices: [43,53,63,73,85,97,109,121,134,147,160,173,187,201,215,229,244,259,274,289] },
      { grade: '小六至初二', prices: [35,45,55,65,77,89,101,113,126,139,152,165,179,193,207,221,236,251,266,281] },
      { grade: '小一至小五', prices: [32,42,52,62,74,86,98,110,123,136,149,162,176,190,204,218,233,248,263,278] },
    ],
  },
  {
    name: '第二档',
    min_hours: 60, max_hours: 69.5, sort_order: 2,
    data: [
      { grade: '高三', prices: [58,68,78,88,100,112,124,136,149,162,175,188,202,216,230,244,259,274,289,304] },
      { grade: '高一至高二', prices: [52,62,72,82,94,106,118,130,143,156,169,182,196,210,224,238,253,268,283,298] },
      { grade: '初三', prices: [46,56,66,76,88,100,112,124,137,150,163,176,190,204,218,232,247,262,277,292] },
      { grade: '小六至初二', prices: [38,48,58,68,80,92,104,116,129,142,155,168,182,196,210,224,239,254,269,284] },
      { grade: '小一至小五', prices: [35,45,55,65,77,89,101,113,126,139,152,165,179,193,207,221,236,251,266,281] },
    ],
  },
];

async function main() {
  // 获取用户
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = (users || []).find(u => u.email === '3387337277@qq.com');
  if (!user) { console.error('找不到用户'); return; }
  const userId = user.id;
  console.log('用户ID:', userId);

  // 清理旧定价
  console.log('\n清理旧定价...');
  const { data: oldTiers } = await supabase.from('pricing_tiers').select('id').eq('user_id', userId);
  for (const t of (oldTiers || [])) {
    await supabase.from('pricing_rates').delete().eq('tier_id', t.id);
    await supabase.from('pricing_tiers').delete().eq('id', t.id);
  }
  console.log('已清理');

  // 导入
  let total = 0;
  for (const t of tiers) {
    console.log(`\n导入 ${t.name} (${t.min_hours}-${t.max_hours}小时)...`);
    const { data: tier } = await supabase.from('pricing_tiers').insert({
      user_id: userId,
      name: t.name,
      min_hours: t.min_hours,
      max_hours: t.max_hours,
      sort_order: t.sort_order,
    }).select().single();

    if (!tier) { console.log('  失败'); continue; }

    let count = 0;
    for (const grade of t.data) {
      for (let i = 0; i < grade.prices.length; i++) {
        await supabase.from('pricing_rates').insert({
          tier_id: tier.id,
          grade: grade.grade,
          class_type: CLASS_TYPES[i],
          price_per_hour: grade.prices[i],
        });
        count++;
      }
    }
    total += count;
    console.log(`  ✅ ${count} 条`);
  }

  console.log(`\n📊 总计: ${total} 条定价记录 (2档 × 5年级 × 20类型)`);
}

main();
