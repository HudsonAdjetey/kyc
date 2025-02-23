import { RekognitionClient, DetectTextCommand } from "@aws-sdk/client-rekognition"
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract"
import { logger } from "./logger"

const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION })
const textractClient = new TextractClient({ region: process.env.AWS_REGION })

export async function analyzeWithAWS(buffer: Buffer) {
  logger.info("Analyzing document with AWS")

  const [rekognitionResult, textractResult] = await Promise.all([
    analyzeWithRekognition(buffer),
    analyzeWithTextract(buffer),
  ])

  return {
    rekognition: rekognitionResult,
    textract: textractResult,
  }
}

async function analyzeWithRekognition(buffer: Buffer) {
  const command = new DetectTextCommand({
    Image: { Bytes: buffer },
  })
  const response = await rekognitionClient.send(command)
  return response.TextDetections
}

async function analyzeWithTextract(buffer: Buffer) {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: buffer },
    FeatureTypes: ["FORMS", "TABLES"],
  })
  const response = await textractClient.send(command)
  return response.Blocks
}

