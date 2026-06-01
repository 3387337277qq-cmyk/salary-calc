const { Pool } = require('pg');

async function tryConnect(host, port, user) {
  const pool = new Pool({
    host,
    port,
    database: 'postgres',
    user,
    password: 'qqaawsed990',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    console.log(`尝试 ${host}:${port} ...`);
    const client = await pool.connect();
    console.log('✅ 连接成功！');
    const { rows } = await client.query('SELECT version()');
    console.log(rows[0].version);
    return client;
  } catch (err) {
    console.log(`❌ ${host}:${port} 失败:`, err.message);
    return null;
  }
}

async function main() {
  // 依次尝试各种连接方式
  const fs = require('fs');
  const path = require('path');

  let client = null;

  // 方式1: 直接连接
  client = await tryConnect('db.xunzyblieclzajqrpaxb.supabase.co', 5432, 'postgres');

  // 方式2: 会话池
  if (!client) client = await tryConnect('aws-0-ap-south-1.pooler.supabase.com', 5432, 'postgres.xunzyblieclzajqrpaxb');

  // 方式3: 事务池
  if (!client) client = await tryConnect('aws-0-ap-south-1.pooler.supabase.com', 6543, 'postgres.xunzyblieclzajqrpaxb');

  if (!client) {
    console.log('所有连接方式都失败了，请检查网络或密码');
    process.exit(1);
  }

  // 读取并执行SQL
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('正在执行SQL迁移...');
  await client.query(sql);
  console.log('✅ 数据库表创建成功！');

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('已创建的表：', rows.map(r => r.table_name).join(', '));

  client.release();
  process.exit(0);
}

main();
