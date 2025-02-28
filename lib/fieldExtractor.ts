import type { TextDetection } from "@aws-sdk/client-rekognition"
import type { Block } from "@aws-sdk/client-textract"
import { logger } from "./logger"
import type { DocumentType, ExtractedFields } from "./types"

export  function extractRelevantFields(
  documentType: DocumentType,
  rekognitionResult: TextDetection[],
  textractResult: Block[],
  country: string,
): ExtractedFields {
  logger.info("Extracting relevant fields", { documentType, country })

  const fields: ExtractedFields = {}

  switch (documentType) {
    case "GHANA_CARD":
      fields.cardNumber = extractGhanaCardNumber(rekognitionResult, textractResult)
      fields.fullName = extractFullName(rekognitionResult, textractResult)
      fields.dateOfBirth = extractDateOfBirth(rekognitionResult, textractResult)
      fields.dateOfIssue = extractDateOfIssue(rekognitionResult, textractResult)
      fields.dateOfExpiry = extractDateOfExpiry(rekognitionResult, textractResult)
      fields.nationality = extractNationality(rekognitionResult, textractResult)
      fields.gender = extractGender(rekognitionResult, textractResult)
      break
    case "PASSPORT":
      fields.passportNumber = extractPassportNumber(rekognitionResult, textractResult)
      fields.fullName = extractFullName(rekognitionResult, textractResult)
      fields.dateOfBirth = extractDateOfBirth(rekognitionResult, textractResult)
      fields.dateOfExpiry = extractDateOfExpiry(rekognitionResult, textractResult)
      fields.nationality = extractNationality(rekognitionResult, textractResult)
      break
    case "DRIVERS_LICENSE":
      fields.licenseNumber = extractLicenseNumber(rekognitionResult, textractResult)
      fields.fullName = extractFullName(rekognitionResult, textractResult)
      fields.dateOfBirth = extractDateOfBirth(rekognitionResult, textractResult)
      fields.dateOfExpiry = extractDateOfExpiry(rekognitionResult, textractResult)
      fields.address = extractAddress(rekognitionResult, textractResult)
      break
    case "VOTER_ID":
      fields.voterIdNumber = extractVoterIdNumber(rekognitionResult, textractResult)
      fields.fullName = extractFullName(rekognitionResult, textractResult)
      fields.dateOfBirth = extractDateOfBirth(rekognitionResult, textractResult)
      fields.pollingStation = extractPollingStation(rekognitionResult, textractResult)
      break
    default:
      fields.extractedText = extractAllText(rekognitionResult, textractResult)
  }

  return fields
}

function extractGhanaCardNumber(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement Ghana Card number extraction logic
  const allText = extractAllText(rekognitionResult, textractResult)
  const match = allText.match(/GHA-\d{9}-\d/)
  return match ? match[0] : ""
}

function extractFullName(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement full name extraction logic
   const nameLabels = ["name:", "full name:", "surname:", "given names:", "firstnames", "firstnames/prenoms", "Firstnames/Prenoms", "Surname/Nom"]

  return extractFieldByLabels(textractResult, nameLabels)
}

function extractDateOfBirth(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  const dobLabels = ["date of birth:", "dob:", "Date of Birth/Date de Naisasance"]
  return extractFieldByLabels(textractResult, dobLabels)
}

function extractDateOfIssue(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement date of issue extraction logic
  const issueDateLabels = ["date of issue:", "issued on:"]
  return extractFieldByLabels(textractResult, issueDateLabels)
}

function extractDateOfExpiry(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  const expiryDateLabels = ["date of expiry:", "expiry date:"]
  return extractFieldByLabels(textractResult, expiryDateLabels)
}

function extractNationality(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement nationality extraction logic
  const nationalityLabels = ["nationality:"]
  return extractFieldByLabels(textractResult, nationalityLabels)
}

function extractGender(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement gender extraction logic
  const genderLabels = ["sex:", "gender:"]
  return extractFieldByLabels(textractResult, genderLabels)
}

function extractPassportNumber(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement passport number extraction logic
  const passportLabels = ["passport no:", "document no:"]
  return extractFieldByLabels(textractResult, passportLabels)
}

function extractLicenseNumber(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement license number extraction logic
  const licenseLabels = ["license no:", "licence no:"]
  return extractFieldByLabels(textractResult, licenseLabels)
}

function extractAddress(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement address extraction logic
  const addressLabels = ["address:"]
  return extractFieldByLabels(textractResult, addressLabels)
}

function extractVoterIdNumber(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement voter ID number extraction logic
  const voterIdLabels = ["voter id:", "id number:"]
  return extractFieldByLabels(textractResult, voterIdLabels)
}

function extractPollingStation(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  // Implement polling station extraction logic
  const pollingStationLabels = ["polling station:", "voting center:"]
  return extractFieldByLabels(textractResult, pollingStationLabels)
}

function extractFieldByLabels(textractResult: Block[], labels: string[]): string {
  for (const block of textractResult) {
    if (block.BlockType === "LINE" && block.Text) {
      const lowerText = block.Text.toLowerCase()
      for (const label of labels) {
        if (lowerText.startsWith(label)) {
          return block.Text.substring(label.length).trim()
        }
      }
    }
  }
  return ""
}

function extractAllText(rekognitionResult: TextDetection[], textractResult: Block[]): string {
  return [
    ...rekognitionResult.map((detection) => detection.DetectedText || ""),
    ...textractResult.map((block) => block.Text || ""),
  ].join(" ")
}

