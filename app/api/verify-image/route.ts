import { type NextRequest, NextResponse } from "next/server"
import AWS from "aws-sdk"
import { SelfieService } from "@/lib/services/selfieService"
import { SelfieStep } from "@/lib/model/selfie"
import { z } from "zod"
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

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

const s3 = new AWS.S3()
const rekognition = new AWS.Rekognition()

// Validation schema
const imageUploadSchema = z.object({
  userId: z.string(),
  image: z.string(),
  step: z.enum([SelfieStep.FRONT, SelfieStep.LEFT, SelfieStep.RIGHT, SelfieStep.BLINK]),
})

// Constants for thresholds
const YAW_THRESHOLD = 15
const PITCH_ROLL_THRESHOLD = 15
const QUALITY_THRESHOLD = 50
const BLINK_CONFIDENCE_THRESHOLD = 90

interface ImageQuality {
  Brightness?: number
  Sharpness?: number
}

interface Pose {
  Roll?: number
  Yaw?: number
  Pitch?: number
}

interface EyeOpen {
  Value?: boolean
  Confidence?: number
}

interface FaceDetail {
  Pose?: Pose
  Quality?: ImageQuality
  EyesOpen?: EyeOpen
}

class ImageProcessingError extends Error {
  constructor(
    public message: string,
    public errorType: string,
  ) {
    super(message)
    this.name = "ImageProcessingError"
  }
}

function isQualityAcceptable(quality: ImageQuality): boolean {
  return (quality.Brightness ?? 0) > QUALITY_THRESHOLD && (quality.Sharpness ?? 0) > QUALITY_THRESHOLD
}

function verifyFrontPose(faceDetails: FaceDetail): boolean {
  if (!faceDetails.Pose || !faceDetails.Quality) {
    console.error("Invalid face details provided.")
    return false
  }

  const pose = faceDetails.Pose
  const quality = faceDetails.Quality

  const isValid =
    Math.abs(pose.Yaw ?? 0) < YAW_THRESHOLD &&
    Math.abs(pose.Pitch ?? 0) < PITCH_ROLL_THRESHOLD &&
    Math.abs(pose.Roll ?? 0) < PITCH_ROLL_THRESHOLD

  console.log(`Front pose verification: ${isValid ? "Valid" : "Invalid"}`)
  return isValid && isQualityAcceptable(quality)
}

function verifyLeftPose(faceDetails: FaceDetail): boolean {
  if (!faceDetails.Pose) {
    console.error("Invalid face details provided.")
    return false
  }

  const pose = faceDetails.Pose

  return (
    (pose.Yaw ?? 0) > YAW_THRESHOLD &&
    (pose.Yaw ?? 0) < 45 &&
    Math.abs(pose.Pitch ?? 0) < PITCH_ROLL_THRESHOLD &&
    Math.abs(pose.Roll ?? 0) < PITCH_ROLL_THRESHOLD
  )
}

function verifyRightPose(faceDetails: FaceDetail): boolean {
  if (!faceDetails.Pose) {
    console.error("Invalid face details provided.")
    return false
  }

  const pose = faceDetails.Pose

  return (
    (pose.Yaw ?? 0) < -YAW_THRESHOLD &&
    (pose.Yaw ?? 0) > -45 &&
    Math.abs(pose.Pitch ?? 0) < PITCH_ROLL_THRESHOLD &&
    Math.abs(pose.Roll ?? 0) < PITCH_ROLL_THRESHOLD
  )
}

function verifyBlinking(faceDetails: FaceDetail): boolean {
  if (!faceDetails.EyesOpen || faceDetails.EyesOpen.Value === undefined) {
    console.error("Blinking verification failed: EyesOpen data is missing.")
    return false
  }

  const { Value, Confidence } = faceDetails.EyesOpen

  const confidenceThreshold = BLINK_CONFIDENCE_THRESHOLD - 5

  const isBlinkDetected = !Value && (Confidence ?? 0) > confidenceThreshold

  console.log(`Blink detection: ${isBlinkDetected ? "Valid" : "Invalid"} (Confidence: ${Confidence})`)

  return isBlinkDetected
}

function verifyFaceDetails(faceDetails: FaceDetail, step: SelfieStep): boolean {
  switch (step) {
    case SelfieStep.FRONT:
      return verifyFrontPose(faceDetails)
    case SelfieStep.LEFT:
      return verifyLeftPose(faceDetails)
    case SelfieStep.RIGHT:
      return verifyRightPose(faceDetails)
    case SelfieStep.BLINK:
      return verifyBlinking(faceDetails)
    default:
      return false
  }
}

async function getFaceDetails(image: string): Promise<FaceDetail> {
  try {
    const params = {
      Image: {
        Bytes: await convertImageToBuffer(image),
      },
      Attributes: ["ALL"],
    }

    const result = await rekognition.detectFaces(params).promise()
    if (!result.FaceDetails?.length) {
      throw new ImageProcessingError("No face detected in image", "FACE_NOT_DETECTED")
    }

    return result.FaceDetails[0]
  } catch (error) {
    console.error("Face detection error:", error)
    throw new ImageProcessingError("Face detection failed", "PROCESSING_ERROR")
  }
}

async function convertImageToBuffer(image: string): Promise<Buffer> {
  try {
    if (image.startsWith("data:image")) {
      const base64Data = image.split(",")[1]
      return Buffer.from(base64Data, "base64")
    } else {
      return Buffer.from(image, "binary")
    }
  } catch (error) {
    console.error("Error converting image to buffer:", error)
    throw new Error("Failed to convert image data.")
  }
}

async function uploadImageToS3(
  fileKey: string,
  buffer: Buffer,
): Promise<{ success: boolean; s3Key: string; error?: string }> {
  try {
    await s3
      .putObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileKey,
        Body: buffer,
        ContentType: "image/jpeg",
      })
      .promise()
    return { success: true, s3Key: fileKey }
  } catch (error) {
    console.error("Error uploading image to S3:", error)
    return { success: false, s3Key: "", error: "Failed to upload image to S3." }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Create a response object to manipulate cookies
    const res = new NextResponse()

    // Get the session
    const session = await getIronSession<SessionData>(req, res, sessionOptions)

    if (!session.sessionId) {
      session.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      await session.save()
    }

    const body = await req.json()
    const { userId, image, step } = imageUploadSchema.parse(body)

    if (!image || !step || !userId) {
      return NextResponse.json({ success: false, error: "Image, userId and step are required." }, { status: 400 })
    }

    const userExist = await SelfieService.checkUserExist(userId)
    if (!userExist) {
      console.log("User does not exist")
      return NextResponse.json({ success: false, error: "User does not exist." }, { status: 404 })
    }

    const faceDetails = await getFaceDetails(image)
    const verificationResults = verifyFaceDetails(faceDetails, step)

    if (!verificationResults) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid image for ${step}. Please ensure the face is positioned correctly.`,
        },
        { status: 400 },
      )
    }

    const stepFolder = step.toLowerCase()
    const filename = `${Date.now()}.jpg`
    const fileKey = `${userId}/${session.sessionId}/${stepFolder}/${filename}`

    const s3UploadResult = await uploadImageToS3(fileKey, await convertImageToBuffer(image))

    if (!s3UploadResult.success) {
      return NextResponse.json({ success: false, error: s3UploadResult.error }, { status: 500 })
    }

    const metadata = {
      brightness: faceDetails.Quality?.Brightness,
      facePosition: step,
      confidence: faceDetails.EyesOpen?.Confidence,
      sessionId: session.sessionId,
    }

    const progress = await SelfieService.updateStep(userId, step, s3UploadResult.s3Key, metadata)

    //headers from the response object to maintain the session cookie
    const finalResponse = NextResponse.json({
      success: true,
      data: {
        step,
        progress,
        s3Key: s3UploadResult.s3Key,
        sessionId: session.sessionId,
      },
    })

    // cookies from res to finalResponse
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        finalResponse.headers.set(key, value)
      }
    })

    return finalResponse
  } catch (error) {
    console.error("Error in selfie verification:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 },
      )
    }

    if (error instanceof ImageProcessingError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorType: error.errorType,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const res = new NextResponse()

    // Get the session
    const session = await getIronSession<SessionData>(req, res, sessionOptions)

    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
    }

    const status = await SelfieService.getVerificationStatus(userId)

    const finalResponse = NextResponse.json({
      success: true,
      data: {
        ...status,
        sessionId: session.sessionId,
      },
    })

    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        finalResponse.headers.set(key, value)
      }
    })

    return finalResponse
  } catch (error) {
    console.error("Error getting verification status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

