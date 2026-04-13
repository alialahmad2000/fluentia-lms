import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonRes({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return jsonRes({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const {
      questionText,
      studentAnswer,
      correctAnswer,
      isCorrect,
      grammarTopic,
      studentLevel,
      ruleSnippet,
    } = body;

    if (!questionText || !correctAnswer) {
      return jsonRes({ error: 'Missing required fields' }, 400);
    }

    // Cache lookup
    const cacheKey = await hashKey(`${questionText}::${studentAnswer}::${correctAnswer}`);
    const { data: cached } = await supabase
      .from('grammar_explanation_cache')
      .select('explanation_html, tldr_ar')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (cached) {
      // Bump hit count
      await supabase
        .from('grammar_explanation_cache')
        .update({ hit_count: (cached as any).hit_count ? (cached as any).hit_count + 1 : 2 })
        .eq('cache_key', cacheKey);
      return jsonRes(cached);
    }

    // Build prompt
    const systemPrompt = `أنتِ مُدرّسة إنجليزية ذكية في أكاديمية "طلاقة" للناطقين بالعربية.
مستوى الطالبة: ${studentLevel || 'A1'}.
أسلوبك: ودود، واضح، قصير، عربي فصيح مع مصطلحات إنجليزية بين قوسين عند الحاجة.
هدفك: تشرحي للطالبة لماذا إجابتها كانت ${isCorrect ? 'صحيحة' : 'خاطئة'}، مع توضيح القاعدة الدقيقة (خاصة الاستثناءات).

القاعدة اللي شافتها الطالبة في الدرس:
"${ruleSnippet || '(غير متاحة)'}"

الموضوع النحوي: ${grammarTopic || '(غير محدد)'}`;

    const userPrompt = `السؤال: ${questionText}
إجابة الطالبة: ${studentAnswer || '(لم تجب)'}
الإجابة الصحيحة: ${correctAnswer}

اشرحي لها بالعربي:
1. سبب الإجابة الصحيحة (القاعدة بالضبط)
2. إذا كانت إجابتها خاطئة، اشرحي المصدر المحتمل للخطأ وقاعدة الاستثناء إن وُجدت
3. أعطي مثالين إضافيين يوضحان نفس القاعدة
4. نصيحة حفظ ذكية (trick أو قاعدة سريعة)

الإخراج JSON فقط، بدون أي نص قبل أو بعد:
{
  "tldr_ar": "جملة عربية واحدة مختصرة جداً تلخّص السبب (أقل من 20 كلمة)",
  "explanation_html": "HTML قصير منظّم بفقرات <p>، يحتوي على <strong> للكلمات المهمة، و <code> للأمثلة الإنجليزية، و <ul><li> للقوائم. لا تستخدمي <h1> أو <h2>."
}`;

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY');
    if (!CLAUDE_API_KEY) return jsonRes({ error: 'API key not configured' }, 500);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return jsonRes({ error: 'AI call failed', detail: err }, 502);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // Extract JSON (Claude may add preamble)
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start === -1 || end === -1) {
      return jsonRes({ error: 'Parse error', raw: rawText }, 500);
    }
    const parsed = JSON.parse(rawText.slice(start, end + 1));

    // Track usage (fire-and-forget, ignore errors)
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    try {
      await supabase.from('ai_usage').insert({
        type: 'grammar_explain',
        student_id: user.id,
        model: 'claude-sonnet-4-20250514',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_sar: ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75,
      });
    } catch {}

    // Cache (fire-and-forget, ignore errors)
    try {
      await supabase.from('grammar_explanation_cache').insert({
        cache_key: cacheKey,
        question_text: questionText,
        student_answer: studentAnswer || '',
        correct_answer: correctAnswer,
        tldr_ar: parsed.tldr_ar || '',
        explanation_html: parsed.explanation_html || '',
      });
    } catch {}

    return jsonRes(parsed);
  } catch (e) {
    return jsonRes({ error: String(e) }, 500);
  }
});

async function hashKey(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
