import * as faceapi from "face-api.js"
import type { WithFaceDetection, FaceLandmarks68 } from "face-api.js"
import { getDefaultFaceDetectionResult } from "."



self.onmessage = async (event) => {
  const { imageDataUrl, displaySize } = event.data

  try {
    // Load the image from the data URL
    const img = await faceapi.fetchImage(imageDataUrl)

    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()

    if (!detections || detections.length === 0) {
      self.postMessage(getDefaultFaceDetectionResult())
      return
    }

    const detection = faceapi.resizeResults(detections[0], displaySize)
    const result = processFaceDetection(detection, displaySize)
    self.postMessage(result)
  } catch (error) {
    console.error("Face detection worker error:", error)
    self.postMessage(getDefaultFaceDetectionResult())
  }
}


function processFaceDetection(
  detection: faceapi.WithFaceLandmarks<WithFaceDetection<object>, FaceLandmarks68>,
  displaySize: { width: number; height: number },
) {
  const faceBox = detection.detection.box
  const expandFactor = 0.2
  const expandedWidth = faceBox.width * (1 + expandFactor)
  const expandedHeight = faceBox.height * (1 + expandFactor)

  const expandedFaceBox = {
    x: Math.max(0, Math.min(faceBox.x - (expandedWidth - faceBox.width) / 2, displaySize.width - expandedWidth)),
    y: Math.max(0, Math.min(faceBox.y - (expandedHeight - faceBox.height) / 2, displaySize.height - expandedHeight)),
    width: Math.min(expandedWidth, displaySize.width),
    height: Math.min(expandedHeight, displaySize.height),
  }

  const landmarks = detection.landmarks
  const leftEye = landmarks.getLeftEye()
  const rightEye = landmarks.getRightEye()

  const leftEyeCenter = leftEye[0]
  const rightEyeCenter = rightEye[3]
  const faceAngle = Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x) * (180 / Math.PI)

  const faceCenterX = expandedFaceBox.x + expandedFaceBox.width / 2
  const faceCenterY = expandedFaceBox.y + expandedFaceBox.height / 2

  const horizontalOffsetPercentage = ((faceCenterX - displaySize.width / 2) / (displaySize.width / 2)) * 100
  const verticalOffsetPercentage = ((faceCenterY - displaySize.height / 2) / (displaySize.height / 2)) * 100

  const ANGLE_THRESHOLD = 15 
  const POSITION_THRESHOLD = 20 
  const FACE_ANGLE_THRESHOLD = 35 
  const BLINK_THRESHOLD = 0.25

  const centerFaceValid =
    Math.abs(faceAngle) <= ANGLE_THRESHOLD &&
    Math.abs(horizontalOffsetPercentage) <= POSITION_THRESHOLD &&
    Math.abs(verticalOffsetPercentage) <= POSITION_THRESHOLD

  const leftFaceValid = faceAngle < -FACE_ANGLE_THRESHOLD
  const rightFaceValid = faceAngle > FACE_ANGLE_THRESHOLD

  const leftEyeOpenness = Math.abs(leftEye[1].y - leftEye[5].y) / expandedFaceBox.height
  const rightEyeOpenness = Math.abs(rightEye[1].y - rightEye[5].y) / expandedFaceBox.height
  const eyesOpen = leftEyeOpenness > BLINK_THRESHOLD && rightEyeOpenness > BLINK_THRESHOLD
  const blinkConfidence = 1 - (leftEyeOpenness + rightEyeOpenness) / 2

  return {
    faceDetected: true,
    multipleFaces: false,
    facePositioning: {
      x: expandedFaceBox.x,
      y: expandedFaceBox.y,
      width: expandedFaceBox.width,
      height: expandedFaceBox.height,
    },
    confidence: detection.detection.score,
    faceAngle,
    centerFaceValid,
    leftFaceValid,
    rightFaceValid,
    eyesOpen,
    blinkConfidence,
    faceWithinValidArea: true,
    horizontalOffsetPercentage,
    verticalOffsetPercentage,
    faceAngleValid: Math.abs(faceAngle) <= ANGLE_THRESHOLD,
  }
}

