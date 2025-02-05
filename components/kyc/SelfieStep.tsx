"use client";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { FaCheckSquare } from "react-icons/fa";
import { Label } from "@/components/ui/label";
import { detectFace, startCamera } from "@/lib/utils/index";
import Image from "next/image";

interface SelfieStepProps {
  onComplete: (image: string) => void;
  setStep: () => void;
  image: string;
}

export const SelfieStep: React.FC<SelfieStepProps> = ({
  onComplete,
  setStep,
  image,
}) => {
  const [faceStage, setFaceStage] = useState<"face" | "leftRight" | "blink">(
    "face"
  );
  const [validFace, setValidFace] = useState(false);
  const [leftFaceDetected, setLeftFaceDetected] = useState(false);
  const [rightFaceDetected, setRightFaceDetected] = useState(false);
  const [leftRightCompleted, setLeftRightCompleted] = useState(false);
  const [blinkCompleted, setBlinkCompleted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [lastBlinkTime, setLastBlinkTime] = useState(0);
  const [consecutiveBlinkFrames, setConsecutiveBlinkFrames] = useState(0);
  const [leftTurnStartTime, setLeftTurnStartTime] = useState(0);
  const [rightTurnStartTime, setRightTurnStartTime] = useState(0);
  const [captured, setCaptured] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [err, setErrState] = useState<string | null>(null);
  const webCamRef = useRef<Webcam>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const captureImage = useCallback(async () => {
    if (!webCamRef.current) return;
    const imageData = webCamRef.current.getScreenshot();
    if (!imageData) throw new Error("Failed to capture image");
    onComplete(imageData);
  }, [onComplete]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const initializeCamera = useCallback(async () => {
    try {
      const mediaStream = await startCamera();
      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (error) {
      setErrState(
        error instanceof Error ? error.message : "Failed to start camera"
      );
    }
  }, [setErrState]);

  useEffect(() => {
    if (!captured) {
      initializeCamera();
    }
    return () => {
      stopCamera();
    };
  }, [initializeCamera, stopCamera, captured]);

  useEffect(() => {
    if (!webCamRef.current || !stream || captured) return;

    let isMounted = true;
    let failedDetectionCount = 0;
    const MAX_FAILED_DETECTIONS = 10;

    const interval = setInterval(async () => {
      if (!webCamRef.current || !webCamRef.current.video) {
        console.error("Webcam or video element is not available");
        setErrState("Camera is not ready. Please wait or refresh the page.");
        return;
      }

      try {
        const result = await detectFace(webCamRef?.current?.video);
        if (!isMounted) return;

        if (result.faceDetected) {
          failedDetectionCount = 0;
          setDetectionError(null);

          const currentTime = Date.now();

          if (result.faceWithinValidArea) {
            if (result.centerFaceValid) {
              setValidFace(true);
              if (faceStage === "face") {
                setFaceStage("leftRight");
              }
            } else {
              setValidFace(false);
              if (result.horizontalOffsetPercentage > 15) {
                setErrState(
                  result.horizontalOffsetPercentage > 0
                    ? "Move slightly left"
                    : "Move slightly right"
                );
              } else if (result.verticalOffsetPercentage > 15) {
                setErrState(
                  result.verticalOffsetPercentage > 0
                    ? "Move slightly up"
                    : "Move slightly down"
                );
              } else {
                setErrState("Keep your face centered");
              }
            }
          } else {
            setValidFace(false);
            setErrState("Move closer to the center");
          }

          if (validFace && faceStage === "leftRight") {
            if (!leftFaceDetected && result.leftFaceValid) {
              if (!leftTurnStartTime) {
                setLeftTurnStartTime(currentTime);
              } else if (currentTime - leftTurnStartTime >= 1000) {
                setLeftFaceDetected(true);
              }
            } else if (!result.leftFaceValid && !leftFaceDetected) {
              setLeftTurnStartTime(0);
            }

            if (!rightFaceDetected && result.rightFaceValid) {
              if (!rightTurnStartTime) {
                setRightTurnStartTime(currentTime);
              } else if (currentTime - rightTurnStartTime >= 1000) {
                setRightFaceDetected(true);
              }
            } else if (!result.rightFaceValid && !rightFaceDetected) {
              setRightTurnStartTime(0);
            }

            if (leftFaceDetected && rightFaceDetected) {
              setLeftRightCompleted(true);
              setFaceStage("blink");
            }
          }

          if (validFace && leftRightCompleted && faceStage === "blink") {
            if (result.blinkConfidence > 0.8) {
              setConsecutiveBlinkFrames((prev) => prev + 1);
              if (
                consecutiveBlinkFrames >= 3 &&
                currentTime - lastBlinkTime > 500
              ) {
                setBlinkCount((prev) => prev + 1);
                setLastBlinkTime(currentTime);
                setConsecutiveBlinkFrames(0);
              }
            } else {
              setConsecutiveBlinkFrames(0);
            }

            if (blinkCount >= 2) {
              setBlinkCompleted(true);
            }
          }

          if (!captured && validFace && leftRightCompleted && blinkCompleted) {
            clearInterval(interval);
            setCaptured(true);
            await captureImage();
            stopCamera();
          }

          setErrState(null);
        } else {
          failedDetectionCount++;
          if (failedDetectionCount >= MAX_FAILED_DETECTIONS) {
            setDetectionError(
              "Face detection is struggling. Please check your lighting and camera position."
            );
          }
          setValidFace(false);
          setErrState("No face detected. Please ensure your face is visible.");
        }
      } catch (error) {
        console.error("Face detection error:", error);
        setErrState(
          "Failed to detect face. Please ensure your face is visible and try again."
        );
      }
    }, 100);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    stream,
    captured,
    validFace,
    faceStage,
    leftFaceDetected,
    rightFaceDetected,
    leftRightCompleted,
    blinkCompleted,
    blinkCount,
    lastBlinkTime,
    consecutiveBlinkFrames,
    leftTurnStartTime,
    rightTurnStartTime,
    captureImage,
    stopCamera,
    setErrState,
  ]);

  useEffect(() => {
    const blinkResetTimeout = setTimeout(() => {
      if (Date.now() - lastBlinkTime > 3000) {
        setBlinkCount(0);
      }
    }, 3000);

    return () => clearTimeout(blinkResetTimeout);
  }, [lastBlinkTime]);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="space-y-3">
        <p className="text-lg text-gray-400">STEP 2</p>
        <h1 className="text-3xl max-md:text-xl text-green-500">Selfie</h1>
      </div>

      {/* Face Detection Status */}
      <div className="max-w-xl relative mt-10 flex flex-col items-center mx-auto">
        {!captured && (
          <div className="absolute -top-32 my-10 text-white text-sm text-center space-y-2 bg-black/50 p-2 rounded">
            {detectionError ? (
              <p className="text-red-400">{detectionError}</p>
            ) : (
              <>
                {!validFace && (
                  <p>{err || "Position your face within the circle"}</p>
                )}

                {faceStage === "leftRight" && (
                  <>
                    <p>Slowly turn your head left and right</p>
                    <p>
                      Left: {leftFaceDetected ? "✅" : "❌"} Right:{" "}
                      {rightFaceDetected ? "✅" : "❌"}
                    </p>
                  </>
                )}

                {faceStage === "blink" && !blinkCompleted && (
                  <>
                    <p>Blink your eyes a few times</p>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Camera Container */}
        <div className="w-[350px] mt-10 max-w-xs h-[380px] rounded-full border-green-500 border-dashed relative border overflow-hidden">
          {stream ? (
            <>
              <Webcam
                ref={webCamRef}
                audio={false}
                screenshotFormat="image/png"
                videoConstraints={{ facingMode: "user" }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {image ? (
                <Image
                  width={300}
                  height={300}
                  alt="profile"
                  src={image || "/placeholder.svg"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <p>Camera not started</p>
              )}
            </div>
          )}
        </div>

        {/* Status Checkmarks */}
        <div className="my-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <FaCheckSquare
              size={30}
              className={validFace ? "text-green-400" : "text-gray-300"}
            />
            <Label className="text-gray-600 text-lg">Valid Face</Label>
          </div>
          <div className="flex items-center gap-4">
            <FaCheckSquare
              size={30}
              className={
                leftRightCompleted ? "text-green-400" : "text-gray-300"
              }
            />
            <Label className="text-gray-600 text-lg">Left & Right</Label>
          </div>
          <div className="flex items-center gap-4">
            <FaCheckSquare
              size={30}
              className={blinkCompleted ? "text-green-400" : "text-gray-300"}
            />
            <Label className="text-gray-600 text-lg">Blink Eyes</Label>
          </div>
        </div>

        {/* Proceed Button */}
        <button
          disabled={!validFace || !leftRightCompleted || !blinkCompleted}
          className="py-4 mx-auto text-white mt-6 w-full bg-orange-400 disabled:bg-orange-100 rounded-md disabled:select-none transition-all duration-300"
          onClick={setStep}
        >
          Proceed
        </button>
      </div>
    </div>
  );
};
