 type Step = "preload" | "selfie" | "document" | "front" | "back" | "complete"

 interface VerificationStep {
  id: Step
  title: string
  description: string
  status: "pending" | "processing" | "complete"
}

 interface FaceDetectionCaseType {
  faceDetected: boolean
  multipleFaces: boolean
  facePositioning: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  faceAngle: number
  centerFaceValid: boolean
  leftFaceValid: boolean
  rightFaceValid: boolean
  eyesOpen: boolean
  blinkConfidence: number
  faceWithinValidArea: boolean
  horizontalOffsetPercentage: number
  verticalOffsetPercentage: number
  faceAngleValid: boolean
}

 interface ExtractedCardInfo {
  cardType: string
  isFront: boolean
  isBack: boolean
  idNumber?: string
  surname?: string
  givenNames?: string
  dateOfBirth?: string
  placeOfBirth?: string
  nationality?: string
  dateOfIssue?: string
  dateOfExpiry?: string
  personalIdNumber?: string
  policyNumber?: string
  licenseNumber?: string
  additionalInfo: Record<string, string>
}

 interface FaceValidationResult {
  isValid: boolean
  message: string
}

 interface DetectedTextItem {
  DetectedText: string
  Type: string
  Id: number
  ParentId?: number
  Confidence: number
  Geometry: {
    BoundingBox: {
      Width: number
      Height: number
      Left: number
      Top: number
    }
    Polygon: Array<{ X: number; Y: number }>
  }
}

 interface DocumentValidationResult {
  isValid: boolean
  confidence: number
  errors: string[]
  extractedData: ExtractedCardInfo
  rawText: string
}

