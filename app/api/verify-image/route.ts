import { NextResponse } from "next/server"
import {
  RekognitionClient,
  DetectFacesCommand,
  type FaceDetail,
  type Pose,
  type ImageQuality,
  type EyeOpen,
} from "@aws-sdk/client-rekognition"
import type { VerificationResponse, VerificationStepId } from "/types/kyc"

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: Request) {
  try {
    const { image, step } = await request.json()

    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64")

    const response = await verifyFace(buffer, step as VerificationStepId)
console.log(response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ verified: false, message: "Internal server error" }, { status: 500 })
  }
}

async function verifyFace(imageBuffer: Buffer, step: VerificationStepId): Promise<VerificationResponse> {
  const detectFacesCommand = new DetectFacesCommand({
    Image: { Bytes: imageBuffer },
    Attributes: ["ALL"],
  })

  const facesResponse = await rekognition.send(detectFacesCommand)

  if (!facesResponse.FaceDetails?.length) {
    return { verified: false, message: "No face detected", confidence: 0 }
  }

  const faceDetails = facesResponse.FaceDetails[0]
  let verified = false
  let message = ""

  switch (step) {
    case "face":
      verified = verifyFrontalFace(faceDetails)
      message = verified ? "Face verified" : "Please look straight at the camera"
      break
    case "left":
      verified = verifyLeftPose(faceDetails)
      message = verified ? "Left pose verified" : "Please turn your head more to the left"
      break
    case "right":
      verified = verifyRightPose(faceDetails)
      message = verified ? "Right pose verified" : "Please turn your head more to the right"
      break
    case "blink":
      verified = verifyBlinking(faceDetails)
      message = verified ? "Blink verified" : "Please blink naturally"
      break
  }

  return { verified, message, confidence: faceDetails.Confidence }
}

function verifyFrontalFace(faceDetails: FaceDetail): boolean {
  const pose = faceDetails.Pose as Pose
  const quality = faceDetails.Quality as ImageQuality

  return (
    Math.abs(pose.Yaw ?? 0) < 15 &&
    Math.abs(pose.Pitch ?? 0) < 15 &&
    Math.abs(pose.Roll ?? 0) < 15 &&
    (quality.Brightness ?? 0) > 50 &&
    (quality.Sharpness ?? 0) > 50
  )
}

function verifyLeftPose(faceDetails: FaceDetail): boolean {
  const pose = faceDetails.Pose as Pose

  return (pose.Yaw ?? 0) > 15 && (pose.Yaw ?? 0) < 45 && Math.abs(pose.Pitch ?? 0) < 15 && Math.abs(pose.Roll ?? 0) < 15
}

function verifyRightPose(faceDetails: FaceDetail): boolean {
  const pose = faceDetails.Pose as Pose

  return (
    (pose.Yaw ?? 0) < -15 && (pose.Yaw ?? 0) > -45 && Math.abs(pose.Pitch ?? 0) < 15 && Math.abs(pose.Roll ?? 0) < 15
  )
}

function verifyBlinking(faceDetails: FaceDetail): boolean {
  const eyesOpen = faceDetails.EyesOpen as EyeOpen
  return !(eyesOpen.Value ?? true) && (eyesOpen.Confidence ?? 0) > 90
}

