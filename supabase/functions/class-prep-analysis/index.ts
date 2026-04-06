// Fluentia LMS — Class Prep AI Analysis
// Analyzes recent student errors to generate focus points for upcoming class
// Deploy: supabase functions deploy class-prep-analysis --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const { group_id, unit_id } = await req.json()
    if (!group_id) {
      return new Response(JSON.stringify({ focus_points: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Get students in group (students.group_id, not group_members)
    const { data: students } = await supabase
      .from('students')
      .select('id, profiles(full_name, display_name)')
      .eq('group_id', group_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    const studentIds = students?.map((s: any) => s.id) || []
    if (!studentIds.length) {
      return new Response(JSON.stringify({ focus_points: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const studentNames: Record<string, string> = {}
    students?.forEach((s: any) => {
      studentNames[s.id] = s.profiles?.display_name || s.profiles?.full_name || 'طالب'
    })

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // 2. Get recent speaking feedback
    const { data: speakingFeedback } = await supabase
      .from('speaking_recordings')
      .select('student_id, ai_evaluation, created_at')
      .in('student_id', studentIds)
      .gte('created_at', twoWeeksAgo)
      .not('ai_evaluation', 'is', null)
      .limit(15)

    // 3. Get vocabulary mastery — weakest words
    const { data: vocabMastery } = await supabase
      .from('vocabulary_word_mastery')
      .select('student_id, mastery_level, curriculum_vocabulary(word)')
      .in('student_id', studentIds)
      .eq('mastery_level', 'new')
      .limit(30)

    // 4. Get curriculum progress — which sections students struggle with
    const { data: progress } = await supabase
      .from('student_curriculum_progress')
      .select('student_id, section_type, score, status')
      .in('student_id', studentIds)
      .lt('score', 50)
      .limit(20)

    // 5. Get help requests (from prompt 07) — what students flagged
    const { data: helpRequests } = await supabase
      .from('help_requests')
      .select('student_id, section_type, created_at')
      .in('student_id', studentIds)
      .eq('status', 'pending')
      .limit(10)

    // Build context for AI
    const speakingContext = speakingFeedback?.slice(0, 8).map((s: any) => ({
      student: studentNames[s.student_id],
      feedback: typeof s.ai_evaluation === 'string' ? s.ai_evaluation : JSON.stringify(s.ai_evaluation),
    })) || []

    const weakWords = vocabMastery?.map((v: any) => v.curriculum_vocabulary?.word).filter(Boolean) || []
    const uniqueWeakWords = [...new Set(weakWords)]

    const lowScores = progress?.map((p: any) => ({
      student: studentNames[p.student_id],
      section: p.section_type,
      score: p.score,
    })) || []

    const helpContext = helpRequests?.map((h: any) => ({
      student: studentNames[h.student_id],
      section: h.section_type,
    })) || []

    // 6. Call Claude for analysis
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ focus_points: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `أنت مساعد تعليمي لمدرب لغة إنجليزية في أكاديمية سعودية. حلل البيانات التالية واعطني ٣-٥ نقاط تركيز للحصة القادمة.

بيانات تقييم التحدث الأخيرة:
${JSON.stringify(speakingContext)}

كلمات لم يتقنها الطلاب:
${JSON.stringify(uniqueWeakWords.slice(0, 15))}

أقسام بدرجات منخفضة:
${JSON.stringify(lowScores)}

طلبات مساعدة من الطلاب:
${JSON.stringify(helpContext)}

أعطني الإجابة كـ JSON فقط بدون أي نص إضافي:
{
  "focus_points": [
    {
      "type": "grammar" | "pronunciation" | "vocabulary" | "student_attention",
      "title": "عنوان قصير بالعربي",
      "detail": "تفصيل بسيط بالعربي",
      "affected_students": ["اسم الطالب"]
    }
  ]
}`

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await aiResponse.json()
    const responseText = aiData.content?.[0]?.text || '{}'

    // Extract JSON safely
    const jsonStart = responseText.indexOf('{')
    const jsonEnd = responseText.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return new Response(JSON.stringify({ focus_points: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const focusPoints = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1))

    return new Response(JSON.stringify(focusPoints), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Class prep analysis error:', error)
    return new Response(JSON.stringify({ focus_points: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
