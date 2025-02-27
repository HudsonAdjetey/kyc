
export type Step = "preload" | "selfie" | "document" | "front" | "back" | "complete"

export interface VerificationStep {
  id: Step
  title: string
  description: string
  status: "pending" | "processing" | "complete"
}


export interface CaptureResult {
  imageData: string
  verified: boolean
  sessionId?: string
}

export interface VerificationSession {
  id: string
  status: "pending" | "completed" | "failed"
  steps: Record<VerificationStepId, boolean>
  documentId?: string
  createdAt: Date
  completedAt?: Date
}

export interface DocumentProcessingError extends Error {
  code: "NO_FACE_DETECTED" | "INVALID_DOCUMENT" | "EXTRACTION_FAILED"
  details?: Record<string, unknown>
}


export interface VerificationResponse {
  verified: boolean
  message: string
  sessionId?: string
  confidence?: number
}

export type VerificationStepId = "face" | "left" | "right" | "blink"


export type DocSide = "front" | "back"


export interface CaptureResult {
  imageData: string
  verified: boolean
}

export interface FaceDetectionResult {
  faceDetected: boolean
  multipleFaces: boolean
  facePositioning: { x: number; y: number; width: number; height: number }
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
  error: string | null
}






export interface VerificationRequest {
  frontImage: string
  backImage: string
  faceImage: string
}

export interface VerificationResponse {
  verified: boolean
  message: string
  documentDetails?: DocumentDetails
}

export interface DocumentDetails {
  type: string
  personalIdNumber: string
  name: string
  expiryDate?: string
  dateOfBirth?: string
  nationality?: string
}
