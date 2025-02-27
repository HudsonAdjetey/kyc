import mongoose, { Schema, type Document } from "mongoose";

export enum SelfieStep {
  FRONT = "front",
  LEFT = "left",
  RIGHT = "right",
  BLINK = "blink",
}

export enum VerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  INCOMPLETE = "INCOMPLETE",
}

export interface SelfieImage {
  imageData: string;
  verified: boolean;
  capturedAt: Date;
  metadata?: {
    brightness?: number;
    facePosition?: string;
    confidence?: number;
  };
}

export interface SelfieVerification extends Document {
  userId: string;
  steps: {
    [key in SelfieStep]?: SelfieImage;
  };
  verificationStatus: VerificationStatus;
  completedSteps: {
    step: SelfieStep;
    imageData: string;
    metadata: {
      brightness: number;
      facePosition: string;
      confidence: number;
    };
  }[];
  currentStep: SelfieStep;
  attempts: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  country: string;
  fullName: string;
  phoneNumber: string;
}

const SelfieImageSchema = new Schema<SelfieImage>(
  {
    imageData: { type: String, required: true },
    verified: { type: Boolean, default: false },
    capturedAt: { type: Date, required: true },
    metadata: {
      brightness: Number,
      facePosition: String,
      confidence: Number,
    },
  },
  { _id: false }
);

const SelfieVerificationSchema = new Schema<SelfieVerification>(
  {
    steps: {
      [SelfieStep.FRONT]: SelfieImageSchema,
      [SelfieStep.LEFT]: SelfieImageSchema,
      [SelfieStep.RIGHT]: SelfieImageSchema,
      [SelfieStep.BLINK]: SelfieImageSchema,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.INCOMPLETE,
      required: true,
      index: true,
    },
    completedSteps: [
      {
        step: {
          type: String,
          enum: Object.values(SelfieStep),
          required: true,
        },
        imageData: { type: String, required: true },
        metadata: {
          brightness: { type: Number, required: true },
          facePosition: { type: String, required: true },
          confidence: { type: Number, required: true },
        },
      },
    ],
    currentStep: {
      type: String,
      enum: Object.values(SelfieStep),
      default: SelfieStep.FRONT,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    country: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field to calculate progress
SelfieVerificationSchema.virtual("progress").get(function (this: SelfieVerification) {
  return (this.completedSteps.length / Object.values(SelfieStep).length) * 100;
});

// Middleware to initialize `completedSteps` as an array before saving
SelfieVerificationSchema.pre("save", function (next) {
  const selfie = this as SelfieVerification;
  if (!Array.isArray(selfie.completedSteps)) {
    selfie.completedSteps = [];
  }
  next();
});

SelfieVerificationSchema.methods.addCompletedStep = function (step: SelfieStep, imageData: string, metadata: { brightness: number; facePosition: string; confidence: number }) {
  if (!Array.isArray(this.completedSteps)) {
    this.completedSteps = [];
  }
  
  const stepExists = this.completedSteps.some((s: {step: SelfieStep}) => s.step === step);
  if (!stepExists) {
    this.completedSteps.push({ step, imageData, metadata });
  }
};

export const SelfieVerificationModel =
  mongoose.models.SelfieVerification ||
  mongoose.model<SelfieVerification>("SelfieVerification", SelfieVerificationSchema);
