import { supabase } from '../lib/supabase'

// Log error to system_errors table — fire and forget
export function logError(errorType, service, message, context = {}) {
  try {
    supabase.from('system_errors').insert({
      error_type: errorType,
      service,
      error_message: message,
      error_context: context,
    }).then(() => {}) // fire and forget
  } catch {
    // If error logging fails, log to console as last resort
    console.error('[Fluentia Error]', { errorType, service, message, context })
  }
}

// User-friendly Arabic error messages
const ERROR_MESSAGES = {
  'auth/invalid-credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'auth/user-not-found': 'لم يتم العثور على حساب بهذا البريد',
  'auth/email-already-in-use': 'هذا البريد مستخدم بالفعل',
  'auth/weak-password': 'كلمة المرور ضعيفة — استخدم 8 أحرف على الأقل',
  'auth/too-many-requests': 'محاولات كثيرة — حاول بعد دقائق',
  'network-error': 'لا يوجد اتصال بالإنترنت — تحقق من الشبكة',
  'upload-failed': 'فشل رفع الملف — حاول مرة أخرى',
  'voice-permission-denied': 'السماح بالوصول للمايكروفون مطلوب',
  'voice-not-found': 'لم يتم العثور على مايكروفون',
  'ai-unavailable': 'التقييم التلقائي غير متاح حالياً — سيراجع المدرب عملك مباشرة',
  'storage-full': 'مساحة التخزين ممتلئة — تواصل مع الإدارة',
  'default': 'حصل خطأ — حاول مرة أخرى',
}

export function getArabicError(errorCode) {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default
}

// Parse Supabase error to user-friendly message
export function parseSupabaseError(error) {
  if (!error) return ERROR_MESSAGES.default

  const msg = error.message?.toLowerCase() || ''
  if (msg.includes('invalid login')) return ERROR_MESSAGES['auth/invalid-credentials']
  if (msg.includes('user not found')) return ERROR_MESSAGES['auth/user-not-found']
  if (msg.includes('email') && msg.includes('already')) return ERROR_MESSAGES['auth/email-already-in-use']
  if (msg.includes('weak password')) return ERROR_MESSAGES['auth/weak-password']
  if (msg.includes('rate limit') || msg.includes('too many')) return ERROR_MESSAGES['auth/too-many-requests']
  if (msg.includes('network') || msg.includes('fetch')) return ERROR_MESSAGES['network-error']

  return ERROR_MESSAGES.default
}
