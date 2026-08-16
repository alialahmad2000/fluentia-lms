/**
 * The vocabulary photo gate.
 *
 * WHY THIS EXISTS
 * `curriculum_vocabulary.image_url` covers 1,657 rows (1,497 distinct files).
 * Every one of those files was reviewed as contact sheets, and the set does not
 * depict its words. Two failure modes, and almost nothing else:
 *
 *   1. an abstract watercolour smear that depicts nothing at all
 *      (the majority — e.g. `implications`, `scored`, `sentiment`)
 *   2. the WORD drawn as lettering instead of a picture — and very often
 *      MISSPELLED: "adipt", "adiptvle", "afordable", "anticicate",
 *      "appleciate", "arctulate", "implemnted", "implemensation",
 *      "incevibele", "incolprate", "insopitable", "sigificant", "sepicsal",
 *      "sopethicated", "spectilative", "intrisic" …
 *
 * Mode 2 is a correctness bug, not a cosmetic one: a student meeting the word
 * `significant` for the first time was being shown "sigificant" in 48pt. So no
 * STUDENT surface renders these files. Without a photo the card is not empty —
 * `WordArtPlate` makes the word itself the subject.
 *
 * Nothing is deleted. Every row keeps its `image_url`, the admin curriculum
 * editor still shows it (that is where a bad image gets fixed), and flipping
 * this one flag brings photos back everywhere the day the set is regenerated.
 */
export const VOCAB_PHOTOS_ENABLED = false

/** Returns the photo URL only while vocab photos are trusted; else null. */
export function vocabPhotoUrl(url) {
  return VOCAB_PHOTOS_ENABLED ? (url || null) : null
}
