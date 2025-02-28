import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { logger } from "./logger"

const s3Client = new S3Client({ region: process.env.AWS_REGION })

export async function uploadToS3(
  userId: string,
  sessionId: string,
  docType: string,
  documentType: string,
  buffer: Buffer,
): Promise<string> {
  if (!sessionId || !sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    throw new Error("Valid UUID session ID is required for document upload")
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
    logger.error("Error uploading document to S3", error as Error)
    throw error
  }
}

