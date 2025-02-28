import mongoose, { Schema, type Document } from "mongoose"


export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId
  documentType: string
  documentImages: {
    front?: {
      s3Key: string
      uploadedAt: Date
      verificationStatus: "PENDING" | "COMPLETED"
    }
    back?: {
      s3Key: string
      uploadedAt: Date
      verificationStatus: "PENDING" | "COMPLETED"
    }
  }
  extractedData: Record<string, string | number>
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "INCOMPLETE"
  createdAt: Date
  updatedAt: Date
}

const DocumentSchema = new Schema(
  {
    userId: {
      type:String,
      ref: "User",
      required: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ["GHANA_CARD", "PASSPORT", "DRIVERS_LICENSE", "VOTER_ID"],
    },

  
    documentImages: {
      front: {
        s3Key: String,
        uploadedAt: Date,
        verificationStatus: {
          type: String,
          enum: ["PENDING", "COMPLETED"],
          default: "PENDING",
        },
      },
      back: {
        s3Key: String,
        uploadedAt: Date,
        verificationStatus: {
          type: String,
          enum: ["PENDING", "COMPLETED"],
          default: "PENDING",
        },
      },
    },
    extractedData: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "INCOMPLETE"],
      default: "INCOMPLETE",
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes
DocumentSchema.index({ idNumber: 1 })
DocumentSchema.index({ verificationStatus: 1 })

export const KYCDocument = mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema)


