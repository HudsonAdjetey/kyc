interface ValidationResult {
  image: string
  userId: string
  docType: string
  country: string
}

export async function validateRequest(formData: {
  image: string,
  userId: string;
  docType: string;
  country: string;
}): Promise<ValidationResult> {
  const image = formData.image
  const userId = formData.userId
  const docType = formData.docType
  const country = formData.country


  if (!image) {
    throw new Error("File is required")
  }

  if (!userId) {
    throw new Error("User ID is required")
  }

  if (!docType) {
    throw new Error("Document type is required")
  }

  if (!country) {
    throw new Error("Country is required")
  }

  return { image, userId, docType, country }
}

