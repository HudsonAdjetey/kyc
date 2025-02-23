import { type NextRequest, NextResponse } from "next/server"
import AWS from "aws-sdk"

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

const s3 = new AWS.S3()
const rekognition = new AWS.Rekognition()

// Define the strict sequence of stages
const UPLOAD_SEQUENCE = ["front", "left", "right", "blink"] as const
type ImageType = (typeof UPLOAD_SEQUENCE)[number]

// Map to store user upload stages in memory
const userStages: Record<string, Set<string>> = {}
const userResults: Record<string, Record<ImageType, string>> = {}

class ImageProcessingError extends Error {
  constructor(
    public message: string,
    public errorType: string,
  ) {
    super(message)
    this.name = "ImageProcessingError"
  }
}

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
    console.error("Blinking verification failed: EyesOpen data is missing.");
    return false;
  }

  const { Value, Confidence } = faceDetails.EyesOpen;

  // Adjust threshold to allow partial blinking
  const confidenceThreshold = BLINK_CONFIDENCE_THRESHOLD - 5;

  const isBlinkDetected = !Value && (Confidence ?? 0) > confidenceThreshold;

  console.log(`Blink detection: ${isBlinkDetected ? "Valid" : "Invalid"} (Confidence: ${Confidence})`);

  return isBlinkDetected;
}


function verifyFaceDetails(faceDetails: FaceDetail, stage: ImageType): boolean {
  switch (stage) {
    case "front":
      return verifyFrontPose(faceDetails)
    case "left":
      return verifyLeftPose(faceDetails)
    case "right":
      return verifyRightPose(faceDetails)
    case "blink":
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
    console.log(error)
    throw new ImageProcessingError("Face detection failed", "PROCESSING_ERROR")
  }
}


export async function POST(req: NextRequest) {
  try {
    const { image, userId } = await req.json()

    if (!userId || !image) {
      return NextResponse.json({ error: "Missing required fields: userId or image" }, { status: 400 })
    }

    // Get the user's current stage
    const userCompletedStages = userStages[userId] || new Set()
    const nextStage = UPLOAD_SEQUENCE.find((stage) => !userCompletedStages.has(`${stage}_uploaded`)) as
      | ImageType
      | undefined

    if (!nextStage) {
      return NextResponse.json({ error: "All images have already been uploaded." }, { status: 400 })
    }

    // Get face details
    const faceDetails = await getFaceDetails(image)
    const verificationResults = verifyFaceDetails(faceDetails, nextStage)

    if (!verificationResults) {
      return NextResponse.json(
        { error: `Invalid image for ${nextStage}. Please ensure the face is positioned correctly.` },
        { status: 400 },
      )
    }

    // Upload image to S3
    const fileKey = `images/${userId}/${nextStage}.jpg`
    const s3UploadResult = await uploadImageToS3(fileKey, await convertImageToBuffer(image))

    if (!s3UploadResult.success) {
      return NextResponse.json({ error: s3UploadResult.error }, { status: 500 })
    }

    // Mark current stage as completed
    if (!userStages[userId]) {
      userStages[userId] = new Set<string>()
    }
    userStages[userId].add(`${nextStage}_uploaded`)
    if (!userResults[userId]) {
      userResults[userId] = {} as Record<ImageType, string>
    }
    userResults[userId][nextStage] = "uploaded"

    return NextResponse.json({
      success: true,
      nextStage,
      userStages: Array.from(userStages[userId]),
      userResults: userResults[userId],
    })
  } catch (error) {
    console.error("Error in face validation:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

async function convertImageToBuffer(image: string): Promise<Buffer> {
  console.log("Converting image to buffer...")
  try {
    if (image.startsWith("data:image")) {
      // Base64 encoded image
      const base64Data = image.split(",")[1]
      return Buffer.from(base64Data, "base64")
    } else {
      // Binary image data
      return Buffer.from(image, "binary")
    }
  } catch (error) {
    console.error("Error converting image to buffer:", error)
    throw new Error("Failed to convert image data.")
  }
}

async function uploadImageToS3(fileKey: string, buffer: Buffer): Promise<{ success: boolean; error?: string }> {
  console.log("Uploading image to S3 with key:", fileKey)
  try {
    await s3
      .putObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileKey,
        Body: buffer,
        ContentType: "image/jpeg",
      })
      .promise()
    console.log("Image successfully uploaded to S3.")
    return { success: true }
  } catch (error) {
    console.error("Error uploading image to S3:", error)
    return { success: false, error: "Failed to upload image to S3." }
  }
}

