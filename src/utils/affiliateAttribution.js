import { supabase } from '../lib/supabase'

/**
 * Attribute a newly enrolled student to an affiliate via their lead record.
 * Called after student creation in AdminStudents.
 */
export async function attributeStudent({ studentId, email, phone }) {
  try {
    // Try to find a matching lead with an affiliate
    let query = supabase
      .from('leads')
      .select('affiliate_id, ref_code')
      .not('affiliate_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (email && phone) {
      query = query.or(`email.eq.${email},phone.eq.${phone}`)
    } else if (email) {
      query = query.eq('email', email)
    } else if (phone) {
      query = query.eq('phone', phone)
    } else {
      return { attributed: false }
    }

    const { data: lead } = await query.maybeSingle()

    if (!lead?.affiliate_id) return { attributed: false }

    await supabase
      .from('students')
      .update({ ref_code: lead.ref_code, affiliate_id: lead.affiliate_id })
      .eq('id', studentId)

    return { attributed: true, affiliate_id: lead.affiliate_id, ref_code: lead.ref_code }
  } catch (err) {
    console.error('attributeStudent error:', err)
    return { attributed: false }
  }
}
