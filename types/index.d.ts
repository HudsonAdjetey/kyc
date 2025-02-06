interface FormInfo {
  name: string;
  email: string;
  phoneNumber: string;
}

type Step = "preload" | "selfie" | "document" | "front" | "back" | "complete";

interface VerificationStep {
  id: Step;
  title: string;
  description: string;
  status: "pending" | "processing" | "complete" | "failed";
}

interface FaceDetectionCaseType {
faceDetected: boolean
  multipleFaces: boolean
  facePositioning?: {
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

interface ValidationResult {
  confidence: number;
  errors?: string[];
  isValid: boolean;
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
  additionalInfo: Record<string, string>
}