"use client";
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
interface FaceVerificationProps {
  webCamRef: React.RefObject<Webcam>;
  onComplete: () => void;
}

const FaceVerification = ({ webCamRef, onComplete }: FaceVerificationProps) => {
  const [modelIsLoaded, setModelIsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [leftPose, setLeftPose] = useState(false);
  const [rightPose, setRightPose] = useState(false);
  const [blinkedDected, setBlinkedDected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadedModels = async () => {
      const MODEL_URI = "/models";
      await Promise.all([
        faceapi.loadFaceLandmarkModel(
          MODEL_URI + "/face_landmarks_68_face_landmark.json"
        ),
        faceapi.loadFaceRecognitionModel(
          MODEL_URI +
            "/face_recognition_resnet_v1_5_face_recognition_model-weights_bin.json"
        ),
        faceapi.loadFaceExpressionModel(
          MODEL_URI + "/face_expression_model-weights_manifest.json"
        ),
        faceapi.loadSsdMobilenetv1Model(
          MODEL_URI + "/ssd_mobilenetv1_face_model-weights_manifest.json"
        ),
      ]);
      setModelIsLoaded(true);
    };
    loadedModels();
  }, []);

  useEffect(() => {
    if (modelIsLoaded && webCamRef.current && canvasRef.current) {
      const interval = setInterval(async () => {
        const video = webCamRef.current?.video;
        if (!video) return;
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections.length > 0 && canvasRef.current) {
          setFaceDetected(true);
          const detection = detections[0];
          const canvas = canvasRef.current;
          const displaySize = { width: video.width, height: video.height };
          faceapi.matchDimensions(canvas!, displaySize);
          const resizedDetections = faceapi.resizeResults(
            detection,
            displaySize
          );
          canvas
            ?.getContext("2d")
            ?.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          //   check face pose
          const jawOutline = detection.landmarks.getJawOutline();
          const leftJaw = jawOutline[0];
          const rightJaw = jawOutline[jawOutline.length - 1];
          const jawWidth = rightJaw.x - leftJaw.x;
          const jawCenter = (leftJaw.x + rightJaw.x) / 2;
          const noseTip = detection.landmarks.getNose()[3];
          const poseOffset = (noseTip.x - jawCenter) / jawWidth;

          if (poseOffset < -0.2) {
            setLeftPose(true);
          } else if (poseOffset > 0.2) {
            setRightPose(true);
          }

          //   check for blink
          const leftEye = detection.landmarks.getLeftEye();
          const rightEye = detection.landmarks.getRightEye();
          const leftEyeAspectRatio = getEyeAspectRatio(leftEye);
          const rightEyeAspectRatio = getEyeAspectRatio(rightEye);
          const averageEar = (leftEyeAspectRatio + rightEyeAspectRatio) / 2;
          if (averageEar < 0.2) {
            setBlinkedDected(true);
          } else {
            setBlinkedDected(false);
          }
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [modelIsLoaded, webCamRef]);

  useEffect(() => {
    if (faceDetected && leftPose && rightPose && blinkedDected) {
      onComplete();
    }
  }, [faceDetected, leftPose, rightPose, blinkedDected, onComplete]);

  const getEyeAspectRatio = (eye: faceapi.Point[]) => {
    const verticalDist1 = faceapi.euclideanDistance(
      [eye[1].x, eye[1].y],
      [eye[5].x, eye[5].y]
    );
    const verticalDist2 = faceapi.euclideanDistance(
      [eye[2].x, eye[2].y],
      [eye[4].x, eye[4].y]
    );
    const horizontalDist = faceapi.euclideanDistance(
      [eye[0].x, eye[0].y],
      [eye[3].x, eye[3].y]
    );
    return (verticalDist1 + verticalDist2) / (2 * horizontalDist);
  };

  return (
    <div className="relative">
      <Webcam
        ref={webCamRef}
        audio={false}
        width={640}
        height={480}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "user`" }}
      />
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Face Verification</h2>
        <ul className="list-disc list-inside">
          <li className={faceDetected ? "text-green-500" : "text-red-500"}>
            Face Detected: {faceDetected ? "Yes" : "No"}
          </li>
          <li className={leftPose ? "text-green-500" : "text-red-500"}>
            Left Pose: {leftPose ? "Done" : "Turn your head to the left"}
          </li>
          <li className={rightPose ? "text-green-500" : "text-red-500"}>
            Right Pose: {rightPose ? "Done" : "Turn your head to the right"}
          </li>
          <li className={blinkedDected ? "text-green-500" : "text-red-500"}>
            Blink Detected: {blinkedDected ? "Yes" : "Please blink"}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FaceVerification;
