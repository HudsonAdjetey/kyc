import { type NextRequest, NextResponse } from "next/server"
import { processDocument } from "@/lib/documentProcessor"
import { uploadToS3 } from "@/lib/s3"
import { logger } from "@/lib/logger"
import { validateRequest } from "@/lib/validation"
import { DocumentService } from "@/lib/services/doumentService"
import type { DocumentProcessingError } from "@/types/kyc"
import { getIronSession } from "iron-session"

// Session configuration
const sessionOptions = {
  password: process.env.SESSION_PASSWORD || "complex_password_at_least_32_characters_long",
  cookieName: "selfie_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
}

// Session type
type SessionData = {
  userId?: string
  sessionId?: string
  isLoggedIn?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const res = new NextResponse()

    const session = await getIronSession<SessionData>(request, res, sessionOptions)

    if (!session.userId || !session.sessionId || !session.isLoggedIn) {
      
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session. Please complete user verification first.",
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { userId, docType, country, image, documentType } = await validateRequest(body)
    if (!session.sessionId) {

 
      return NextResponse.json(
        {
          success: false,
          error: "User ID mismatch with session",
        },
        { status: 403 },
      )
    }

    logger.info("Received document upload request", { userId, docType, country, sessionId: session.sessionId })

    const user = await DocumentService.findByUserId(userId)
    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 },
      )
    }

    const documentStatus = await DocumentService.checkDocumentStatus(userId, documentType as "front" | "back")

    if (documentStatus.isComplete) {
      return NextResponse.json(
        {
          error: "Document verification already completed",
          redirect: "/kyc/success",
        },
        { status: 400 },
      )
    }

    if ((docType === "front" && documentStatus.hasFront) || (docType === "back" && documentStatus.hasBack)) {
      return NextResponse.json(
        {
          error: `The ${docType} side of this document has already been uploaded`,
          status: documentStatus.status,
        },
        { status: 400 },
      )
    }

    // Process the document
    const base64Data = image.split(",")[1]
    const buffer = Buffer.from(base64Data, "base64")
    let s3Key = ""

    try {
      const processingResult = await processDocument(buffer, docType as "front" | "back", documentType, country)

      if (!processingResult) {
        return NextResponse.json(
          {
            error: "Failed to process document",
          },
          { status: 400 },
        )
      }

      s3Key = await uploadToS3(userId, session.sessionId, docType, documentType, buffer)

      const document = await DocumentService.createOrUpdateDocument(
        userId,
        documentType,
        docType as "front" | "back",
        s3Key,
        processingResult.extractedFields,
      )

      const updatedStatus = await DocumentService.checkDocumentStatus(userId, docType as "front" | "back")
      const redirect = updatedStatus.isComplete ? "/kyc/success" : undefined

      logger.info("Document processed and stored successfully", {
        userId,
        sessionId: session.sessionId,
        documentId: document._id,
        documentType,
        docType,
      })

      const finalResponse = NextResponse.json({
        message: "Document uploaded and processed successfully",
        documentId: document._id,
        status: document.verificationStatus,
        extractedFields: processingResult.extractedFields,
        redirect,
        success: true
      })

      res.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          finalResponse.headers.set(key, value)
        }
      })

      return finalResponse
    } catch (processingError) {
      const error = processingError as DocumentProcessingError
      let errorMessage = "Document processing failed"
      const statusCode = 400

      switch (error.code) {
        case "NO_FACE_DETECTED":
          errorMessage =
            "No face detected on the front side of the document. Please ensure the front side shows a clear photo ID."
          break
        case "INVALID_DOCUMENT":
          errorMessage =
            "The uploaded document appears to be invalid. Please ensure you're uploading the correct document type."
          break
        case "EXTRACTION_FAILED":
          errorMessage =
            "Failed to extract information from the document. Please ensure the image is clear and well-lit."
          break
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: error.details,
        },
        { status: statusCode },
      )
    }
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
    const res = new NextResponse()

    const session = await getIronSession<SessionData>(request, res, sessionOptions)
    console.log("Session", session)
    if (!session.userId || !session.sessionId || !session.isLoggedIn) {
     
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session. Please complete user verification first.",
        },
        { status: 401 },
      )
    }

    const { userId, documentId } = await request.json()

    if (userId && !session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: `User ID mismatch with session ${session.userId}`,
        },
        { status: 403 },
      )
    }

    if (!userId && !documentId) {
      return NextResponse.json({ error: "Missing userId or documentId" }, { status: 400 })
    }

    if (documentId) {
      const document = await DocumentService.getDocumentDetails(documentId)
      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }

      const finalResponse = NextResponse.json(document)

      // Copy cookies from res to finalResponse
      res.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          finalResponse.headers.set(key, value)
        }
      })

      return finalResponse
    }

    if (userId) {
      const documents = await DocumentService.findByUserId(userId)

      const finalResponse = NextResponse.json({
        documents: documents.map((doc) => ({
          id: doc._id,
          type: doc.documentType,
          status: doc.verificationStatus,
          front: doc.documentImages.front
            ? {
                verificationStatus: doc.documentImages.front.verificationStatus,
                uploadedAt: doc.documentImages.front.uploadedAt,
              }
            : null,
          back: doc.documentImages.back
            ? {
                verificationStatus: doc.documentImages.back.verificationStatus,
                uploadedAt: doc.documentImages.back.uploadedAt,
              }
            : null,
          extractedData: doc.extractedData,
        })),
      })

      // Copy cookies from res to finalResponse
      res.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          finalResponse.headers.set(key, value)
        }
      })

      return finalResponse
    }
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

 