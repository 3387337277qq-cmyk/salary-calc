const https = require('https');
const fs = require('fs');
const path = require('path');

function walkDir(dir, fileList, baseDir) {
  fileList = fileList || [];
  baseDir = baseDir || dir;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList, baseDir);
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      fileList.push({ path: relPath, fullPath });
    }
  }
  return fileList;
}

const files = walkDir('./dist');
console.log('共 ' + files.length + ' 个文件，上传中...');

const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
const chunks = [];

for (const f of files) {
  const content = fs.readFileSync(f.fullPath);
  let ct = 'application/octet-stream';
  if (f.path.endsWith('.html')) ct = 'text/html; charset=utf-8';
  else if (f.path.endsWith('.css')) ct = 'text/css; charset=utf-8';
  else if (f.path.endsWith('.js')) ct = 'application/javascript; charset=utf-8';
  else if (f.path.endsWith('.json')) ct = 'application/json; charset=utf-8';
  else if (f.path.endsWith('.svg')) ct = 'image/svg+xml';
  else if (f.path.endsWith('.png')) ct = 'image/png';
  else if (f.path.endsWith('.webmanifest')) ct = 'application/manifest+json';

  chunks.push(Buffer.from('--' + boundary + '\r\n'));
  chunks.push(Buffer.from('Content-Disposition: form-data; name="files"; filename="' + f.path + '"\r\n'));
  chunks.push(Buffer.from('Content-Type: ' + ct + '\r\n\r\n'));
  chunks.push(content);
  chunks.push(Buffer.from('\r\n'));
}
chunks.push(Buffer.from('--' + boundary + '--\r\n'));
const body = Buffer.concat(chunks);

const opts = {
  hostname: 'api.netlify.com',
  path: '/api/v1/sites/unique-squirrel-456dd3.netlify.app/deploys',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length,
  }
};

const req = https.request(opts, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const r = JSON.parse(data);
      if (r.id) {
        console.log('✅ 部署成功!');
        console.log('   访问: https://unique-squirrel-456dd3.netlify.app');
      } else {
        console.log('响应:', data.substring(0, 500));
      }
    } catch(e) {
      console.log('响应:', data.substring(0, 500));
    }
  });
});
req.on('error', e => console.error('请求失败:', e.message));
req.write(body);
req.end();
