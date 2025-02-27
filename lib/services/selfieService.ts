import { connectToDatabase } from "../database/mongodb"
import { SelfieStep, VerificationStatus, SelfieVerificationModel, type SelfieVerification } from "../model/selfie"
import { User } from "../model/user"
import mongoose from "mongoose"

export interface VerificationProgress {
  currentStep: SelfieStep
  progress: number
  completedSteps: [
    {
      step: SelfieStep
      imageData: string
      metadata: {
        brightness: number
        facePosition: string
        confidence: number
      }
    },
  ]
  status: VerificationStatus
}

export interface SelfieMetadata {
  brightness?: number
  facePosition?: string
  confidence?: number
}

export class SelfieService {
  static async checkUserExist(userId: string): Promise<boolean> {
    try {
      await connectToDatabase()
      const user = await User.findOne({ userId })
      // Return true if user exists, otherwise false
      return !!user
    } catch (error) {
      console.error("Error in checkUserExist:", error)
      return false
    }
  }
  static async initializeVerification(
    userId: string,
    fullName: string,
    country: string,
    phoneNumber: string,
  ): Promise<SelfieVerification> {
    try {
      await connectToDatabase()

      let user = await User.findOne({ userId })

      if (!user) {
        user = new User({ userId, fullName, country, phoneNumber })
        await user.save()
      }

      const existingVerification = await SelfieVerificationModel.findOne({
        userId: user.userId,
        verificationStatus: { $ne: VerificationStatus.REJECTED },
      })

      if (existingVerification) {
        return existingVerification
      }

      const newVerification = new SelfieVerificationModel({
        userId: user.userId,
        currentStep: SelfieStep.FRONT,
        verificationStatus: VerificationStatus.INCOMPLETE,
        fullName,
        country,
        phoneNumber,
      })

      await newVerification.save()
      return newVerification
    } catch (error) {
      console.error("Error in initializeVerification:", error)
      throw error
    }
  }

  static async updateStep(
    userId: string,
    step: SelfieStep,
    imageData: string,
    metadata: SelfieMetadata,
  ): Promise<VerificationProgress> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await connectToDatabase();

      const user = await User.findOne({ userId }).session(session);
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }

      let verification = await SelfieVerificationModel.findOne({
        userId: user.userId,
        verificationStatus: { $ne: VerificationStatus.REJECTED },
      }).session(session);

      if (!verification) {
        verification = new SelfieVerificationModel({
          userId: user.userId,
          currentStep: SelfieStep.FRONT,
          verificationStatus: VerificationStatus.INCOMPLETE,
          completedSteps: [],
          steps: {},
          attempts: 0,
          country: user.country || "",
          fullName: user.fullName || "",
          phoneNumber: user.phoneNumber || "",
        });
      }

      // Check if verification is already complete
      const allSteps = Object.values(SelfieStep);
      const isVerificationComplete = verification.verificationStatus === VerificationStatus.VERIFIED && 
        verification.completedSteps.length === allSteps.length;

      if (isVerificationComplete) {
        throw new Error(
          JSON.stringify({
            code: "VERIFICATION_COMPLETE",
            message: "Verification process is already complete. No further updates allowed.",
            completedSteps: verification.completedSteps,
            status: verification.verificationStatus,
          })
        );
      }

      // Check if this step was previously completed
      const stepExists = verification.completedSteps.some((s: { step: SelfieStep }) => s.step === step);
      const stepIndex = allSteps.indexOf(step);
      const currentStepIndex = allSteps.indexOf(verification.currentStep);

      // Allow resubmission of completed steps or submission of current step
      if (step !== verification.currentStep && !stepExists && stepIndex > currentStepIndex) {
        throw new Error(
          JSON.stringify({
            code: "INVALID_STEP_ORDER",
            message: `Invalid step order. Expected ${verification.currentStep}, got ${step}`,
            currentStep: verification.currentStep,
            requestedStep: step,
          })
        );
      }

      // Update or add the step data
      if (stepExists) {
        // Update existing step
        const stepIndex = verification.completedSteps.findIndex((s: { step: SelfieStep }) => s.step === step);
        verification.completedSteps[stepIndex] = { step, imageData, metadata };
      } else {
        // Add new step
        verification.completedSteps.push({ step, imageData, metadata });
      }

      verification.steps[step] = {
        imageData,
        verified: true,
        capturedAt: new Date(),
        metadata,
      };

      verification.attempts += 1;

      // Only advance to next step if we're updating the current step
      if (step === verification.currentStep) {
        const nextStep = allSteps[allSteps.indexOf(step) + 1];
        if (nextStep) {
          verification.currentStep = nextStep;
        } else {
          verification.verificationStatus = VerificationStatus.VERIFIED;
          verification.verifiedAt = new Date();

          user.percentage = Math.min((user.percentage || 0) + 25, 100);
          await user.save({ session });
        }
      }

      await verification.save({ session });
      await session.commitTransaction();

      return {
        currentStep: verification.currentStep,
        completedSteps: verification.completedSteps,
        progress: verification.progress,
        status: verification.verificationStatus,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error in updateStep:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getVerificationStatus(userId: string) {
    try {
      await connectToDatabase()

      const user = await User.findOne({ userId })
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`)
      }

      const verification = await SelfieVerificationModel.findOne({
        userId: user.userId,
        verificationStatus: { $ne: VerificationStatus.REJECTED },
      })

      if (!verification) {
        return {
          currentStep: SelfieStep.FRONT,
          completedSteps: [],
          progress: 0,
          status: VerificationStatus.INCOMPLETE,
        }
      }
    } catch (error) {
      console.error("Error in getVerificationStatus:", error)
      throw error
    }
  }

  static async rejectVerification(userId: string): Promise<void> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      await connectToDatabase()

      const user = await User.findOne({ userId }).session(session)
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`)
      }

      const verification = await SelfieVerificationModel.findOne({
        userId: user.userId,
        verificationStatus: { $ne: VerificationStatus.REJECTED },
      }).session(session)

      if (verification) {
        verification.verificationStatus = VerificationStatus.REJECTED
        await verification.save({ session })

        const newVerification = new SelfieVerificationModel({
          userId: user.userId,
          currentStep: SelfieStep.FRONT,
          verificationStatus: VerificationStatus.INCOMPLETE,
        })
        await newVerification.save({ session })
      }

      await session.commitTransaction()
    } catch (error) {
      await session.abortTransaction()
      console.error("Error in rejectVerification:", error)
      throw error
    } finally {
      session.endSession()
    }
  }

  static async resetVerification(userId: string): Promise<VerificationProgress> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      await connectToDatabase()

      const user = await User.findOne({ userId }).session(session)
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`)
      }

      // Create new verification instance
      const verification = new SelfieVerificationModel({
        userId: user.userId,
        currentStep: SelfieStep.FRONT,
        verificationStatus: VerificationStatus.INCOMPLETE,
        completedSteps: [],
        steps: {},
        attempts: 0,
        country: user.country || "",
        fullName: user.fullName || "",
        phoneNumber: user.phoneNumber || "",
      })

      await verification.save({ session })
      await session.commitTransaction()

      return {
        currentStep: verification.currentStep,
        completedSteps: verification.completedSteps,
        progress: verification.progress,
        status: verification.verificationStatus,
      }
    } catch (error) {
      await session.abortTransaction()
      console.error("Error in resetVerification:", error)
      throw error
    } finally {
      session.endSession()
    }
  }
}
