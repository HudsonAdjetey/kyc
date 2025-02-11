import { type NextRequest, NextResponse } from "next/server"
import {
  RekognitionClient,
  DetectTextCommand,
  DetectFacesCommand,
  CompareFacesCommand,
  type FaceDetail,
  QualityFilter,
} from "@aws-sdk/client-rekognition"

// Configuration constants
const CONFIG = {
  SIMILARITY_THRESHOLD: 80,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  SUPPORTED_ID_TYPES: ["passport", "driverLicense", "nationalId"] as const,
  VALIDATION_PATTERNS: {
    ID_NUMBER: /\b[A-Z0-9]{6,12}\b/,
    NAME: /(?:Name|Surname|Given Names?)\s*:\s*([A-Z\s]+)/i,
    DOB: /(?:DOB|Date of Birth)\s*:\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
    EXPIRY: /(?:Expiry|Valid Until)\s*:\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
    ADDRESS: /(?:Address|Residence)\s*:\s*([^\n]+)/i,
    NATIONALITY: /(?:Nationality|Country)\s*:\s*([A-Z\s]+)/i,
    GENDER: /(?:Gender|Sex)\s*:\s*([MF]|Male|Female)/i,
  },
  ID_SPECIFIC_PATTERNS: {
    passport: [/PASSPORT/i, /NATIONALITY/i, /PASSPORT\s*NO/i],
    driverLicense: [/DRIVER'?S?\s*LICEN[CS]E/i, /VEHICLE/i],
    nationalId: [/NATIONAL\s*ID/i, /IDENTITY/i],
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY: 1000,
    MAX_DELAY: 5000,
  },
} as const

// Type definitions
type IDType = (typeof CONFIG.SUPPORTED_ID_TYPES)[number]

interface TextDetectionResult {
  rawText: string[]
  structuredText: {
    lines: string[]
    words: string[]
  }
  detectedFields: {
    idNumber?: string
    name?: string
    dateOfBirth?: string
    expiryDate?: string
    address?: string
    nationality?: string
    gender?: string
    [key: string]: string | undefined
  }
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  extractedFields: Record<string, string>
}

interface FaceDetectionResult {
  faceDetected: boolean
  faceDetails: FaceDetail | null
  quality: {
    brightness: number | undefined
    sharpness: number | undefined
    isGoodQuality: boolean
  }
}

// Initialize Rekognition client
const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  maxAttempts: CONFIG.RETRY.MAX_ATTEMPTS,
  retryMode: "standard",
})

async function executeWithErrorHandling<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`Error in ${operationName}:`, {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    })

    if (error instanceof Error && error.name === "InvalidSignatureException") {
      console.error("Time synchronization error detected. Please check system clock.")
      throw new Error("Server time is out of sync. Please try again later.")
    }

    throw error
  }
}

function isValidBase64(base64String: string): boolean {
  try {
    const [header, content] = base64String.split(",")
    return header.includes("data:image") && header.includes("base64") && Buffer.from(content, "base64").length > 0
  } catch {
    return false
  }
}

async function detectText(imageBuffer: Buffer): Promise<TextDetectionResult> {
  return executeWithErrorHandling(async () => {
    const command = new DetectTextCommand({
      Image: { Bytes: imageBuffer },
    })
    const response = await rekognition.send(command)
    
    // Separate lines and words based on TextDetection type
    const lines = response.TextDetections?.filter(text => text.Type === 'LINE').map(text => text.DetectedText || '') || []
    const words = response.TextDetections?.filter(text => text.Type === 'WORD').map(text => text.DetectedText || '') || []
    
    // Get raw text (all detected text combined)
    const rawText = response.TextDetections?.map(text => text.DetectedText || '') || []

    // Extract structured fields using patterns
    const fullText = lines.join(' ')
    const detectedFields: TextDetectionResult['detectedFields'] = {}

    // Extract fields using validation patterns
    Object.entries(CONFIG.VALIDATION_PATTERNS).forEach(([key, pattern]) => {
      const match = fullText.match(pattern)
      if (match) {
        const fieldKey = key.charAt(0).toLowerCase() + key.slice(1)
        detectedFields[fieldKey] = match[1] ? match[1].trim() : match[0].trim()
      }
    })

    return {
      rawText,
      structuredText: {
        lines,
        words,
      },
      detectedFields,
    }
  }, "detectText")
}

async function detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult> {
  return executeWithErrorHandling(async () => {
    const command = new DetectFacesCommand({
      Image: { Bytes: imageBuffer },
      Attributes: ["ALL"],
    })

    const response = await rekognition.send(command)
    const faceDetails = response.FaceDetails?.[0] ?? null

    return {
      faceDetected: !!faceDetails,
      faceDetails,
      quality: {
        brightness: faceDetails?.Quality?.Brightness,
        sharpness: faceDetails?.Quality?.Sharpness,
        isGoodQuality: (faceDetails?.Quality?.Brightness || 0) > 80 && (faceDetails?.Quality?.Sharpness || 0) > 80,
      },
    }
  }, "detectFaces")
}

async function compareFaces(
  sourceImage: Buffer,
  targetImage: Buffer,
): Promise<{ match: boolean; similarity: number | null }> {
  return executeWithErrorHandling(async () => {
    const command = new CompareFacesCommand({
      SourceImage: { Bytes: sourceImage },
      TargetImage: { Bytes: targetImage },
      SimilarityThreshold: CONFIG.SIMILARITY_THRESHOLD,
      QualityFilter: QualityFilter.HIGH,
    })

    const response = await rekognition.send(command)
    const frontFaceMatch = response.FaceMatches?.find(
      (match) => match.Face?.Pose?.Yaw !== undefined && Math.abs(match.Face.Pose.Yaw) < 30,
    )

    return {
      match: !!frontFaceMatch,
      similarity: frontFaceMatch?.Similarity ?? null,
    }
  }, "compareFaces")
}

function validateID(idType: IDType, textDetectionResult: TextDetectionResult): ValidationResult {
  const fullText = textDetectionResult.rawText.join(" ")
  const errors: string[] = []
  const extractedFields = textDetectionResult.detectedFields

  // Check for ID type-specific patterns
  const typePatterns = CONFIG.ID_SPECIFIC_PATTERNS[idType]
  const hasRequiredPatterns = typePatterns.every((pattern) => pattern.test(fullText))

  if (!hasRequiredPatterns) {
    errors.push(`Document does not appear to be a valid ${idType}`)
  }

  // Required fields validation
  const requiredFields = ['idNumber', 'name', 'dateOfBirth']
  requiredFields.forEach(field => {
    if (!extractedFields[field]) {
      errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} not found or invalid format`)
    }
  })

  // ID type-specific validation
  switch (idType) {
    case 'passport':
      if (!extractedFields.nationality) {
        errors.push('Nationality not found')
      }
      break
    case 'driverLicense':
      if (!extractedFields.expiryDate) {
        errors.push('License expiry date not found')
      }
      break
    case 'nationalId':
      if (!extractedFields.address) {
        errors.push('Address not found')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    extractedFields: extractedFields as Record<string, string>,
  }
}

export async function POST(request: NextRequest) {
  const headers = new Headers({
    "Content-Security-Policy": "default-src 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
  })

  try {
    const { idImage, selfieImage, idType, stage } = await request.json()

    // Input validation
    if (!idImage || !idType || !stage || (stage === "front" && !selfieImage)) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: {
            idImage: !idImage,
            selfieImage: stage === "front" && !selfieImage,
            idType: !idType,
            stage: !stage,
          },
        },
        { status: 400, headers },
      )
    }

    if (!["front", "back"].includes(stage)) {
      return NextResponse.json({ error: "Invalid stage", supportedStages: ["front", "back"] }, { status: 400, headers })
    }

    if (!CONFIG.SUPPORTED_ID_TYPES.includes(idType)) {
      return NextResponse.json(
        { error: "Unsupported ID type", supportedTypes: CONFIG.SUPPORTED_ID_TYPES },
        { status: 400, headers },
      )
    }

    if (!isValidBase64(idImage) || (stage === "front" && !isValidBase64(selfieImage))) {
      return NextResponse.json(
        { error: "Invalid image format", details: "Base64 encoded images required" },
        { status: 400, headers },
      )
    }

    const idImageBuffer = Buffer.from(idImage.split(",")[1], "base64")
    const selfieImageBuffer = stage === "front" ? Buffer.from(selfieImage.split(",")[1], "base64") : null

    if (
      idImageBuffer.length > CONFIG.MAX_IMAGE_SIZE ||
      (selfieImageBuffer && selfieImageBuffer.length > CONFIG.MAX_IMAGE_SIZE)
    ) {
      return NextResponse.json(
        {
          error: "Image size exceeds limit",
          details: {
            maxSize: `${CONFIG.MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
            idImageSize: `${(idImageBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
            selfieImageSize: selfieImageBuffer ? `${(selfieImageBuffer.length / (1024 * 1024)).toFixed(2)}MB` : "N/A",
          },
        },
        { status: 400, headers },
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any = { success: true, stage }

    if (stage === "front") {
      const [faceDetectionResult, faceComparisonResult] = await Promise.all([
        detectFaces(idImageBuffer),
        compareFaces(idImageBuffer, selfieImageBuffer!),
      ])

      response = {
        ...response,
        faceDetected: faceDetectionResult.faceDetected,
        faceDetails: faceDetectionResult.faceDetails,
        faceQuality: faceDetectionResult.quality,
        faceMatch: faceComparisonResult.match,
        similarity: faceComparisonResult.similarity,
      }
    } else {
      // stage === 'back'
      const textDetectionResult = await detectText(idImageBuffer)
      const validationResult = validateID(idType as IDType, textDetectionResult)

      response = {
        ...response,
        textDetection: {
          raw: textDetectionResult.rawText,
          structured: textDetectionResult.structuredText,
          extractedFields: textDetectionResult.detectedFields,
        },
        validation: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
        }
      }
    }

    return NextResponse.json(response, { headers })
  } catch (error) {
    console.error("ID verification error:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    })

    let statusCode = 500
    let errorMessage = "ID verification failed"

    if (error instanceof Error && error.message === "Server time is out of sync. Please try again later.") {
      statusCode = 503 // Service Unavailable
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.name : "Unknown",
        timestamp: new Date().toISOString(),
      },
      { status: statusCode, headers },
    )
  }
}