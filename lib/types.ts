export type DocumentType = "GHANA_CARD" | "PASSPORT" | "DRIVERS_LICENSE" | "VOTER_ID" | "UNKNOWN"

export interface ExtractedFields {
  [key: string]: string
}

export interface ValidationResult {
  [key: string]: boolean
}

export interface ProcessingResult {
  detectedDocType: DocumentType
  extractedFields: ExtractedFields
  validationResult: ValidationResult
  additionalChecks: {
    ageVerified: boolean | null
  }
}

