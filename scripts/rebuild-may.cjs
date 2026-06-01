const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xunzyblieclzajqrpaxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bnp5YmxpZWNsemFqcXJwYXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTAxOSwiZXhwIjoyMDk1ODg3MDE5fQ.2A-5CSBhjuGQwIjvVfWo6RhNGGuKJhL7TjfjOxaLleo'
);

// 课节定义: [日期, 主学生名, 同堂学生, 类型标签, unit_price, salary, hours]
const sessions = [
  // ===== 类别1: 初三1v1 (58/hr, 116/节) x38 =====
  ['2026-05-01','南恩硕','','1v1',58,116,2],
  ['2026-05-02','刘文硕','','1v1',58,116,2],
  ['2026-05-02','李良浩煜','','1v1',58,116,2],
  ['2026-05-02','胡静涵','','1v1',58,116,2],
  ['2026-05-03','刘文硕','','1v1',58,116,2],
  ['2026-05-03','李良浩煜','','1v1',58,116,2],
  ['2026-05-03','胡静涵','','1v1',58,116,2],
  ['2026-05-04','李良浩煜','','1v1',58,116,2],
  ['2026-05-05','李良浩煜','','1v1',58,116,2],
  ['2026-05-09','余姿靓','','1v1',58,116,2],
  ['2026-05-10','李良浩煜','','1v1',58,116,2],
  ['2026-05-10','杨喻琦','','1v1',58,116,2],
  ['2026-05-11','南恩硕','','1v1',58,116,2],
  ['2026-05-11','余姿靓','','1v1',58,116,2],
  ['2026-05-12','南恩硕','','1v1',58,116,2],
  ['2026-05-12','余姿靓','','1v1',58,116,2],
  ['2026-05-13','南恩硕','','1v1',58,116,2],
  ['2026-05-13','余姿靓','','1v1',58,116,2],
  ['2026-05-16','刘文硕','','1v1',58,116,2],
  ['2026-05-18','余姿靓','','1v1',58,116,2],
  ['2026-05-19','南恩硕','','1v1',58,116,2],
  ['2026-05-19','余姿靓','','1v1',58,116,2],
  ['2026-05-20','南恩硕','','1v1',58,116,2],
  ['2026-05-24','南恩硕','','1v1',58,116,2],
  ['2026-05-25','南恩硕','','1v1',58,116,2],
  ['2026-05-25','余姿靓','','1v1',58,116,2],
  ['2026-05-25','林雅歌','','1v1',58,116,2],
  ['2026-05-26','林雅歌','','1v1',58,116,2],
  ['2026-05-26','余姿靓','','1v1',58,116,2],
  ['2026-05-04','张淏翔','','1v1',58,116,2], // 单人课时
  ['2026-05-16','张淏翔','','1v1',58,116,2],
  ['2026-05-05','南恩硕','','1v1',58,116,2], // 补单人
  ['2026-05-24','刘文硕','','1v1',58,116,2],
  ['2026-05-24','张淏翔','','1v1',58,116,2],
  ['2026-05-24','林雅歌','','1v1',58,116,2],
  ['2026-05-23','刘文硕','','1v1',58,116,2],
  ['2026-05-23','南恩硕','','1v1',58,116,2],
  ['2026-05-17','杨喻琦','','1v1',58,116,2],

  // ===== 类别2: 6-8年级1v1 (48/hr, 96/节) x12 =====
  ['2026-05-02','林嘉祥','','1v1',48,96,2],
  ['2026-05-04','彭妍可','','1v1',48,96,2],
  ['2026-05-04','阚上涵','','1v1',48,96,2],
  ['2026-05-05','阚上涵','','1v1',48,96,2],
  ['2026-05-05','彭妍可','','1v1',48,96,2],
  ['2026-05-09','吴思睿','','1v1',48,96,2],
  ['2026-05-10','彭妍可','','1v1',48,96,2],
  ['2026-05-15','阚上涵','','1v1',48,96,2],
  ['2026-05-16','吴思睿','','1v1',48,96,2],
  ['2026-05-23','吴思睿','','1v1',48,96,2],
  ['2026-05-23','林嘉祥','','1v1',48,96,2],
  ['2026-05-24','吴思睿','','1v1',48,96,2],

  // ===== 类别3: 初三1v2指定 (68/hr, 136/节) x5 =====
  ['2026-05-02','林雅歌','张淏翔','1v2',68,136,2],
  ['2026-05-03','林雅歌','张淏翔','1v2',68,136,2],
  ['2026-05-04','林雅歌','张淏翔','1v2',68,136,2],
  ['2026-05-16','林雅歌','张淏翔','1v2',68,136,2],
  ['2026-05-23','林雅歌','张淏翔','1v2',68,136,2],

  // ===== 类别4: 初三2人→1v6 (112/hr, 224/节) x6 =====
  ['2026-05-05','南恩硕','胡静涵','1v6',112,224,2],
  ['2026-05-10','南恩硕','胡静涵','1v6',112,224,2],
  ['2026-05-17','李良浩煜','胡静涵','1v6',112,224,2],
  ['2026-05-24','李良浩煜','胡静涵','1v6',112,224,2],
  ['2026-05-17','杨喻琦','胡一佳','1v6',112,224,2],
  ['2026-05-24','杨喻琦','胡一佳','1v6',112,224,2],

  // ===== 类别5: 6-8年级2人→1v6 (102/hr, 204/节) x3 =====
  ['2026-05-16','林嘉祥','彭妍可','1v6',102,204,2],
  ['2026-05-23','林嘉祥','彭妍可','1v6',102,204,2],
  ['2026-05-17','彭妍可','林嘉祥','1v6',102,204,2],

  // ===== 类别6: 116+224特殊三人班 (170/hr, 340/节) x6 =====
  ['2026-05-02','秋辰','皓燃、乔梓','1v3',170,340,2],
  ['2026-05-03','秋辰','皓燃、乔梓','1v3',170,340,2],
  ['2026-05-04','秋辰','皓燃、乔梓','1v3',170,340,2],
  ['2026-05-16','秋辰','皓燃、乔梓','1v3',170,340,2],
  ['2026-05-23','秋辰','皓燃、乔梓','1v3',170,340,2],
  ['2026-05-05','秋辰','皓燃、乔梓','1v3',170,340,2], // 第6节

  // ===== 类别7: 喻琦/一佳/卢毅 (149/hr, 298/节) x2 =====
  ['2026-05-24','杨喻琦','胡一佳、卢毅','1v9',149,298,2],
  ['2026-05-31','杨喻琦','胡一佳、卢毅','1v9',149,298,2],

  // ===== 类别8: 晚辅导 (25/hr, 50/节) x1 =====
  ['2026-05-13','南恩硕','','1v1',25,50,2],
];

console.log(`总节数: ${sessions.length}`);
console.log(`总课时: ${sessions.length * 2}h`);
const checkTotal = sessions.reduce((s,r) => s + r[5], 0);
console.log(`总金额: ¥${checkTotal}`);

// 验证公式
console.log('\n分类统计:');
const cats = {};
for (const s of sessions) {
  const price = s[5];
  cats[price] = (cats[price]||0) + 1;
}
let verifyTotal = 0;
for (const [price, count] of Object.entries(cats)) {
  console.log(`  ${count}节 × ${price} = ${count * parseInt(price)}`);
  verifyTotal += count * parseInt(price);
}
console.log(`  验证总计: ¥${verifyTotal}`);

async function main() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === '3387337277@qq.com');
  const userId = user.id;

  // 获取学生ID映射
  const { data: students } = await supabase.from('students').select('id,name').eq('user_id', userId);
  const byName = {};
  for (const s of students) byName[s.name] = s.id;

  // 删除旧五月数据
  console.log('\n清理旧数据...');
  await supabase.from('class_records').delete().eq('user_id', userId)
    .gte('class_date','2026-05-01').lte('class_date','2026-05-31');

  // 插入新课节
  let inserted = 0;
  for (const [date, mainStudent, otherStudents, classType, unitPrice, salary, hours] of sessions) {
    const studentId = byName[mainStudent];
    if (!studentId) { console.log(`  ⚠ 找不到学生: ${mainStudent}`); continue; }

    const remark = otherStudents ? `同堂: ${otherStudents}` : '';

    const { error } = await supabase.from('class_records').insert({
      user_id: userId,
      student_id: studentId,
      class_date: date,
      class_type: classType,
      hours: hours,
      unit_price: unitPrice,
      salary: salary,
      is_custom: [136,224,204,340,298,50].includes(salary),
      custom_rule: salary === 136 ? '指定1v2单价68元/时' :
                   salary === 340 ? '1v1+1v4组合计价' :
                   salary === 224 ? '2人×3→1v6' :
                   salary === 204 ? '2人×3→1v6(6-8年级)' :
                   salary === 298 ? '3人班一口价' :
                   salary === 50 ? '晚辅导固定价' : null,
      custom_price: [136,224,204,340,298,50].includes(salary) ? unitPrice : null,
      remarks: remark || null,
      source: 'manual',
    });
    if (error) console.log(`  ❌ ${date} ${mainStudent}: ${error.message}`);
    else inserted++;
  }

  // 统计
  const { data: final } = await supabase.from('class_records')
    .select('hours,salary').eq('user_id', userId)
    .gte('class_date','2026-05-01').lte('class_date','2026-05-31');

  const th = final.reduce((s,r) => s + parseFloat(r.hours||0), 0);
  const ts = final.reduce((s,r) => s + parseFloat(r.salary||0), 0);

  console.log(`\n✅ 导入 ${inserted} 节`);
  console.log(`📊 总课时: ${th}h | 总工资: ¥${ts.toFixed(0)}`);
}

main();
