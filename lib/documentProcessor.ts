import {
  RekognitionClient,
  DetectTextCommand,
  DetectFacesCommand,
  type TextDetection,
} from "@aws-sdk/client-rekognition"
import { TextractClient, AnalyzeDocumentCommand, type Block } from "@aws-sdk/client-textract"
import { extractRelevantFields } from "./fieldExtractor"
import { logger } from "./logger"
import type {  DocumentType,   } from "./types"
import { DocSide, DocumentProcessingError } from "@/types/kyc"
import { validateDocument } from "./documetValidator"

const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION })
const textractClient = new TextractClient({ region: process.env.AWS_REGION })

export async function processDocument(
  buffer: Buffer,
  docSide: DocSide,
  documentType: DocumentType,
  country: string,
){
  logger.info("Processing document", { docSide, documentType, country })

  try {
    // Convert base64 to buffer

    // For front side, check for face first
    if (docSide === "front") {
      const hasFace = await detectFace(buffer)
      if (!hasFace) {
        const error = new Error("No face detected on front side of document") as DocumentProcessingError
        error.code = "NO_FACE_DETECTED"
        throw error
      }
    }

    // Analyze the document using AWS services
    const [rekognitionResult, textractResult] = await Promise.all([
      analyzeWithRekognition(buffer),
      analyzeWithTextract(buffer),
    ])

    // Extract relevant fields based on the document type and side
    const extractedFields = await extractRelevantFields(
      documentType,
      rekognitionResult,
      textractResult,
      country
    )

    // Validate the extracted information
    const validationResult = await validateDocument(documentType, extractedFields , country)

    // Check if required fields are present based on document type and side
    validateRequiredFields(documentType, docSide, extractedFields)

    // Perform additional checks (e.g., age verification)
    const additionalChecks = await performAdditionalChecks(extractedFields)

    logger.info("Document processing completed", { documentType, docSide })

    return {
      hasFace: docSide === "front" ? true : undefined,
      extractedFields,
      validationResult,
      additionalChecks,
    }
  } catch (error) {
    logger.error("Error processing document", error as Error)

    // Convert generic errors to DocumentProcessingError
    if (!(error as DocumentProcessingError).code) {
      const processingError = error as DocumentProcessingError
      processingError.code = "EXTRACTION_FAILED"
      processingError.details = {
        documentType,
        docSide,
        originalError: (error as Error).message,
      }
      throw processingError
    }
    throw error
  }
}

function validateRequiredFields(documentType: DocumentType, docSide: DocSide, fields: Record<string, string>): void {
  const requiredFields: Record<DocumentType, Record<DocSide, string[]>> = {
    GHANA_CARD: {
      front: ["cardNumber", "fullName",],
      back: ["dateOfExpiry", "dateOfIssue"],
    },
    PASSPORT: {
      front: ["passportNumber", "fullName", "dateOfBirth"],
      back: ["dateOfExpiry"],
    },
    DRIVERS_LICENSE: {
      front: ["licenseNumber", "fullName", "dateOfBirth"],
      back: ["dateOfExpiry"],
    },
    VOTER_ID: {
      front: ["voterIdNumber", "fullName"],
      back: ["pollingStation"],
    },
    "UNKNOWN": {
      front: [],
      back: [],
    }
  }

  const required = requiredFields[documentType][docSide]
  const missing = required.filter((field) => !fields[field])

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`) as DocumentProcessingError
    error.code = "EXTRACTION_FAILED"
    error.details = { missing, documentType, docSide }
    throw error
  }
}

async function detectFace(buffer: Buffer): Promise<boolean> {
  try {
    const command = new DetectFacesCommand({
      Image: { Bytes: buffer },
      Attributes: ["DEFAULT"],
    })
    const response = await rekognitionClient.send(command)
    return (response.FaceDetails?.length ?? 0) > 0
  } catch (error) {
    logger.error("Error detecting face", error as Error)
    return false
  }
}

async function analyzeWithRekognition(buffer: Buffer): Promise<TextDetection[]> {
  const command = new DetectTextCommand({
    Image: { Bytes: buffer },
  })
  const response = await rekognitionClient.send(command)
  return response.TextDetections || []
}

async function analyzeWithTextract(buffer: Buffer): Promise<Block[]> {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: buffer },
    FeatureTypes: ["FORMS", "TABLES"],
  })
  const response = await textractClient.send(command)
  return response.Blocks || []
}

async function performAdditionalChecks(fields: Record<string, string>): Promise<{ ageVerified: boolean | null }> {
  return {
    ageVerified: fields.dateOfBirth ? isOverEighteen(fields.dateOfBirth) : null,
  }
}

function isOverEighteen(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age >= 18
}

