import type { TextDetection } from "@aws-sdk/client-rekognition"
import type { Block } from "@aws-sdk/client-textract"
import { logger } from "./logger"
import type { DocumentType } from "./types"

export async function detectDocumentType(
  rekognitionResult: TextDetection[],
  textractResult: Block[],
  providedDocType: string,
): Promise<DocumentType> {
  logger.info("Detecting document type")

  const allText = [
    ...rekognitionResult.map((detection) => detection.DetectedText || ""),
    ...textractResult.map((block) => block.Text || ""),
  ]
    .join(" ")
    .toLowerCase()

  if (providedDocType === "front" || providedDocType === "back") {
    if (allText.includes("ghana") && allText.includes("card")) {
      return "GHANA_CARD"
    }
  }

  if (allText.includes("passport")) return "PASSPORT"
  if (allText.includes("driver") && allText.includes("license")) return "DRIVERS_LICENSE"
  if (allText.includes("voter") && allText.includes("id")) return "VOTER_ID"


  logger.warn("Unknown document type detected", { providedDocType })
  return "UNKNOWN"
}

