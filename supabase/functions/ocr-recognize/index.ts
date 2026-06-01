// Supabase Edge Function: OCR 识别排课表
// 部署: supabase functions deploy ocr-recognize

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface OcrResult {
  studentName: string;
  date: string;
  classType: string;
  hours: number;
  confidence: 'high' | 'medium' | 'low';
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imagePath } = await req.json();

    if (!imagePath) {
      return new Response(JSON.stringify({ error: '缺少 imagePath 参数' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 下载上传的图片
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('ocr-images')
      .download(imagePath);

    if (downloadError || !imageData) {
      return new Response(JSON.stringify({ error: '图片下载失败' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    // 调用百度 OCR API
    const baiduApiKey = Deno.env.get('BAIDU_OCR_API_KEY');
    const baiduSecretKey = Deno.env.get('BAIDU_OCR_SECRET_KEY');

    if (!baiduApiKey || !baiduSecretKey) {
      // 如果没有配置百度 OCR，返回模拟结果
      return new Response(JSON.stringify({
        records: getFallbackResults(),
        note: '未配置百度OCR，返回示例结果',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 获取百度 access_token
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${baiduApiKey}&client_secret=${baiduSecretKey}`
    );
    const tokenData = await tokenResponse.json();

    // 调用百度表格识别 API
    const ocrResponse = await fetch(
      `https://aip.baidubce.com/rest/2.0/solution/v1/form_ocr/request?access_token=${tokenData.access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          image: imageBase64,
          is_sync: 'true',
        }),
      }
    );

    const ocrData = await ocrResponse.json();

    // 解析 OCR 结果，提取表格数据
    const records: OcrResult[] = parseOcrResult(ocrData);

    return new Response(JSON.stringify({ records }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'OCR 识别失败',
      records: getFallbackResults(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseOcrResult(data: any): OcrResult[] {
  // 解析百度OCR返回的表格数据
  // 百度表格识别返回结构: { forms_result: [{ body: [{ row: [...] }] }] }
  const results: OcrResult[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (data.forms_result && data.forms_result.length > 0) {
      for (const form of data.forms_result) {
        if (form.body) {
          for (const row of form.body) {
            if (row.row && row.row.length >= 3) {
              const cells = row.row.map((cell: any) => cell.word || '');
              // 假设表格格式: [学生姓名, 日期, 课程类型, 课时]
              results.push({
                studentName: cells[0] || '未知',
                date: cells[1] || today,
                classType: normalizeClassType(cells[2]),
                hours: parseFloat(cells[3]) || 2,
                confidence: 'medium',
              });
            }
          }
        }
      }
    }
  } catch {
    // 解析失败，返回空
  }

  return results.length > 0 ? results : getFallbackResults();
}

function normalizeClassType(text: string): string {
  const normalized = text.replace(/\s/g, '').toLowerCase();
  if (normalized.includes('1v1') || normalized.includes('1对1')) return '1v1';
  if (normalized.includes('1v2') || normalized.includes('1对2')) return '1v2';
  if (normalized.includes('1v3') || normalized.includes('1对3')) return '1v3';
  if (normalized.includes('1v6') || normalized.includes('1对6')) return '1v6';
  return '1v1'; // 默认
}

function getFallbackResults(): OcrResult[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { studentName: '示例学生1', date: today, classType: '1v1', hours: 2, confidence: 'low' },
    { studentName: '示例学生2', date: today, classType: '1v2', hours: 1.5, confidence: 'low' },
  ];
}
