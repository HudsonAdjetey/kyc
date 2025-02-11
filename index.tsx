"use client";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { FaCheckSquare } from "react-icons/fa";
import { detectFace, startCamera } from "@/lib/utils/index";
import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { FaCamera } from "react-icons/fa6";
import axios from "axios";

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
  const [faceStage, setFaceStage] = useState<
    "face" | "left" | "right" | "blink"
  >("face");
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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const captureImage = useCallback(async () => {
    if (!webCamRef.current) return;
    const imageData = webCamRef.current.getScreenshot();
    if (!imageData) throw new Error("Failed to capture image");
    onComplete(imageData);
    return imageData;
  }, [onComplete]);

  const handleVerification = async () => {
    if (!webCamRef.current || !stream || captured) return;
    let isMounted = true;
    let failedDetectionCount = 0;
    const MAX_FAILED_DETECTIONS = 10;
    const imageData = await captureImage();
    if (!imageData) {
      console.log("Failed to capture image");
    }
    setCapturedImage(imageData!);

    const interval = setInterval(async () => {
      if (!webCamRef.current || !webCamRef.current.video) {
        console.log("Webcam or video element is not available");
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

          if ((validFace && faceStage === "left") || faceStage === "right") {
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
        console.log("Face detection error:", error);
        setErrState(
          "Failed to detect face. Please ensure your face is visible and try again."
        );
      }
    }, 100);
  };
  const handleVerifiyImage = async (imageData: string) => {
    const response = await fetch("/api/verify-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageData,
        step: faceStage,
      }),
    });

    if (!response.ok) {
      console.log(response.json());
      return;
    }
    const result = await response.json();
    return result;
  };

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
        console.log("Webcam or video element is not available");
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
        console.log("Face detection error:", error);
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
    <div className="w-full  mx-auto px-2  py-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Step 2 of 5
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Identity Verification
        </h1>
        <p className="text-gray-600 mt-2">
          Please take a clear photo of your face
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {/* Camera Section */}
        <div className="relative  max-w-3xl mx-auto">
          {/* Status Overlay */}
          {!captured && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-gray-900/90 backdrop-blur text-white px-4 py-2 rounded-lg text-sm text-center min-w-[200px]">
                {detectionError ? (
                  <p className="text-red-400 animate-pulse">{detectionError}</p>
                ) : (
                  <>
                    {!validFace && (
                      <p>{err || "Position your face within the frame"}</p>
                    )}
                    {faceStage === "leftRight" && (
                      <div>
                        <p>Turn head slowly left and right</p>
                        <div className="flex justify-center gap-4 mt-2">
                          <span
                            className={`transition-colors duration-300 ${
                              leftFaceDetected
                                ? "text-green-400"
                                : "text-gray-400"
                            }`}
                          >
                            Left ✓
                          </span>
                          <span
                            className={`transition-colors duration-300 ${
                              rightFaceDetected
                                ? "text-green-400"
                                : "text-gray-400"
                            }`}
                          >
                            Right ✓
                          </span>
                        </div>
                      </div>
                    )}
                    {faceStage === "blink" && !blinkCompleted && (
                      <p>Blink naturally a few times</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {/* Guidelines */}
          <div className="max-w-2xl mx-auto  my-8">
            <div className="xl:flex items-start gap-3 hidden  text-gray-600 text-sm">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 mb-2">
                  Important Guidelines:
                </p>
                <ul className="space-y-2">
                  <li>• Ensure your face is well-lit and clearly visible</li>
                  <li>• Remove any sunglasses or face coverings</li>
                  <li>• Keep a neutral expression and look straight ahead</li>
                  <li>• Use a plain background if possible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Camera Container */}
          <div className="aspect-[5/5] max-w-xl mx-auto relative rounded-xl overflow-hidden border-2 border-gray-200">
            <div
              className={`absolute inset-0 border-2 ${
                validFace ? "border-green-500" : "border-gray-300"
              } rounded-xl transition-colors duration-300`}
            />

            {stream ? (
              <Webcam
                ref={webCamRef}
                audio={false}
                screenshotFormat="image/png"
                videoConstraints={{
                  facingMode: "user",
                  width: { min: 720, ideal: 1280 },
                  height: { min: 720, ideal: 1280 },
                  aspectRatio: 0.8,
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50">
                {image ? (
                  <Image
                    width={720}
                    height={900}
                    alt="profile"
                    src={image || "/placeholder.svg"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <FaCamera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Camera not initialized</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Indicators */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { label: "Face Detected", completed: validFace },
              { label: "Movement Check", completed: leftRightCompleted },
              { label: "Liveness Check", completed: blinkCompleted },
            ].map((status) => (
              <div
                key={status.label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    status.completed ? "bg-orange-500" : "bg-gray-200"
                  } transition-colors duration-300`}
                >
                  <FaCheckSquare
                    className={`w-4 h-4 ${
                      status.completed ? "text-white" : "text-gray-400"
                    }`}
                  />
                </div>
                <span className="text-sm text-gray-600">{status.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 max-w-md mx-auto">
          <button
            disabled={!validFace || !leftRightCompleted || !blinkCompleted}
            className="w-full py-3 px-4 bg-orange-500 text-white rounded-lg font-medium disabled:bg-gray-200 disabled:text-gray-400 transition-all duration-300 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            onClick={setStep}
          >
            Continue to Next Step
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Your photo will be used only for identity verification purposes
          </p>
        </div>
      </div>
    </div>
  );
};
