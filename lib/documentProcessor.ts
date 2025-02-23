import { RekognitionClient, DetectTextCommand, type TextDetection } from "@aws-sdk/client-rekognition"
import { TextractClient, AnalyzeDocumentCommand, type Block } from "@aws-sdk/client-textract"
import { detectDocumentType } from "./documentClassifier"
import { extractRelevantFields } from "./fieldExtractor"
import type { DocumentType, ProcessingResult } from "./types"
import { logger } from "./logger"
import { validateDocument } from "./documetValidator"

const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION })
const textractClient = new TextractClient({ region: process.env.AWS_REGION })

export async function processDocument(
  buffer: Buffer,
  docType: DocumentType,
  country: string,
): Promise<ProcessingResult> {
  logger.info("Processing document", { docType, country })

  // Analyze the document using AWS services
  const [rekognitionResult, textractResult] = await Promise.all([
    analyzeWithRekognition(buffer),
    analyzeWithTextract(buffer),
  ])

  // Detect the document type
  const detectedDocType = await detectDocumentType(rekognitionResult, textractResult, docType)

  const extractedFields =  extractRelevantFields(detectedDocType, rekognitionResult, textractResult, country)

  const validationResult =  validateDocument(detectedDocType, extractedFields, country)

  const additionalChecks = await  performAdditionalChecks(extractedFields)

  logger.info("Document processing completed", { detectedDocType })

  return {
    detectedDocType,
    extractedFields,
    validationResult,
    additionalChecks,
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

