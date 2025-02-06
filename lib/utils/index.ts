import * as faceapi from "face-api.js"
import { createWorker } from "tesseract.js"
import { extractCardInfo } from "./cardInfoExtractor"


interface FaceDetectionCaseType {
  faceDetected: boolean;
  multipleFaces: boolean;
  facePositioning: { x: number; y: number; width: number; height: number };
  confidence: number;
  faceAngle: number;
  centerFaceValid: boolean;
  leftFaceValid: boolean;
  rightFaceValid: boolean;
  eyesOpen: boolean;
  blinkConfidence: number;
  faceWithinValidArea: boolean;
  horizontalOffsetPercentage: number;
  verticalOffsetPercentage: number;
  faceAngleValid: boolean;
}

let modelsLoaded = false;

async function loadModels() {
  if (!modelsLoaded) {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      ]);
      modelsLoaded = true;
    } catch (error) {
      modelsLoaded = false;
      console.log(error);
      return;
    }
  }
}

export async function detectFace(
  video: HTMLVideoElement
): Promise<FaceDetectionCaseType> {
  if (!video) {
    console.error("Video element is null");
    return getDefaultFaceDetectionResult();
  }
  try {
    await loadModels();
    if (!loadModels) return getDefaultFaceDetectionResult();

    if (
      (video && video.videoWidth === 0) ||
      (video && video.videoHeight === 0)
    ) {
      return getDefaultFaceDetectionResult();
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (!detections || detections.length === 0) {
      return getDefaultFaceDetectionResult();
    }

    const detection = faceapi.resizeResults(detections[0], displaySize);
    const landmarks = detection.landmarks;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const faceBox = detection.detection.box;
    if (!isValidBox(faceBox)) {
      return getDefaultFaceDetectionResult();
    }

    const expandFactor = 0.2;
    const expandedWidth = faceBox.width * (1 + expandFactor);
    const expandedHeight = faceBox.height * (1 + expandFactor);
    const expandedX = Math.max(
      0,
      faceBox.x - (expandedWidth - faceBox.width) / 2
    );
    const expandedY = Math.max(
      0,
      faceBox.y - (expandedHeight - faceBox.height) / 2
    );

    const expandedFaceBox = {
      x: expandedX,
      y: expandedY,
      width: Math.min(expandedWidth, displaySize.width - expandedX),
      height: Math.min(expandedHeight, displaySize.height - expandedY),
    };

    // Calculate face angle
    const leftEyeCenter = leftEye[0];
    const rightEyeCenter = rightEye[3];
    const faceAngle =
      Math.atan2(
        rightEyeCenter.y - leftEyeCenter.y,
        rightEyeCenter.x - leftEyeCenter.x
      ) *
      (180 / Math.PI);

    // Face validation criteria
    const ANGLE_THRESHOLD = 15;
    const POSITION_THRESHOLD_X = 0.3;
    const POSITION_THRESHOLD_Y = 0.3;

    // Calculate face center
    const faceCenterX = expandedFaceBox.x + expandedFaceBox.width / 2;
    const faceCenterY = expandedFaceBox.y + expandedFaceBox.height / 2;

    // Calculate frame center
    const frameCenterX = displaySize.width / 2;
    const frameCenterY = displaySize.height / 2;

    // Check horizontal centering
    const horizontalOffset = Math.abs(faceCenterX - frameCenterX);
    const horizontalOffsetPercentage =
      (horizontalOffset / (displaySize.width / 2)) * 100;

    // Check vertical centering
    const verticalOffset = Math.abs(faceCenterY - frameCenterY);
    const verticalOffsetPercentage =
      (verticalOffset / (displaySize.height / 2)) * 100;

    const validAreaWidth = displaySize.width * 0.9;
    const validAreaX = (displaySize.width - validAreaWidth) / 2;

    const faceWithinValidArea =
      expandedFaceBox.x >= validAreaX &&
      expandedFaceBox.x + expandedFaceBox.width <=
        validAreaX + validAreaWidth &&
      expandedFaceBox.y >= 0 &&
      expandedFaceBox.y + expandedFaceBox.height <= displaySize.height;

    const centerFaceValid =
      Math.abs(faceAngle + 10) <= ANGLE_THRESHOLD &&
      horizontalOffsetPercentage <= POSITION_THRESHOLD_X * 100 &&
      verticalOffsetPercentage <= POSITION_THRESHOLD_Y * 100 &&
      faceWithinValidArea;

    const FACE_ANGLE_THRESHOLD = 5;
    const FACE_ANGLE_DEADZONE = 2;
    const leftFaceValid = faceAngle < -FACE_ANGLE_DEADZONE;
    const rightFaceValid = faceAngle > FACE_ANGLE_DEADZONE;
    const faceAngleValid = Math.abs(faceAngle) <= FACE_ANGLE_THRESHOLD;

    const leftEyeOpenness =
      Math.abs(leftEye[1].y - leftEye[5].y) / expandedFaceBox.height;
    const rightEyeOpenness =
      Math.abs(rightEye[1].y - rightEye[5].y) / expandedFaceBox.height;
    const eyesOpen = leftEyeOpenness > 0.3 && rightEyeOpenness > 0.3;

    const blinkConfidence = 1 - (leftEyeOpenness + rightEyeOpenness) / 2;

    return {
      faceDetected: true,
      multipleFaces: detections.length > 1,
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
      faceAngleValid,
      eyesOpen,
      blinkConfidence,
      faceWithinValidArea,
      horizontalOffsetPercentage,
      verticalOffsetPercentage,
    };
  } catch (error) {
    console.error("Face detection error:", error);
    return getDefaultFaceDetectionResult();
  }
}



function isValidBox(box: faceapi.Box<unknown>): box is faceapi.Box {
  return (
    box &&
    typeof box.x === "number" &&
    typeof box.y === "number" &&
    typeof box.width === "number" &&
    typeof box.height === "number" &&
    !isNaN(box.x) &&
    !isNaN(box.y) &&
    !isNaN(box.width) &&
    !isNaN(box.height)
  );
}

export async function validateDocument(imageData: string): Promise<{
  isValid: boolean
  confidence: number
  errors: string[]
  extractedData: ExtractedCardInfo
  rawText: string
}> {
  try {
    const worker = await createWorker("eng")

    const {
      data: { confidence, text },
    } = await worker.recognize(imageData)

    console.log("OCR Confidence:", confidence, "Text:", text)
    const errors: string[] = []

    if (!text.trim()) {
      errors.push("No text detected in document")
    }

    // Adjusted confidence threshold to 60 (can be fine-tuned based on real-world testing)
    if (confidence < 50) {
      errors.push("Document text not clear enough. Please retake the image in better lighting conditions.")
    }

    const extractedData = extractCardInfo(text)

    if (extractedData.cardType === "Unknown ID") {
      errors.push("Unable to identify the type of ID card. Please ensure you're using a valid identification document.")
    }

    const frontRequiredFields = ["idNumber", "surname", "givenNames"]
    const backRequiredFields = ["dateOfBirth", "dateOfIssue", "dateOfExpiry"]

    if (extractedData.isFront) {
      const missingFields = frontRequiredFields.filter((field) => !extractedData[field as keyof ExtractedCardInfo])
      if (missingFields.length > 0) {
        errors.push(
          `Failed to extract the following required information from the front of the card: ${missingFields.join(
            ", ",
          )}. Please retake the image.`,
        )
      }
    }

    if (extractedData.isBack) {
      const missingFields = backRequiredFields.filter((field) => !extractedData[field as keyof ExtractedCardInfo])
      if (missingFields.length > 0) {
        errors.push(
          `Failed to extract the following required information from the back of the card: ${missingFields.join(
            ", ",
          )}. Please retake the image.`,
        )
      }
    }

    if (extractedData.dateOfExpiry) {
      const expiryDate = new Date(extractedData.dateOfExpiry.split("/").reverse().join("-"))
      if (expiryDate < new Date()) {
        errors.push("ID card appears to be expired")
      }
    }

    await worker.terminate()

    return {
      isValid: errors.length === 0,
      confidence: confidence / 100,
      errors,
      extractedData,
      rawText: text,
    }
  } catch (error) {
    console.error("Document validation error:", error)
    return {
      isValid: false,
      confidence: 0,
      errors: [error instanceof Error ? error.message : "Unknown error occurred during document validation"],
      extractedData: {
        cardType: "Unknown",
        isFront: false,
        isBack: false,
        additionalInfo: {},
      },
      rawText: "",
    }
  }
}


export function getDefaultFaceDetectionResult(): FaceDetectionCaseType {
  return {
    faceDetected: false,
    multipleFaces: false,
    facePositioning: { x: 0, y: 0, width: 0, height: 0 },
    confidence: 0,
    faceAngle: 0,
    centerFaceValid: false,
    leftFaceValid: false,
    rightFaceValid: false,
    eyesOpen: false,
    blinkConfidence: 0,
    faceWithinValidArea: false,
    horizontalOffsetPercentage: 0,
    verticalOffsetPercentage: 0,
    faceAngleValid: false,
  }
}

export { startCamera, stopCamera } from "./camera";