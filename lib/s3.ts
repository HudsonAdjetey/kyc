import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { logger } from "./logger"

const s3Client = new S3Client({ region: process.env.AWS_REGION })

export async function uploadToS3(
  userId: string,
  sessionId: string,
  docType: string,
  documentType: string,
  buffer: Buffer,
): Promise<string> {
  if (!sessionId) {
    throw new Error("Session ID is required for document upload")
  }

  const filename = `document-${Date.now()}.jpg`
  const key = `${userId}/${sessionId}/${documentType}/${docType}/${filename}`

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
      }),
    )

    logger.info("Document uploaded to S3", { userId, sessionId, docType, documentType, key })
    return key
  } catch (error) {
    logger.error("Error uploading document to S3", 
      error as Error,
 
    )
    throw error
  }
}

export async function checkExistingDocument(
  userId: string,
  sessionId: string,
  docType: string,
  documentType: string,
): Promise<boolean> {  const prefix = `${userId}/${sessionId}/${documentType}/${docType}/`

  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${prefix}document-latest.jpg`,
    })

    await s3Client.send(command)
    return true
  } catch (error: unknown) {
    if ((error as { name?: string }).name === "NotFound") {
      return false
    }
    logger.error("Error checking existing document", error as Error)
    throw error
  }
}

