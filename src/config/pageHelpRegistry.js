export const PAGE_HELP = {
  'curriculum.reading.passage': {
    title: 'صفحة قراءة الوحدة',
    summary: 'قطعة قراءة تفاعلية مع مساعدات لتعلّم الكلمات الجديدة.',
    sections: [
      {
        heading: 'ماذا تفعل هنا؟',
        items: [
          'اقرأ القطعة كاملةً بتركيز.',
          'مرّر المؤشر أو اضغط على أي كلمة لترى الترجمة السريعة.',
          'اضغط بشكل مطوّل (أو اضغط "المزيد") للخيارات التفصيلية.',
          'أجب عن أسئلة الفهم بعد القراءة.',
        ],
      },
      {
        heading: 'الخيارات التفصيلية للكلمة',
        items: [
          '⭐ أضف لمفرداتي — يضيف الكلمة لقائمة مراجعتك.',
          '🎧 استمع — النطق الصحيح للكلمة.',
          '💡 شرح بالسياق — كيف استُعملت هذه الكلمة هنا.',
          '📚 أمثلة جديدة — ثلاث جمل جديدة بنفس الكلمة.',
          '🔤 صيغ الكلمة — فعل/اسم/صفة/حال.',
        ],
      },
      {
        heading: 'نصائح',
        items: [
          'لو ما تحب المساعدات، عطّلها من "⚙ مساعدات القراءة".',
          'اقرأ مرة بدون مساعدة، ثم عد مع المساعدات.',
        ],
      },
    ],
    rolesExtra: {
      trainer: {
        heading: 'للمعلم',
        items: [
          'تقدم الطلاب يُسجّل تلقائياً في قسم تقرير المجموعة.',
          'الكلمات المضافة لمفردات الطالب تُراجَع في وحدة المفردات.',
        ],
      },
      admin: {
        heading: 'للأدمن',
        items: [
          'محتوى القطع يُدار من لوحة المنهج.',
          'يمكن استبدال قطعة من مكتبة القطع البديلة.',
        ],
      },
    },
  },
  'curriculum.home': { title: 'المنهج', summary: '', sections: [] },
  'vocabulary.home': { title: 'المفردات', summary: '', sections: [] },
  'speaking.home': { title: 'المحادثة', summary: '', sections: [] },
  'writing.home': { title: 'الكتابة', summary: '', sections: [] },
  'listening.home': { title: 'الاستماع', summary: '', sections: [] },
  'grammar.home': { title: 'القواعد', summary: '', sections: [] },
  'dashboard.student': { title: 'لوحة الطالب', summary: '', sections: [] },
  'dashboard.trainer': { title: 'لوحة المعلم', summary: '', sections: [] },
  'dashboard.admin': { title: 'لوحة الأدمن', summary: '', sections: [] },
}
