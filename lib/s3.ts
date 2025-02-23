import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { logger } from "./logger"

const s3Client = new S3Client({ region: process.env.AWS_REGION })

export async function uploadToS3(userId: string, docType: string, buffer: Buffer): Promise<string> {
  const key = `${userId}/${docType}/document-${docType}.jpg`

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
      }),
    )

    logger.info("Document uploaded to S3", { userId, docType })
    return key
  } catch (error) {
    logger.error("Error uploading document to S3", error as Error)
    throw error
  }
}

export async function checkExistingDocument(userId: string, docType: string): Promise<boolean> {
  const key = `${userId}/${docType}/document-${docType}.jpg`

  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      }),
    )
    return true
  } catch (error: unknown) {
    if ((error as { name?: string }).name === "NotFound") {
      return false
    }
    logger.error("Error checking existing document", error as Error)
    throw error
  }
}

