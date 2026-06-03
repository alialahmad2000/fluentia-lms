// Single source of truth for activity metadata shown on Mission Cards
// Keys match ACTIVITY_MAP keys in useUnitData.js

export const ACTIVITY_LABELS_AR = {
  reading:      'القراءة',
  vocabulary:   'المفردات',
  grammar:      'القواعد',
  writing:      'الكتابة',
  speaking:     'التحدث',
  listening:    'الاستماع',
  pronunciation:'النطق',
  recording:    'التسجيل',
};

export const ACTIVITY_XP = {
  reading:      25,
  vocabulary:   30,
  grammar:      20,
  writing:      35,
  speaking:     35,
  listening:    20,
  pronunciation:15,
  recording:    10,
};

export const ACTIVITY_MINUTES = {
  reading:      15,
  vocabulary:   20,
  grammar:      20,
  writing:      30,
  speaking:     25,
  listening:    15,
  pronunciation:15,
  recording:    10,
};

// Generic "why" fallbacks — used only when unit's activity_ribbons missing.
// Gender-aware: pass a g(male, female) picker (from useG) at the call site.
// Only the entries that carry an explicit feminine marker differ by gender.
export function getActivityWhyGeneric(g) {
  return {
    reading:      'أول لقاء مع المفردات في سياقها الطبيعي',
    vocabulary:   'تثبيت الكلمات بطريقة ذكية (SRS)',
    grammar:      g('القاعدة التي تُتقنها تطلق لسانك', 'القاعدة التي تُتقنها تطلق لسانكِ'),
    writing:      'تحويل المعرفة إلى إنتاج',
    speaking:     g('ثقتك تُبنى بالممارسة الحقيقية', 'ثقتكِ تُبنى بالممارسة الحقيقية'),
    listening:    g('أذنك تتعوّد على الإيقاع الطبيعي', 'أذنكِ تتعوّد على الإيقاع الطبيعي'),
    pronunciation:'النطق الصحيح = فهمٌ صحيح',
    recording:    g('سجّل صوتك وتابع تقدّمك', 'سجّلي صوتكِ وتابعي تقدّمكِ'),
  };
}

// Suggested-next order (what pulses when its turn comes)
export const SUGGESTED_ORDER = [
  'reading', 'vocabulary', 'grammar',
  'listening', 'pronunciation',
  'writing', 'speaking',
];
