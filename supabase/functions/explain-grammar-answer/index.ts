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

const REQUIRED_HEADERS = [
  '## الفكرة الأساسية',
  '## القاعدة',
  '## التركيب',
  '## أمثلة',
  '## أخطاء شائعة',
  '## ملخص سريع',
];

function validateSchema(text: string): boolean {
  return REQUIRED_HEADERS.every(h => text.includes(h));
}

async function callClaude(
  system: string,
  user: string,
  apiKey: string,
): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return {
    text: data.content?.[0]?.text || '',
    usage: data.usage || { input_tokens: 0, output_tokens: 0 },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
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
      force_regenerate = false,
    } = body;

    if (!questionText || !correctAnswer) {
      return jsonRes({ error: 'Missing required fields' }, 400);
    }

    const cacheKey = await hashKey(`${questionText}::${studentAnswer}::${correctAnswer}`);

    // Cache lookup (skip when force_regenerate)
    if (!force_regenerate) {
      const { data: cached } = await supabase
        .from('grammar_explanation_cache')
        .select('explanation_html, explanation_md, tldr_ar')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      if (cached) {
        await supabase
          .from('grammar_explanation_cache')
          .update({ hit_count: (cached as any).hit_count ? (cached as any).hit_count + 1 : 2 })
          .eq('cache_key', cacheKey);

        if ((cached as any).explanation_md) {
          return jsonRes({ explanation_md: (cached as any).explanation_md });
        }
        return jsonRes({
          explanation_html: (cached as any).explanation_html,
          tldr_ar: (cached as any).tldr_ar,
        });
      }
    }

    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY');
    if (!CLAUDE_API_KEY) return jsonRes({ error: 'API key not configured' }, 500);

    const systemPrompt =
`أنت مدرس إنجليزي تشرح باللهجة النجدية السعودية لطلاب مستوى ${studentLevel || 'A1'}.
الموضوع النحوي: ${grammarTopic || 'غير محدد'}

مهمتك: اشرح لماذا الإجابة الصحيحة هي "${correctAnswer}"${!isCorrect ? ` وليست "${studentAnswer || '(لم يجب)'}"` : ''}.

اشرح بلهجة نجدية واضحة. ممنوع الفصحى.

استخدم هيكل Markdown هذا بالضبط، ولا تحذف أي قسم ولا تضيف أقسام جديدة:

## الفكرة الأساسية

شرح بسيط في جملة أو جملتين، باللهجة النجدية الواضحة.

## القاعدة

- نقطة 1
- نقطة 2
- نقطة 3

## التركيب

\`البنية الإنجليزية + مكوناتها\`

## أمثلة

**مثال 1:**
> الجملة الإنجليزية مع **الجزء المهم** بالبولد
>
> ترجمتها بالنجدي

**مثال 2:**
> ...
>
> ...

**مثال 3:**
> ...
>
> ...

## أخطاء شائعة

❌ **خطأ:** مثال خاطئ
✓ **صح:** مثال صحيح
**ليش؟** توضيح قصير

## ملخص سريع

سطرين فقط يلخصون القاعدة.

---

RULES:
- لهجة نجدية دائماً. ممنوع الفصحى أبداً.
- كل جملة إنجليزية في الأمثلة: الفعل أو التركيب الرئيسي **bold**.
- Blockquote (>) لكل زوج إنجليزي-عربي في الأمثلة.
- سطر فاضي بين كل header وأول سطر محتواه.
- المجموع 250-450 كلمة. لا أقل ولا أكثر.
- ابدأ مباشرة بـ ## الفكرة الأساسية. بدون مقدمة أو خاتمة.`;

    const userPrompt =
`السؤال: ${questionText}
إجابة الطالب: ${studentAnswer || '(لم يجب)'}
الإجابة الصحيحة: ${correctAnswer}
القاعدة من الدرس: "${ruleSnippet || '(غير متاحة)'}"`;

    let { text: markdownText, usage } = await callClaude(systemPrompt, userPrompt, CLAUDE_API_KEY);

    // Schema check: retry once if any required header is missing
    if (!validateSchema(markdownText)) {
      const retryUser = userPrompt +
        '\n\nIMPORTANT: Your previous response was missing required sections. ' +
        'Include ALL sections exactly: ## الفكرة الأساسية, ## القاعدة, ## التركيب, ## أمثلة, ## أخطاء شائعة, ## ملخص سريع.';
      const retry = await callClaude(systemPrompt, retryUser, CLAUDE_API_KEY);
      usage = retry.usage;
      markdownText = retry.text;

      if (!validateSchema(markdownText)) {
        try {
          await supabase.from('grammar_explanations_warnings').insert({
            cache_key: cacheKey,
            reason: 'Schema validation failed after 2 attempts',
            raw_response: markdownText.slice(0, 2000),
          });
        } catch {}
      }
    }

    // Track usage
    try {
      await supabase.from('ai_usage').insert({
        type: 'grammar_explain',
        student_id: user.id,
        model: 'claude-sonnet-4-20250514',
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        estimated_cost_sar: ((usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000) * 3.75,
      });
    } catch {}

    // Cache (upsert to handle force_regenerate overwrite)
    try {
      await supabase.from('grammar_explanation_cache').upsert({
        cache_key: cacheKey,
        question_text: questionText,
        student_answer: studentAnswer || '',
        correct_answer: correctAnswer,
        tldr_ar: '',
        explanation_html: '',
        explanation_md: markdownText,
      }, { onConflict: 'cache_key' });
    } catch {}

    return jsonRes({ explanation_md: markdownText });
  } catch (e) {
    return jsonRes({ error: String(e) }, 500);
  }
});

async function hashKey(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
