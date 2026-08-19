/**
 * Shared spelling / form-change rule sets.
 *
 * The audit found spelling and form changes covered in 1 of 72 standard
 * lessons. These are the rules an Arabic-speaking learner actually trips on —
 * they are written once here and attached to every lesson whose paradigm needs
 * them, so a student never has to guess how the form is built.
 */

const SPELLING = {
  third_person_s: {
    label_ar: 'إضافة s مع he / she / it',
    rows: [
      ['الأصل', 'أضيفي <b>s</b>', 'work → work<b>s</b> · send → send<b>s</b>'],
      ['ينتهي بـ s, sh, ch, x, o', 'أضيفي <b>es</b>', 'watch → watch<b>es</b> · go → go<b>es</b>'],
      ['ينتهي بحرف ساكن + y', 'احذفي y وأضيفي <b>ies</b>', 'study → stud<b>ies</b> · try → tr<b>ies</b>'],
      ['ينتهي بحرف علّة + y', 'أضيفي <b>s</b> فقط', 'play → play<b>s</b> · buy → buy<b>s</b>'],
      ['شاذ', 'صيغة خاصة', 'have → <b>has</b>'],
    ],
  },

  ing_form: {
    label_ar: 'تكوين صيغة ing',
    rows: [
      ['الأصل', 'أضيفي <b>ing</b>', 'work → work<b>ing</b>'],
      ['ينتهي بـ e صامتة', 'احذفي e ثم أضيفي <b>ing</b>', 'write → writ<b>ing</b> · make → mak<b>ing</b>'],
      ['مقطع واحد: ساكن+علّة+ساكن', 'ضاعفي الحرف الأخير', 'run → ru<b>nn</b>ing · stop → sto<b>pp</b>ing'],
      ['ينتهي بـ ie', 'حوّليها إلى <b>y</b> ثم ing', 'lie → l<b>y</b>ing · die → d<b>y</b>ing'],
      ['لا نضاعف', 'إذا انتهى بـ w, x, y', 'fix → fix<b>ing</b> · play → play<b>ing</b>'],
    ],
  },

  ed_form: {
    label_ar: 'تكوين صيغة الماضي المنتظم ed',
    rows: [
      ['الأصل', 'أضيفي <b>ed</b>', 'work → work<b>ed</b>'],
      ['ينتهي بـ e', 'أضيفي <b>d</b> فقط', 'close → close<b>d</b>'],
      ['ينتهي بحرف ساكن + y', 'احذفي y وأضيفي <b>ied</b>', 'try → tr<b>ied</b> · study → stud<b>ied</b>'],
      ['مقطع واحد: ساكن+علّة+ساكن', 'ضاعفي الحرف الأخير', 'stop → sto<b>pp</b>ed · plan → pla<b>nn</b>ed'],
    ],
    note_ar: 'نطق النهاية يختلف: بعد الأصوات المهموسة تُنطق /t/ (worked)، وبعد المجهورة /d/ (played)، وبعد t أو d تُنطق /ɪd/ (wanted).',
  },

  past_participle: {
    label_ar: 'التصريف الثالث (past participle)',
    rows: [
      ['الأفعال المنتظمة', 'مثل الماضي تمامًا: <b>ed</b>', 'finish → finish<b>ed</b> → finish<b>ed</b>'],
      ['الشاذة — ثلاثة أشكال', 'V1 / V2 / V3 مختلفة', 'go → went → <b>gone</b> · write → wrote → <b>written</b>'],
      ['الشاذة — شكلان', 'V2 و V3 متطابقان', 'make → made → <b>made</b> · send → sent → <b>sent</b>'],
      ['الشاذة — شكل واحد', 'لا تتغيّر', 'cut → cut → <b>cut</b> · put → put → <b>put</b>'],
    ],
    note_ar: 'التصريف الثالث هو ما يأتي بعد <b>have/has/had</b> وبعد <b>be</b> في المبني للمجهول.',
  },

  comparative_form: {
    label_ar: 'تكوين المقارنة والتفضيل',
    rows: [
      ['مقطع واحد', '<b>er</b> / <b>est</b>', 'fast → fast<b>er</b> → the fast<b>est</b>'],
      ['ينتهي بـ e', '<b>r</b> / <b>st</b>', 'large → large<b>r</b> → the large<b>st</b>'],
      ['ساكن+علّة+ساكن', 'ضاعفي الحرف الأخير', 'big → bi<b>gg</b>er → the bi<b>gg</b>est'],
      ['ينتهي بـ y', 'حوّليها إلى <b>i</b>', 'easy → eas<b>i</b>er → the eas<b>i</b>est'],
      ['مقطعان فأكثر', '<b>more</b> / <b>the most</b>', 'expensive → <b>more</b> expensive'],
      ['شاذ', 'صيغة خاصة', 'good → <b>better</b> → the <b>best</b> · bad → <b>worse</b> → the <b>worst</b>'],
    ],
  },

  plurals: {
    label_ar: 'تكوين الجمع',
    rows: [
      ['الأصل', 'أضيفي <b>s</b>', 'file → file<b>s</b>'],
      ['ينتهي بـ s, sh, ch, x', 'أضيفي <b>es</b>', 'box → box<b>es</b>'],
      ['ساكن + y', 'احذفي y وأضيفي <b>ies</b>', 'company → compan<b>ies</b>'],
      ['ينتهي بـ f / fe', 'حوّليها إلى <b>ves</b>', 'life → li<b>ves</b> · shelf → shel<b>ves</b>'],
      ['شاذ', 'صيغة خاصة', 'child → <b>children</b> · person → <b>people</b> · man → <b>men</b>'],
    ],
  },
}

module.exports = { SPELLING }
