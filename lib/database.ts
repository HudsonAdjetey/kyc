import { logger } from "./logger"
import type { ProcessingResult } from "./types"

interface DocumentRecord {
  id: string
  userId: string
  docType: string
  country: string
  s3Key: string
  status: "PENDING" | "COMPLETED" | "ERROR"
  result?: ProcessingResult
  createdAt: Date
}

// This is a simple in-memory database for demonstration purposes
// In a real application, you would use a proper database like PostgreSQL or MongoDB
const documents: Record<string, DocumentRecord> = {}

export async function createDocumentRecord(data: Omit<DocumentRecord, "id" | "createdAt">): Promise<DocumentRecord> {
  const id = generateId()
  const document: DocumentRecord = { id, ...data, createdAt: new Date() }
  documents[id] = document
  logger.info("Document record created", { id })
  return document
}

export async function getDocumentStatus(id: string): Promise<DocumentRecord | null> {
  const document = documents[id]
  if (!document) {
    logger.warn("Document not found", { id })
    return null
  }
  return document
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

