export type IngredientFlag = {
  label: string
  classification: string
}

export type IngredientTextSegment = { text: string; flagged: boolean }

const KNOWN_FLAGS: { flag: IngredientFlag; pattern: RegExp }[] = [
  {
    flag: { label: 'BHA (butylated hydroxyanisole)', classification: 'IARC Group 2B' },
    pattern: /\b(?:BHA|butylated\s+hydroxyanisole|E\s*320)\b/gi,
  },
  {
    flag: { label: 'Potassium bromate', classification: 'IARC Group 2B' },
    pattern: /\b(?:potassium\s+bromate|E\s*924)\b/gi,
  },
]

/** Flags only explicit, curated label terms; no match does not establish safety. */
export function inspectIngredients(text: string): {
  segments: IngredientTextSegment[]
  flags: IngredientFlag[]
} {
  const matches: { start: number; end: number }[] = []
  const flags: IngredientFlag[] = []

  for (const entry of KNOWN_FLAGS) {
    entry.pattern.lastIndex = 0
    let match: RegExpExecArray | null
    let found = false
    while ((match = entry.pattern.exec(text)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length })
      found = true
    }
    if (found) flags.push(entry.flag)
  }

  matches.sort((a, b) => a.start - b.start || a.end - b.end)
  const segments: IngredientTextSegment[] = []
  let offset = 0
  for (const match of matches) {
    if (match.start < offset) continue
    if (match.start > offset) segments.push({ text: text.slice(offset, match.start), flagged: false })
    segments.push({ text: text.slice(match.start, match.end), flagged: true })
    offset = match.end
  }
  if (offset < text.length) segments.push({ text: text.slice(offset), flagged: false })
  return { segments, flags }
}
