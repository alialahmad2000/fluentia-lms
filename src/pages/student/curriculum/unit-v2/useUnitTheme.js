export function useUnitTheme(themeEn, themeAr) {
  const t = `${themeEn || ''} ${themeAr || ''}`.toLowerCase();
  if (/festival|celebrat|holiday|carnival|مهرجان|احتفال/.test(t)) return 'confetti';
  if (/ocean|sea|marine|water|fish|محيط|بحر/.test(t)) return 'bubbles';
  if (/space|planet|star|galaxy|universe|فضاء|كوكب|نجم/.test(t)) return 'stars';
  if (/ancient|history|civilization|past|قديم|تاريخ|حضار/.test(t)) return 'goldDust';
  if (/sport|game|athletic|رياض/.test(t)) return 'energySparks';
  if (/art|music|paint|craft|فن|موسيق|رسم/.test(t)) return 'paintDrops';
  if (/invent|technology|machine|اختراع|تقني|آل/.test(t)) return 'circuits';
  if (/place|city|landmark|travel|مكان|مدين|معلم|سفر/.test(t)) return 'goldDust';
  return 'ambientDots';
}
