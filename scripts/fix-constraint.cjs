const pg = require('pg');

async function tryAll() {
  const configs = [
    // 直接连接
    { host: 'db.xunzyblieclzajqrpaxb.supabase.co', port: 5432, user: 'postgres', label: '直连' },
    // 事务池
    { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 6543, user: 'postgres.xunzyblieclzajqrpaxb', label: '事务池' },
    // 会话池
    { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 5432, user: 'postgres.xunzyblieclzajqrpaxb', label: '会话池' },
  ];

  // 构建1v1-1v20列表
  const types = Array.from({length:20}, (_,i) => `'1v${i+1}'`).join(',');

  for (const cfg of configs) {
    const pool = new pg.Pool({
      ...cfg,
      database: 'postgres',
      password: 'qqaawsed990',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      max: 1,
    });
    try {
      console.log(`尝试 ${cfg.label} (${cfg.host}:${cfg.port})...`);
      const client = await pool.connect();
      console.log(`✅ ${cfg.label} 连接成功！`);

      await client.query(`ALTER TABLE public.class_records DROP CONSTRAINT IF EXISTS class_records_class_type_check`);
      await client.query(`ALTER TABLE public.class_records ADD CONSTRAINT class_records_class_type_check CHECK (class_type IN (${types}))`);
      await client.query(`ALTER TABLE public.pricing_rates DROP CONSTRAINT IF EXISTS pricing_rates_class_type_check`);
      await client.query(`ALTER TABLE public.pricing_rates ADD CONSTRAINT pricing_rates_class_type_check CHECK (class_type IN (${types}))`);
      console.log('✅ 约束更新完成！');
      client.release();
      await pool.end();
      return;
    } catch (e) {
      console.log(`❌ ${cfg.label}: ${e.message}`);
      try { await pool.end(); } catch {}
    }
  }
  console.log('\n所有连接方式都失败了');
}

tryAll();
