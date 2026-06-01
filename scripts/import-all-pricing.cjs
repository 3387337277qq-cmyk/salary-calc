const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xunzyblieclzajqrpaxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bnp5YmxpZWNsemFqcXJwYXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTAxOSwiZXhwIjoyMDk1ODg3MDE5fQ.2A-5CSBhjuGQwIjvVfWo6RhNGGuKJhL7TjfjOxaLleo'
);

const CLASS_TYPES = Array.from({length: 20}, (_, i) => `1v${i+1}`);

const tiers = [
  {
    name: '第一档', min_hours: 0, max_hours: 59.9, sort_order: 1,
    data: [
      { grade: '高三', prices: [54,64,74,84,98,108,120,132,145,158,171,184,198,212,226,240,255,270,285,300] },
      { grade: '高一至高二', prices: [48,58,68,78,90,102,114,126,139,152,165,178,192,206,220,234,249,264,279,294] },
      { grade: '初三', prices: [43,53,63,73,85,97,109,121,134,147,160,173,187,201,215,229,244,259,274,289] },
      { grade: '小六至初二', prices: [35,45,55,65,77,89,101,113,126,139,152,165,179,193,207,221,236,251,266,281] },
      { grade: '小一至小五', prices: [32,42,52,62,74,86,98,110,123,136,149,162,176,190,204,218,233,248,263,278] },
    ],
  },
  {
    name: '第二档', min_hours: 60, max_hours: 69.5, sort_order: 2,
    data: [
      { grade: '高三', prices: [58,68,78,88,100,112,124,136,149,162,175,188,202,216,230,244,259,274,289,304] },
      { grade: '高一至高二', prices: [52,62,72,82,94,106,118,130,143,156,169,182,196,210,224,238,253,268,283,298] },
      { grade: '初三', prices: [46,56,66,76,88,100,112,124,137,150,163,176,190,204,218,232,247,262,277,292] },
      { grade: '小六至初二', prices: [38,48,58,68,80,92,104,116,129,142,155,168,182,196,210,224,239,254,269,284] },
      { grade: '小一至小五', prices: [35,45,55,65,77,89,101,113,126,139,152,165,179,193,207,221,236,251,266,281] },
    ],
  },
  {
    name: '第三档', min_hours: 70, max_hours: 89.5, sort_order: 3,
    data: [
      { grade: '高三', prices: [62,72,82,92,104,116,128,140,153,166,179,192,206,220,234,248,263,278,293,308] },
      { grade: '高一至高二', prices: [56,66,76,86,98,110,122,134,147,160,173,186,200,214,228,242,257,272,287,302] },
      { grade: '初三', prices: [50,60,70,80,92,104,116,128,141,154,167,180,194,208,222,236,251,266,281,296] },
      { grade: '小六至初二', prices: [41,51,61,71,83,95,107,119,132,145,158,171,185,199,213,227,242,257,272,287] },
      { grade: '小一至小五', prices: [38,48,58,68,80,92,104,116,129,142,155,168,182,196,210,224,239,254,269,284] },
    ],
  },
  {
    name: '第四档', min_hours: 90, max_hours: 119.5, sort_order: 4,
    data: [
      { grade: '高三', prices: [66,76,86,96,108,120,132,144,157,170,183,196,210,224,238,252,267,282,297,312] },
      { grade: '高一至高二', prices: [60,70,80,90,102,114,126,138,151,164,177,190,204,218,232,246,261,276,291,306] },
      { grade: '初三', prices: [54,64,74,84,96,108,120,132,145,158,171,184,198,212,226,240,255,270,285,300] },
      { grade: '小六至初二', prices: [44,54,64,74,86,98,110,122,135,148,161,174,188,202,216,230,245,260,275,290] },
      { grade: '小一至小五', prices: [38,48,58,68,80,92,104,116,129,142,155,168,182,196,210,224,239,254,269,284] },
    ],
  },
  {
    name: '第五档', min_hours: 120, max_hours: 999.9, sort_order: 5,
    data: [
      { grade: '高三', prices: [70,80,90,100,112,124,136,148,161,174,187,200,214,228,242,256,271,286,301,316] },
      { grade: '高一至高二', prices: [64,74,84,94,106,118,130,142,155,168,181,194,208,222,236,250,265,280,295,310] },
      { grade: '初三', prices: [58,68,78,88,100,112,124,136,149,162,175,188,202,216,230,244,259,274,289,304] },
      { grade: '小六至初二', prices: [48,58,68,78,90,102,114,126,139,152,165,178,192,206,220,234,249,264,279,294] },
      { grade: '小一至小五', prices: [42,52,62,72,84,96,108,120,133,146,159,172,186,200,214,228,243,258,273,288] },
    ],
  },
];

async function main() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = (users || []).find(u => u.email === '3387337277@qq.com');
  if (!user) { console.error('找不到用户'); return; }
  const userId = user.id;

  // 清理旧定价
  console.log('清理旧数据...');
  const { data: oldTiers } = await supabase.from('pricing_tiers').select('id').eq('user_id', userId);
  for (const t of (oldTiers || [])) {
    await supabase.from('pricing_rates').delete().eq('tier_id', t.id);
    await supabase.from('pricing_tiers').delete().eq('id', t.id);
  }

  // 导入
  let total = 0;
  for (const t of tiers) {
    const { data: tier } = await supabase.from('pricing_tiers').insert({
      user_id: userId,
      name: t.name,
      min_hours: t.min_hours,
      max_hours: t.max_hours,
      sort_order: t.sort_order,
    }).select().single();

    if (!tier) { console.log(`  ${t.name}: 创建失败`); continue; }

    const rates = [];
    for (const grade of t.data) {
      for (let i = 0; i < grade.prices.length; i++) {
        rates.push({
          tier_id: tier.id,
          grade: grade.grade,
          class_type: CLASS_TYPES[i],
          price_per_hour: grade.prices[i],
        });
      }
    }

    // 批量插入
    const chunkSize = 25;
    let inserted = 0;
    for (let i = 0; i < rates.length; i += chunkSize) {
      const chunk = rates.slice(i, i + chunkSize);
      const { error } = await supabase.from('pricing_rates').insert(chunk);
      if (error) {
        console.log(`  ${t.name} 第${i/chunkSize+1}批失败:`, error.message);
      } else {
        inserted += chunk.length;
      }
    }

    total += inserted;
    console.log(`  ✅ ${t.name} (${t.min_hours}-${t.max_hours >= 999 ? t.max_hours + '+' : t.max_hours}h): ${inserted}条`);
  }

  console.log(`\n📊 导入完成！共 ${total} 条定价记录 (5档 × 5年级 × 20类型)`);

  // 验证
  const { data: summary } = await supabase
    .from('pricing_rates')
    .select('grade, tier:tier_id(name)');

  if (summary) {
    const counts = {};
    for (const r of summary) {
      const key = r.tier?.name || '未知';
      counts[key] = (counts[key] || 0) + 1;
    }
    console.log('\n各档记录数:');
    for (const [name, count] of Object.entries(counts)) {
      console.log(`  ${name}: ${count}条`);
    }
  }
}

main();
