/**
 * Helpers shared by the language packs: a number in the pack's language, and the plural form a
 * count takes there (`Intl.PluralRules`: `one`, `few`, `many`, `other`…).
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

export function packHelpers(lang: string) {
  const rules = new Intl.PluralRules(lang)
  const numbers = new Intl.NumberFormat(lang)
  /** `n` in the language's digits and separators. */
  const num = (n: number) => numbers.format(n)
  /** The form for `count`, with `#` replaced by the count (or by `shown` when given). */
  const plural = (count: number, forms: PluralForms, shown: string = num(count)) =>
    (forms[rules.select(count)] ?? forms.other).replaceAll('#', shown)
  return { num, plural }
}
