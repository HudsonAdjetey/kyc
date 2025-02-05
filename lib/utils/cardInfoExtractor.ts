
const generalIdPatterns = {
  idNumber: [
    /\b(?:ID|Number|#|No\.?):\s*([A-Z0-9-]+)\b/i,
    /\b([A-Z]{1,3}\d{5,10})\b/,
    /\b(\d{9})\b/, // SSN-like
    /\b([A-Z]{1,2}\d{6}[A-Z]?)\b/, // Passport-like
  ],
  name: [/\b(?:Name|Full Name):\s*([A-Z\s]+)\b/i, /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/],
  surname: [/\bSurname:\s*([A-Z]+)\b/i],
  givenNames: [/\b(?:Given Names?|First Name|Forename):\s*([A-Z\s]+)\b/i],
  dateOfBirth: [
    /\b(?:Date of Birth|DOB|Born):\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/i,
    /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/,
  ],
  placeOfBirth: [/\b(?:Place of Birth|POB):\s*([A-Z\s]+)\b/i],
  nationality: [/\bNationality:\s*([A-Z]+)\b/i],
  dateOfIssue: [/\b(?:Date of Issue|Issued):\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/i],
  dateOfExpiry: [/\b(?:Date of Expiry|Expires):\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/i],
}

const extractInfo = (text: string, patterns: RegExp[]): string | undefined => {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return undefined
}

const identifyCardType = (text: string): string => {
  if (text.includes("PASSPORT") || text.match(/PASSPORT NO\.?/i)) {
    return "Passport"
  }
  if (text.match(/DRIVER'?S? LICEN[SC]E/i)) {
    return "Driver's License"
  }
  if (text.match(/NATIONAL ID(ENTITY)? CARD/i)) {
    return "National ID"
  }
  return "Unknown ID"
}

const checkCardSide = (text: string): { isFront: boolean; isBack: boolean } => {
  const frontPatterns = [
    /\b(?:Name|Full Name|Surname|Given Names?|First Name|Forename)\b/i,
    /\b(?:ID|Number|#|No\.?)\b/i,
    /\bNationality\b/i,
    /\bDate of Birth\b/i,
  ]

  const backPatterns = [/\b(?:Date of Issue|Issued|Date of Expiry|Expires)\b/i, /\bSignature\b/i, /\bPlace of Birth\b/i]

  const isFront = frontPatterns.some((pattern) => pattern.test(text))
  const isBack = backPatterns.some((pattern) => pattern.test(text))

  return isFront || !isBack ? { isFront: true, isBack: false } : { isFront: false, isBack: true }
}

export function extractCardInfo(text: string): ExtractedCardInfo {
  const cardType = identifyCardType(text)
  const { isFront, isBack } = checkCardSide(text)

  const info: ExtractedCardInfo = {
    cardType,
    isFront,
    isBack,
    additionalInfo: {},
  }

  for (const [key, patternList] of Object.entries(generalIdPatterns)) {
    const value = extractInfo(text, patternList)
    if (value) {
      if (key in info) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(info as any)[key] = value
      } else {
        info.additionalInfo[key] = value
      }
    }
  }

  return info
}

