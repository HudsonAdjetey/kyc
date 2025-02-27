import { DocSide } from "@/types/kyc";
import { DocumentType } from "./types";

interface ValidationResult {
  image: string
  userId: string
  docType: string
  country: string
  documentType: DocumentType

}

export async function validateRequest(formData: {
  image: string,
  userId: string;
    docType: DocSide
  documentType: DocumentType
  country: string

}): Promise<ValidationResult> {
  const image = formData.image
  const userId = formData.userId
  const docType = formData.docType
  const country = formData.country
  const documentType = formData.documentType as DocumentType


  if (!image) {
    throw new Error("File is required")
  }

  if (!userId) {
    throw new Error("User ID is required")
  }

  if (!documentType) {
    throw new Error("Document type is required")
  }
  
  if (!docType || !["front", "back"].includes(docType)) {
    throw new Error("Valid document side (front/back) is required")
  }


  if (!country) {
    throw new Error("Country is required")
  }

  return { image, userId, docType, country, documentType }
}





