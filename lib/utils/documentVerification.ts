import {
  RekognitionClient,
  DetectTextCommand,
  CompareFacesCommand,
  DetectLabelsCommand,
  type DetectTextResponse,
  type CompareFacesResponse,
  type DetectLabelsResponse,
} from "@aws-sdk/client-rekognition"
import type { VerificationRequest, VerificationResponse, DocumentDetails } from "@/types/kyc"

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function verifyDocument(request: VerificationRequest): Promise<VerificationResponse> {
  const { frontImage, backImage, faceImage } = request

  const frontBuffer = Buffer.from(frontImage.replace(/^data:image\/\w+;base64,/, ""), "base64")
  const backBuffer = Buffer.from(backImage.replace(/^data:image\/\w+;base64,/, ""), "base64")
  const faceBuffer = Buffer.from(faceImage.replace(/^data:image\/\w+;base64,/, ""), "base64")

  // Check if the images are valid documents
  const isValidDocument = await validateDocumentImage(frontBuffer)
  if (!isValidDocument) {
    return { verified: false, message: "The provided image does not appear to be a valid document" }
  }

  const frontTextResponse = await detectText(frontBuffer)
  const backTextResponse = await detectText(backBuffer)

  if (!frontTextResponse.TextDetections?.length || !backTextResponse.TextDetections?.length) {
    return { verified: false, message: "No text detected on one or both sides of the document" }
  }

  const documentDetails = extractDocumentDetails(frontTextResponse.TextDetections, backTextResponse.TextDetections)

  if (!documentDetails.isValid) {
    return { verified: false, message: documentDetails.message }
  }

  const faceMatchResult = await compareFaces(frontBuffer, faceBuffer)

  if (!faceMatchResult.matched) {
    return { verified: false, message: "Face on the document doesn't match the provided face image" }
  }

  return {
    verified: true,
    message: "Document verified successfully",
    documentDetails: documentDetails.details,
  }
}

async function detectText(imageBuffer: Buffer): Promise<DetectTextResponse> {
  const detectTextCommand = new DetectTextCommand({
    Image: { Bytes: imageBuffer },
  })

  return await rekognition.send(detectTextCommand)
}

async function compareFaces(documentBuffer: Buffer, faceBuffer: Buffer): Promise<{ matched: boolean }> {
  const compareFacesCommand = new CompareFacesCommand({
    SourceImage: { Bytes: faceBuffer },
    TargetImage: { Bytes: documentBuffer },
    SimilarityThreshold: 90,
  })

  try {
    const response: CompareFacesResponse = await rekognition.send(compareFacesCommand)
    return { matched: (response.FaceMatches?.length ?? 0) > 0 }
  } catch (error) {
    console.log(error)
    return { matched: false }
  }
}

async function validateDocumentImage(imageBuffer: Buffer): Promise<boolean> {
  const detectLabelsCommand = new DetectLabelsCommand({
    Image: { Bytes: imageBuffer },
    MaxLabels: 10,
    MinConfidence: 70,
  })

  try {
    const response: DetectLabelsResponse = await rekognition.send(detectLabelsCommand)
    const validLabels = ['Id Cards', 'Driving License', 'Passport', 'Document']
    return response.Labels?.some(label => validLabels.includes(label.Name ?? '')) ?? false
  } catch (error) {
    console.log(error)
    return false
  }
}

function extractDocumentDetails(
  frontTextDetections: DetectTextResponse["TextDetections"],
  backTextDetections: DetectTextResponse["TextDetections"],
): { isValid: boolean; message: string; details?: DocumentDetails } {
  const frontText = frontTextDetections?.map((detection) => detection.DetectedText?.toLowerCase()).join(" ") ?? ""
  const backText = backTextDetections?.map((detection) => detection.DetectedText?.toLowerCase()).join(" ") ?? ""

  // Check if it's a Ghana Card
  if (frontText.includes("republic of ghana") && frontText.includes("ghana card")) {
    return extractGhanaCardDetails(frontText, backText)
  }

  // Generic ID card logic (can be expanded for other types)
  const documentType = "Generic ID"
  const personalIdMatch = frontText.match(/id\s*number:?\s*(\w+)/i) || backText.match(/id\s*number:?\s*(\w+)/i)
  const expiryDateMatch =
    frontText.match(/expir[y|es]?:?\s*(\d{2}[/-]\d{2}[/-]\d{4})/) ||
    backText.match(/expir[y|es]?:?\s*(\d{2}[/-]\d{2}[/-]\d{4})/)
  const nameMatch = frontText.match(/name:?\s*([a-z\s]+)/i) || backText.match(/name:?\s*([a-z\s]+)/i)

  if (!personalIdMatch || !expiryDateMatch || !nameMatch) {
    return { isValid: false, message: "Unable to extract all required information from the document" }
  }

  const expiryDate = new Date(expiryDateMatch[1])
  if (expiryDate < new Date()) {
    return { isValid: false, message: "Document has expired" }
  }

  return {
    isValid: true,
    message: "Document details extracted successfully",
    details: {
      type: documentType,
      personalIdNumber: personalIdMatch[1],
      expiryDate: expiryDate.toISOString(),
      name: nameMatch[1].trim(),
    },
  }
}

function extractGhanaCardDetails(
  frontText: string,
  backText: string,
): { isValid: boolean; message: string; details?: DocumentDetails } {
  const personalIdMatch = frontText.match(/gha-\d{9}-\d/)
  const nameMatch = frontText.match(/([a-z\s]+)\s*gha-/i)
  const dobMatch = backText.match(/dob:?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i)
  const nationalityMatch = backText.match(/nationality:?\s*(\w+)/i)

  if (!personalIdMatch || !nameMatch || !dobMatch || !nationalityMatch) {
    return { isValid: false, message: "Unable to extract all required information from the Ghana Card" }
  }

  // Ghana Cards don't have an expiry date, so we'll use the date of birth to calculate if the person is over 18
  const dob = new Date(dobMatch[1])
  const age = new Date().getFullYear() - dob.getFullYear()
  if (age < 18) {
    return { isValid: false, message: "Card holder is under 18 years old" }
  }

  return {
    isValid: true,
    message: "Ghana Card details extracted successfully",
    details: {
      type: "Ghana Card",
      personalIdNumber: personalIdMatch[0],
      name: nameMatch[1].trim(),
      dateOfBirth: dob.toISOString(),
      nationality: nationalityMatch[1],
    },
  }
}