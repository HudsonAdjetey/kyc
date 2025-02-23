import { type NextRequest, NextResponse } from "next/server"
import { processDocument } from "@/lib/documentProcessor"
import { uploadToS3, checkExistingDocument } from "@/lib/s3"
import { createDocumentRecord, getDocumentStatus } from "@/lib/database"
import { logger } from "@/lib/logger"
import { validateRequest } from "@/lib/validation"
import type { DocumentType } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json()
    const { image, userId, docType, country } = await validateRequest(formData)

    logger.info("Received document upload request", { userId, docType, country })

    // Check if user has already uploaded this document type
    const existingDocument = await checkExistingDocument(userId, docType)
    if (existingDocument) {
      return NextResponse.json(
        {
          error: `A ${docType} document has already been uploaded for this user. Please contact support for any changes.`,
        },
        { status: 400 },
      )
    }

    // Upload file to S3
    const base64Data = image.split(",")[1]
    
    const buffer = Buffer.from(base64Data, "base64")
    let s3Key = ""

    // Process the document
    const processingResult = await processDocument(buffer, docType as DocumentType, country)

    if (processingResult) {
      s3Key = await uploadToS3(userId, docType, buffer)
    }
    // Create a document record in the database
    const document = await createDocumentRecord({
      userId,
      docType,
      country,
      s3Key,
      status: "COMPLETED",
      result: processingResult,
    })

    logger.info("Document processed successfully", { documentId: document.id })

    return NextResponse.json({
      message: "Document uploaded and processed successfully",
      documentId: document.id,
      result: processingResult,
    })
  } catch (error) {
    logger.error("Error processing document", error as Error)
    return NextResponse.json(
      {
        error: (error as Error).message || "An error occurred while processing the document",
        errorDetails: process.env.NODE_ENV === "development" ? (error as Error).stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 })
    }

    const document = await getDocumentStatus(documentId)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    logger.error("Error retrieving document status", error as Error)
    return NextResponse.json(
      {
        error: (error as Error).message || "An error occurred while retrieving the document status",
        errorDetails: process.env.NODE_ENV === "development" ? (error as Error).stack : undefined,
      },
      { status: 500 },
    )
  }
}

