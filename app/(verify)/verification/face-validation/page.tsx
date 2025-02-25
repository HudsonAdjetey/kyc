"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { ArrowLeft, Camera, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";
import * as faceapi from "face-api.js";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface VerificationStep {
  id: string;
  title: string;
  instruction: string;
  completed: boolean;
}

interface CaptureResult {
  imageData: string;
  typeImage: string;
  verified: boolean;
}

const SelfieStep = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [results, setResults] = useState<CaptureResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAllverified, setAllIsVerifed] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showSteps, setShowSteps] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeInstruction, setActiveInstruction] = useState<string | null>(
    null
  );
  const router = useRouter();
  const instructionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [isWellLit, setIsWellLit] = useState<boolean>(false);
  const [facePosition, setFacePosition] = useState<"left" | "front" | "right">(
    "front"
  );
  const [detectionStarted, setDetectionStarted] = useState<boolean>(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const steps: VerificationStep[] = useMemo(
    () => [
      {
        id: "front",
        title: "Face Detection",
        instruction:
          "Position your face within the frame and look straight ahead",
        completed: false,
      },
      {
        id: "left",
        title: "Left Side",
        instruction: "Turn your head slightly to the left",
        completed: false,
      },
      {
        id: "right",
        title: "Right Side",
        instruction: "Turn your head slightly to the right",
        completed: false,
      },
      {
        id: "blink",
        title: "Blink Detection",
        instruction: "Blink naturally a few times",
        completed: false,
      },
    ],
    []
  );

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        ]);
        setIsModelLoaded(true);
        console.log("Face detection models loaded successfully");
      } catch (error) {
        console.error("Failed to load models:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Failed to load face detection models. Please refresh and try again.",
        });
      }
    };
    loadModels();
  }, [toast]);

  // Start face detection when camera is started and models are loaded
  useEffect(() => {
    if (isCapturing && isModelLoaded && !detectionStarted) {
      startFaceDetection();
      setDetectionStarted(true);
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCapturing, isModelLoaded]);

  const startFaceDetection = () => {
    if (videoRef.current) {
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          try {
            const detections = await faceapi
              .detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
              )
              .withFaceLandmarks();

            if (detections) {
              setFaceDetected(true);
              checkLighting(detections);
              checkLiveness(detections);
            } else {
              setFaceDetected(false);
              setIsWellLit(false);
            }
          } catch (error) {
            console.error("Error in face detection:", error);
          }
        }
      }, 150);
    }
  };

  const checkLighting = (
    detections: faceapi.WithFaceLandmarks<
      { detection: faceapi.FaceDetection },
      faceapi.FaceLandmarks68
    >
  ) => {
    if (videoRef.current && canvasRef.current) {
      const { x, y, width, height } = detections.detection.box;
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        ctx.drawImage(
          videoRef.current,
          x,
          y,
          width,
          height,
          0,
          0,
          width,
          height
        );
        const imageData = ctx.getImageData(0, 0, width, height);
        const brightness = calculateBrightness(imageData.data);
        setIsWellLit(brightness > 50);
      }
    }
  };

  const calculateBrightness = (data: Uint8ClampedArray) => {
    let r, g, b, avg;
    let colorSum = 0;
    for (let x = 0, len = data.length; x < len; x += 4) {
      r = data[x];
      g = data[x + 1];
      b = data[x + 2];

      avg = Math.floor((r + g + b) / 3);
      colorSum += avg;
    }
    return Math.floor(colorSum / (data.length / 4));
  };

  const checkLiveness = (
    detections: faceapi.WithFaceLandmarks<
      { detection: faceapi.FaceDetection },
      faceapi.FaceLandmarks68
    >
  ) => {
    const landmarks = detections.landmarks;
    const jawOutline = landmarks.getJawOutline();
    const nose = landmarks.getNose();

    const newFacePosition = getFacePosition(jawOutline, nose);
    setFacePosition(newFacePosition);

    if (!isWellLit) {
      return;
    }

    const currentStepId = steps[currentStep].id;
    console.log(currentStepId);

    // For left step, we require left position and auto-capture
    if (currentStepId === "left" && newFacePosition === "left") {
      alert("Left position");
    }
    // For right step, we require right position and auto-capture
    else if (currentStepId === "right" && newFacePosition === "right") {
      alert("Right position");
    }
    // For blink step, detect eyes closed
  };

  const getFacePosition = (
    jawOutline: faceapi.Point[],
    nose: faceapi.Point[]
  ): "left" | "front" | "right" => {
    const jawWidth = jawOutline[16].x - jawOutline[0].x;
    const nosePosition = (nose[3].x - jawOutline[0].x) / jawWidth;

    if (nosePosition < 0.45) return "right";
    if (nosePosition > 0.55) return "left";
    return "front";
  };

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: error,
        duration: 3000,
      });
      setError(null);
    }
  }, [error, toast]);

  useEffect(() => {
    const verifiedSteps = steps.filter((step) =>
      results.some((result) => result.typeImage === step.id && result.verified)
    ).length;
    const newProgress = (verifiedSteps / steps.length) * 100;
    setProgress(newProgress);
  }, [results, steps]);

  const startCamera = useCallback(async () => {
    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (err) {
      console.error("Camera access error:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description:
          "Unable to access camera. Please ensure you have granted permissions.",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsCapturing(false);
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      setDetectionStarted(false);
    }
  }, []);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        return canvasRef.current.toDataURL("image/jpeg");
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setShowSteps(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isCapturing) return;

    const showInstruction = () => {
      setActiveInstruction(steps[currentStep].instruction);
      toast({
        title: steps[currentStep].title,
        description: steps[currentStep].instruction,
      });

      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
      }

      instructionTimeoutRef.current = setTimeout(() => {
        setActiveInstruction(null);
      }, 5000);
    };

    showInstruction();

    return () => {
      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
      }
    };
  }, [currentStep, isCapturing, steps, toast]);

  const verifyImage = useCallback(
    async (imageData: string) => {
      try {
        const response = await fetch("/api/verify-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: imageData,
            imageType: steps[currentStep].id,
            userId: "23323",
          }),
        });

        const result = await response.json();
        console.log(result);
        if (!result.success) {
          toast({
            variant: "destructive",
            title: "Verification Failed",
            description: `Please ensure your ${steps[
              currentStep
            ].title.toLowerCase()} is clearly visible`,
          });
          console.log("Verification failed");
          return false;
        }

        // if (!result.verified) {
        //   toast({
        //     variant: "destructive",
        //     title: "Verification Failed",
        //     description:
        //       result.message ||
        //       `Please ensure your ${steps[
        //         currentStep
        //       ].title.toLowerCase()} is clearly visible`,
        //   });
        //   return false;
        // }

        return true;
      } catch (err) {
        console.error("Verification error:", err);
        toast({
          variant: "destructive",
          title: "Verification Error",
          description: "Please try again",
        });
        return false;
      }
    },
    [currentStep, steps, toast]
  );

  const handleCapture = useCallback(async () => {
    const imageData = captureImage();

    if (!imageData) {
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: "Failed to capture image. Please try again.",
      });
      return;
    }
    setIsProcessing(true);

    try {
      const verified = await verifyImage(imageData);
      console.log(verified);
      if (!verified) {
        setIsProcessing(false);
        return;
      }

      setResults((prev) => [
        ...prev,
        { typeImage: steps[currentStep].id, verified, imageData },
      ]);
      setCurrentStep(1);

      toast({
        title: "Step Completed",
        description: "Moving to next step",
      });
    } catch (error) {
      console.error("Capture error:", error);
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: "Please try again",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [captureImage, currentStep, steps, toast, verifyImage]);

  // For left position capture
  useEffect(() => {
    if (steps[currentStep].id !== "left") return;

    let isMount = true;
    const handleLeftCapture = async () => {
      while (isMount) {
        // Add checks for face detection and lighting
        if (!faceDetected || !isWellLit || facePosition !== "left") {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        const imageData = captureImage();

        if (!imageData) {
          toast({
            variant: "destructive",
            title: "Capture Failed",
            description: "Failed to capture left position. Please try again.",
          });
          break;
        }
        try {
          setIsProcessing(true);
          const isVerified = await verifyImage(imageData);

          if (isVerified) {
            setResults((prev) => [
              ...prev,
              { typeImage: "left", imageData, verified: true },
            ]);
            setCurrentStep(2);

            toast({
              title: "Left Position Detected",
              description: "Left position verification successful",
            });
            break;
          }
        } catch (error) {
          console.log(error);
          toast({
            variant: "destructive",
            title: "Verification Error",
            description: "Please try again",
          });
        } finally {
          setIsProcessing(false);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };
    handleLeftCapture();
    return () => {
      isMount = false;
    };
  }, [
    captureImage,
    currentStep,
    faceDetected,
    isWellLit,
    facePosition,
    steps,
    toast,
    verifyImage,
  ]);

  // For right position capture
  useEffect(() => {
    if (steps[currentStep].id !== "right") return;

    let isMount = true;
    const handleRightCapture = async () => {
      while (isMount) {
        // Add checks for face detection and lighting
        if (!faceDetected || !isWellLit || facePosition !== "right") {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        const imageData = captureImage();

        if (!imageData) {
          toast({
            variant: "destructive",
            title: "Capture Failed",
            description: "Failed to capture right position. Please try again.",
          });
          break;
        }
        try {
          setIsProcessing(true);
          const isVerified = await verifyImage(imageData);

          if (isVerified) {
            setResults((prev) => [
              ...prev,
              { typeImage: "right", imageData, verified: true },
            ]);
            setCurrentStep(3);

            toast({
              title: "Right Position Detected",
              description: "Right position verification successful",
            });
            break;
          }
        } catch (error) {
          console.log(error);
          toast({
            variant: "destructive",
            title: "Verification Error",
            description: "Please try again",
          });
        } finally {
          setIsProcessing(false);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };
    handleRightCapture();
    return () => {
      isMount = false;
    };
  }, [
    captureImage,
    currentStep,
    faceDetected,
    isWellLit,
    facePosition,
    steps,
    toast,
    verifyImage,
  ]);

  // For blink detection
  useEffect(() => {
    if (steps[currentStep].id !== "blink") return;

    let isMounted = true;

    const handleBlinkDetection = async () => {
      while (isMounted) {
        // Add checks for face detection and lighting
        if (!faceDetected || !isWellLit) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        const imageData = captureImage();

        if (!imageData) {
          toast({
            variant: "destructive",
            title: "Capture Failed",
            description: "Failed to capture blink. Please try again.",
          });
          break;
        }

        try {
          setIsProcessing(true);
          const isVerified = await verifyImage(imageData);

          if (isVerified) {
            setResults((prev) => [
              ...prev,
              { typeImage: "blink", imageData, verified: true },
            ]);
            toast({
              title: "Blink Detected",
              description: "Blink verification successful",
            });
            setAllIsVerifed(true);
            break;
          }
        } catch (error) {
          console.log(error);
          toast({
            variant: "destructive",
            title: "Blink Detection Error",
            description: "Please ensure good lighting and face visibility",
          });
        } finally {
          setIsProcessing(false);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    handleBlinkDetection();

    return () => {
      isMounted = false;
    };
  }, [
    steps,
    currentStep,
    faceDetected,
    isWellLit,
    captureImage,
    verifyImage,
    toast,
  ]);

  useEffect(() => {
    if (isAllverified) {
      // stop the camera
      stopCamera();
    }
  }, [isAllverified, stopCamera]);

  const getBorderColor = () => {
    if (!faceDetected) return "border-gray-400";
    if (!isWellLit) return "border-yellow-400";

    if (steps[currentStep].id === "front" && facePosition === "front") {
      return "border-green-500";
    } else if (steps[currentStep].id === "left" && facePosition === "left") {
      return "border-green-500";
    } else if (steps[currentStep].id === "right" && facePosition === "right") {
      return "border-green-500";
    } else if (steps[currentStep].id === "blink") {
      return isWellLit ? "border-green-500" : "border-yellow-400";
    }

    return "border-red-500";
  };

  const isCheckButtonEnabled = () => {
    if (!faceDetected || !isWellLit || isProcessing) return false;

    const currentStepId = steps[currentStep].id;
    if (currentStepId === "front") {
      return facePosition === "front";
    }

    return false;
  };

  useEffect(() => {
    if (isAllverified) return;

    const isVerificationComplete = steps.every((step) =>
      results.some((result) => result.typeImage === step.id && result.verified)
    );

    if (isVerificationComplete) {
      setAllIsVerifed(true);
      setIsProcessing(false);
      toast({
        title: "Verification Complete",
        description: "All steps completed successfully",
      });
    }
  }, [results, steps, isAllverified, toast]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100">
      <Toaster />
      <div className="h-full flex flex-col">
        {/* Header Section */}
        <div className="px-4 py-3 bg-white/95 backdrop-blur-sm shadow-sm  ">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <h1 className="text-xl font-semibold text-gray-900">
                  Identity Verification
                </h1>
                <span className="bg-orange-500 text-white w-fit px-3 py-1 rounded-full text-sm font-medium mt-1 sm:mt-0">
                  Step 2 of 5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative overflow-y-auto">
          {isCapturing && steps[currentStep].id === "right" && (
            <Alert className="fixed mg-10 bg-green-400  max-w-md mx-auto inset-x-0 shadow-md z-20 rounded-none border-t-0 border-x-0">
              <AlertDescription className="text-base font-medium text-center">
                Please turn your head to the right and hold position
              </AlertDescription>
            </Alert>
          )}
          {isCapturing && steps[currentStep].id === "left" && (
            <Alert className="fixed mg-10 bg-green-400  max-w-md mx-auto inset-x-0 shadow-md z-20 rounded-none border-t-0 border-x-0">
              <AlertDescription className="text-base font-medium text-center">
                Please turn your head to the left and hold position
              </AlertDescription>
            </Alert>
          )}

          {isCapturing && steps[currentStep].id === "front" && (
            <Alert className="fixed mg-10 bg-green-400  max-w-md mx-auto inset-x-0 shadow-md z-20 rounded-none border-t-0 border-x-0">
              <AlertDescription className="text-base font-medium text-center">
                Please look straight ahead and hold position
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 mb-4 px-4 max-w-4xl mx-auto">
            {/* Progress Steps - Mobile Friendly */}
            <div className="mb-6">
              <div className="grid max-sm:hidden grid-cols-4 gap-2 sm:gap-4 mb-4">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="relative flex flex-col items-center"
                  >
                    <div
                      className={`w-8 h-8 sm:w-10  sm:h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                        index < currentStep
                          ? "bg-green-500 text-white"
                          : index === currentStep
                          ? "bg-green-500 text-white ring-4 ring-green-100"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {index < currentStep ? (
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <span className="text-sm sm:text-base">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-600 text-center leading-tight">
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div
                        className={`absolute top-4 sm:top-5 left-[60%] w-full h-[2px] ${
                          index < currentStep ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Progress
                value={progress}
                className="h-1.5 w-full max-w-2xl mx-auto bg-gray-100 transition-all duration-300"
              />
            </div>

            {/* Camera Container with Responsive Aspect Ratio */}
            <div className="relative w-full max-w-2xl mx-auto">
              <div
                className={`relative aspect-[6/7] sm:aspect-[6/5] bg-black rounded-2xl overflow-hidden shadow-lg mb-4 transition-all duration-300 border-4 `}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {!isModelLoaded && isCapturing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="text-center px-4">
                      <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
                      <h3 className="text-white text-lg font-medium mb-2">
                        Initializing Secure Verification
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Setting up advanced face detection...
                      </p>
                    </div>
                  </div>
                )}

                {!isCapturing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="text-center px-6">
                      <div className="bg-orange-500/20 p-6 rounded-full inline-block mb-6">
                        <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
                      </div>
                      <h3 className="text-white text-xl sm:text-2xl font-medium mb-3">
                        {isAllverified
                          ? "Verification Complete!"
                          : "Face Verification"}
                      </h3>
                      <p className="text-gray-300 text-sm mb-6 max-w-xs mx-auto">
                        {isAllverified
                          ? "Your face has been verified successfully!"
                          : "We will guide you through the process of verifying your face."}
                      </p>
                      {!isAllverified && (
                        <Button
                          onClick={startCamera}
                          size="lg"
                          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-7 rounded-xl flex items-center gap-2 mx-auto transform hover:scale-105 transition-all duration-300"
                        >
                          <Camera className="h-6 w-6" />
                          Start Verification
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {isCapturing && (
                  <div className="absolute inset-0  flex flex-col items-center justify-center">
                    {/* Oval Face Guide - More Visible on Mobile */}
                    <div
                      className={`w-[88%] ${getBorderColor()} border-4 sm:w-[70%] h-[90%] rounded-full pointer-events-none transition-all duration-300 ${
                        faceDetected ? "opacity-75" : "opacity-40"
                      }`}
                      style={{
                        borderRadius: "50%",
                      }}
                    ></div>

                    {/* Status Indicators - Enhanced for Mobile */}
                    <div className="absolute top-4 inset-x-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <div className="space-y-2 sm:space-y-2">
                        <div
                          className={`flex items-center gap-2 w-fit bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm ${
                            faceDetected ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full animate-pulse ${
                              faceDetected ? "bg-green-400" : "bg-red-400"
                            }`}
                          />
                          <span className="text-xs sm:text-sm">
                            Face {faceDetected ? "Detected" : "Not Found"}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-2 w-fit bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm ${
                            isWellLit ? "text-green-400" : "text-yellow-400"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full animate-pulse ${
                              isWellLit ? "bg-green-400" : "bg-yellow-400"
                            }`}
                          />
                          <span className="text-xs sm:text-sm">
                            Lighting {isWellLit ? "Good" : "Adjust"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Mobile Friendly */}
                    {isCapturing && currentStep === 0 && !isAllverified && (
                      <div className="absolute bottom-2 sm:bottom-8 inset-x-0 flex items-center justify-between px-12 gap-8">
                        <button
                          onClick={stopCamera}
                          className="bg-white/90 hover:bg-white rounded-full p-3 transition-all duration-300"
                        >
                          <X className="h-6 w-6 text-red-500" />
                        </button>
                        <button
                          onClick={handleCapture}
                          disabled={!isCheckButtonEnabled()}
                          className={`bg-white/90 hover:bg-white rounded-full p-3 transition-all duration-300 ${
                            !isCheckButtonEnabled()
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                          ) : (
                            <Check className="h-6 w-6 text-green-500" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Processing Overlay - Enhanced for Mobile */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-xs mx-auto">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500/10 animate-ping rounded-full" />
                          <Loader2 className="h-8 w-8 animate-spin text-green-500 relative" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-gray-900">
                            Verifying...
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Please maintain your position
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Continue Button - Mobile Optimized */}
              {isAllverified && (
                <div className=" p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 sm:relative sm:bg-transparent sm:border-0 sm:p-0">
                  <Button
                    onClick={() =>
                      router.push("/verification/document-verification/")
                    }
                    className="w-full py-7 sm:py-6 bg-orange-500 hover:bg-green-600 text-white font-medium text-base sm:text-lg rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-300"
                  >
                    Continue to Next Step
                  </Button>
                </div>
              )}

              {/* Security Notice - Mobile Friendly */}
              <div className="mt-4 text-center px-4">
                <div className="inline-flex items-center gap-2 text-gray-500 text-xs sm:text-sm bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Your data is encrypted and securely processed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfieStep;
