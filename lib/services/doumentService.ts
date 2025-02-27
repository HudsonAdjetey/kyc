import mongoose from "mongoose"
import { connectToDatabase } from "../database/mongodb"
import { IDocument, KYCDocument } from "../model/document"
import { User } from "../model/user"
import type { ExtractedFields } from "../types"

export interface DocumentStatus {
  exists: boolean
  hasFront: boolean
  hasBack: boolean
  isComplete: boolean
  status: string
}

export class DocumentService {
  static async findByUserId(userId: string): Promise<IDocument[]> {
    await connectToDatabase()
    const user = await User.findOne({ userId })
    if (!user) {
      throw new Error("User not found")
    }
    return KYCDocument.find({ userId: user.userId })
  }

  static async checkDocumentStatus(userId: string, documentType: "front" | "back"): Promise<DocumentStatus> {
    await connectToDatabase()
    const user = await User.findOne({ userId })
    if (!user) {
      throw new Error("User not found")
    }

      const document = await KYCDocument.findOne({
          userId: user.userId, 
          // the document type "front or back"
          documentImages: {
            $elemMatch: { documentType }
          }
     })

    if (!document) {
      return {
        exists: false,
        hasFront: false,
        hasBack: false,
        isComplete: false,
        status: "NOT_STARTED",
      }
    }

    return {
      exists: true,
      hasFront: !!document.documentImages.front,
      hasBack: !!document.documentImages.back,
      isComplete: !!document.documentImages.front && !!document.documentImages.back,
      status: document.verificationStatus,
    }
  }

  static async createOrUpdateDocument(
    userId: string,
    documentType: string,
    side: "front" | "back",
    s3Key: string,
    extractedFields: ExtractedFields,
  ): Promise<IDocument> {
    await connectToDatabase()

      const session = await mongoose.startSession()
  session.startTransaction()

  try {
      const user = await User.findOne({ userId })
    if (!user) {
      throw new Error("User not found")
    }

    const now = new Date()

    // Try to update existing document
    const existingDocument = await KYCDocument.findOne({
      userId: user.userId,
      documentType,
    }).session(session)

    if (existingDocument && !existingDocument.documentImages[side] ) {
      // Update existing document
      existingDocument.documentImages[side] = {
        s3Key,
        uploadedAt: now,
        verificationStatus: "COMPLETED",
        }
        

      // Update extracted data
      Object.assign(existingDocument.extractedData, extractedFields)

      // Update verification status if both sides are present
      if (existingDocument.documentImages.front && existingDocument.documentImages.back) {
        existingDocument.verificationStatus = "VERIFIED"
      }

      await existingDocument.save().save({ session })
       await session.commitTransaction()
      session.endSession()
      return existingDocument
      }

    // Create new document
    const newDocument = new KYCDocument({
      userId: user.userId,
      documentType,
      documentImages: {
        [side]: {
          s3Key,
          uploadedAt: now,
          verificationStatus: "PENDING",
        },
      },
      extractedData: extractedFields,
      verificationStatus: "INCOMPLETE",
    })

 await newDocument.save({ session })
    await session.commitTransaction()
    session.endSession()

    return newDocument
  } catch (error) {
       await session.abortTransaction()
    session.endSession()
    console.error("Error in createOrUpdateDocument:", error)
    throw error
  }
  }

  static async getDocumentDetails(documentId: string): Promise<IDocument | null> {
    await connectToDatabase()
    return KYCDocument.findById(documentId).populate("userId", )
  }

  static async updateVerificationStatus(
    documentId: string,
    status: "PENDING" | "VERIFIED" | "REJECTED",
    side?: "front" | "back",
  ): Promise<IDocument> {
    await connectToDatabase()

    const document = await KYCDocument.findById(documentId)
    if (!document) {
      throw new Error("Document not found")
    }

    if (side) {
      // Update specific side status
      if (document.documentImages[side]) {
        document.documentImages[side]!.verificationStatus = status === "PENDING" ? "PENDING" : "COMPLETED"
      }
    }

    // Update overall document status
    document.verificationStatus = status
    await document.save()

    return document
  }

  static async deleteDocument(documentId: string): Promise<void> {
    await connectToDatabase()
    await KYCDocument.findByIdAndDelete(documentId)
  }
}

