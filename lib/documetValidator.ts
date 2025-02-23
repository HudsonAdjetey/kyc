import { logger } from "./logger"
import { DocumentType, ExtractedFields, ValidationResult } from "./types"

export function validateDocument(
  documentType: DocumentType,
  fields: ExtractedFields,
  country: string,
): ValidationResult {
  logger.info("Validating document", { documentType, country })

  const validationResults: ValidationResult = {}

  switch (documentType) {
    case "GHANA_CARD":
      validationResults.cardNumber = validateGhanaCardNumber(fields.cardNumber)
      validationResults.fullName = validateFullName(fields.fullName)
      validationResults.dateOfBirth = validateDate(fields.dateOfBirth)
      validationResults.dateOfIssue = validateDate(fields.dateOfIssue)
      validationResults.dateOfExpiry = validateDate(fields.dateOfExpiry)
      validationResults.nationality = validateNationality(fields.nationality)
      validationResults.gender = validateGender(fields.gender)
      break
    case "PASSPORT":
      validationResults.passportNumber = validatePassportNumber(fields.passportNumber)
      validationResults.fullName = validateFullName(fields.fullName)
      validationResults.dateOfBirth = validateDate(fields.dateOfBirth)
      validationResults.dateOfExpiry = validateDate(fields.dateOfExpiry)
      validationResults.nationality = validateNationality(fields.nationality)
      break
    case "DRIVERS_LICENSE":
      validationResults.licenseNumber = validateLicenseNumber(fields.licenseNumber)
      validationResults.fullName = validateFullName(fields.fullName)
      validationResults.dateOfBirth = validateDate(fields.dateOfBirth)
      validationResults.dateOfExpiry = validateDate(fields.dateOfExpiry)
      validationResults.address = validateAddress(fields.address)
      break
    case "VOTER_ID":
      validationResults.voterIdNumber = validateVoterIdNumber(fields.voterIdNumber)
      validationResults.fullName = validateFullName(fields.fullName)
      validationResults.dateOfBirth = validateDate(fields.dateOfBirth)
      validationResults.pollingStation = validatePollingStation(fields.pollingStation)
      break
    default:
      logger.warn("Unknown document type, skipping validation", { documentType })
  }

  return validationResults
}

function validateGhanaCardNumber(cardNumber: string): boolean {
  // Implement Ghana Card number validation logic
  return /^GHA-\d{9}-\d$/.test(cardNumber)
}

function validateFullName(fullName: string): boolean {
  // Implement full name validation logic
  return fullName.length > 3 && fullName.includes(" ")
}

function validateDate(date: string): boolean {
  // Implement date validation logic
  return !isNaN(Date.parse(date))
}

function validateNationality(nationality: string): boolean {
  // Implement nationality validation logic
  return nationality.length > 2
}

function validateGender(gender: string): boolean {
  // Implement gender validation logic
  const validGenders = ["male", "female", "m", "f"]
  return validGenders.includes(gender.toLowerCase())
}

function validatePassportNumber(passportNumber: string): boolean {
  // Implement passport number validation logic
  return /^[A-Z]\d{8}$/.test(passportNumber)
}

function validateLicenseNumber(licenseNumber: string): boolean {
  // Implement license number validation logic
  return /^\d{6}-\d{2}-\d{6}$/.test(licenseNumber) 
}

function validateAddress(address: string): boolean {
  // Implement address validation logic
  return address.length > 10
}

function validateVoterIdNumber(voterIdNumber: string): boolean {
  // Implement voter ID number validation logic
  return /^\d{10}$/.test(voterIdNumber) 
}

function validatePollingStation(pollingStation: string): boolean {
  // Implement polling station validation logic
  return pollingStation.length > 5
}

