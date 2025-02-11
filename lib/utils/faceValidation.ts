interface BoundingBox {
    Width?: number;
    Height?: number;
    Left?: number;
    Top?: number;
}


export function validateFacePosition(boundingBox: BoundingBox): FaceValidationResult {
  const { Width = 0, Height = 0, Left = 0, Top = 0 } = boundingBox

  // Define acceptable ranges
  const MIN_FACE_COVERAGE = 0.2
  const MAX_FACE_COVERAGE = 0.8 
  const CENTER_THRESHOLD = 0.1 

  const faceCoverage = Width * Height
  const faceCenter = {
    x: Left + Width / 2,
    y: Top + Height / 2,
  }

  if (faceCoverage < MIN_FACE_COVERAGE) {
    return { isValid: false, message: "Please move closer to the camera" }
  }

  if (faceCoverage > MAX_FACE_COVERAGE) {
    return { isValid: false, message: "Please move further from the camera" }
  }

  if (Math.abs(faceCenter.x - 0.5) > CENTER_THRESHOLD) {
    return {
      isValid: false,
      message: faceCenter.x < 0.5 ? "Please move your face to the right" : "Please move your face to the left",
    }
  }

  if (Math.abs(faceCenter.y - 0.5) > CENTER_THRESHOLD) {
    return {
      isValid: false,
      message: faceCenter.y < 0.5 ? "Please move your face down" : "Please move your face up",
    }
  }

  return { isValid: true, message: "Face position is valid" }
}