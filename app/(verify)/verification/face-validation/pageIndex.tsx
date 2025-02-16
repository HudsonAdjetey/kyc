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

const steps = [
  {
    id: "face",
    title: "Front Face",
    instruction: "Position your face within the circle and look straight ahead",
    ariaLabel: "Front face capture step",
    completed: false,
  },
  {
    id: "left",
    title: "Left Side",
    instruction: "Slowly turn your head to the left side",
    ariaLabel: "Left profile capture step",
    completed: false,
  },
  {
    id: "right",
    title: "Right Side",
    instruction: "Slowly turn your head to the right side",
    ariaLabel: "Right profile capture step",
    completed: false,
  },
  {
    id: "blink",
    title: "Blink Check",
    instruction: "Blink your eyes naturally",
    ariaLabel: "Blink verification step",
    completed: false,
  },
];

const SelfieStep = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isWellLit, setIsWellLit] = useState(false);
  const [facePosition, setFacePosition] = useState<"left" | "right" | "center" | null>(null);
  const [results, setResults] = useState<Array<{ typeImage: string; verified: boolean; imageData: string }>>([]);
  const [loadingState, setLoadingState] = useState<"initial" | "loading-models" | "starting-camera" | "ready" | "error">("initial");
  const [autoCapture, setAutoCapture] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const instructionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = useMemo(() => {
    const completedSteps = results.length;
    return (completedSteps / steps.length) * 100;
  }, [results.length]);

  const isAllverified = useMemo(() => {
    return results.length === steps.length;
  }, [results.length]);

  // Load models with better error handling
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingState("loading-models");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        ]);
        setIsModelLoaded(true);
        setLoadingState("starting-camera");
        console.log("Face detection models loaded successfully");
      } catch (error) {
        console.error("Failed to load models:", error);
        setLoadingState("error");
        toast({
          variant: "destructive",
          title: "Error Loading Models",
          description: "Failed to initialize face detection. Please check your internet connection and refresh the page.",
        });
      }
    };
    loadModels();
  }, [toast]);

  // Enhanced camera initialization
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setLoadingState("ready");
        setIsCapturing(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setLoadingState("error");
      toast({
        variant: "destructive",
        title: "Camera Access Error",
        description: "Unable to access your camera. Please ensure you've granted camera permissions and try again.",
      });
    }
  }, [toast]);

  // Improved loading state UI
  if (loadingState !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4 bg-gray-50">
        <div className="text-center space-y-2">
          {loadingState === "loading-models" && (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
              <p className="text-lg font-medium">Loading face detection models...</p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </>
          )}
          {loadingState === "starting-camera" && (
            <>
              <Camera className="w-8 h-8 mx-auto text-green-600" />
              <p className="text-lg font-medium">Initializing camera...</p>
              <p className="text-sm text-gray-500">Please grant camera access when prompted</p>
            </>
          )}
          {loadingState === "error" && (
            <>
              <X className="w-8 h-8 mx-auto text-red-600" />
              <p className="text-lg font-medium text-red-600">Something went wrong</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Mobile detection
  const [isMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
    return false;
  });

  // Add debounce utility
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Debounced verify function
  const debouncedVerify = useCallback(
    debounce(async (imageData: string, stepId: string) => {
      if (!autoCapture) return;
      
      try {
        setIsProcessing(true);
        const isVerified = await verifyImage(imageData);

        if (isVerified) {
          setResults((prev) => [
            ...prev,
            { typeImage: stepId, imageData, verified: true },
          ]);

          // Update step and progress
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);
          
          toast({
            title: `${steps[currentStep].title} Verified`,
            description: "Moving to next step",
          });

          // Disable auto-capture after successful verification
          setAutoCapture(false);
        }
      } catch (error) {
        console.error("Verification error:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 1000),
    [autoCapture, currentStep, steps, toast, verifyImage]
  );

  // Enhanced face detection with auto-capture
  useEffect(() => {
    if (!isCapturing || !isModelLoaded || isProcessing) return;

    const currentStepId = steps[currentStep].id;
    
    // Enable auto-capture for specific steps
    if (["left", "right", "blink"].includes(currentStepId)) {
      setAutoCapture(true);
    }

    // Check if conditions are met for auto-capture
    if (autoCapture && faceDetected && isWellLit) {
      const shouldCapture = 
        (currentStepId === "left" && facePosition === "left") ||
        (currentStepId === "right" && facePosition === "right") ||
        currentStepId === "blink";

      if (shouldCapture) {
        const imageData = captureImage();
        if (imageData) {
          debouncedVerify(imageData, currentStepId);
        }
      }
    }
  }, [
    isCapturing,
    isModelLoaded,
    currentStep,
    facePosition,
    faceDetected,
    isWellLit,
    autoCapture,
    isProcessing,
    steps,
    debouncedVerify,
    captureImage,
  ]);

  // Reset auto-capture when step changes
  useEffect(() => {
    setAutoCapture(false);
  }, [currentStep]);

  // Enhanced face detection with better feedback
  const startFaceDetection = useCallback(() => {
    if (!videoRef.current || detectionIntervalRef.current) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !isModelLoaded) return;

      try {
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detections) {
          setFaceDetected(true);

          // Calculate face position
          const videoWidth = videoRef.current.videoWidth;
          const faceX = detections.detection.box.x;
          const faceCenter = faceX + (detections.detection.box.width / 2);
          const threshold = videoWidth / 6;

          if (faceCenter < videoWidth / 2 - threshold) {
            setFacePosition("left");
          } else if (faceCenter > videoWidth / 2 + threshold) {
            setFacePosition("right");
          } else {
            setFacePosition("center");
          }

          // Check lighting conditions
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const imageData = ctx.getImageData(
              detections.detection.box.x,
              detections.detection.box.y,
              detections.detection.box.width,
              detections.detection.box.height
            );
            const brightness = calculateBrightness(imageData.data);
            setIsWellLit(brightness > 100); // Threshold can be adjusted
          }
        } else {
          setFaceDetected(false);
          setFacePosition(null);
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    }, 100);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isModelLoaded]);

  // Helper function to calculate image brightness
  const calculateBrightness = (data: Uint8ClampedArray) => {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (0.2126 * data[i]) + (0.7152 * data[i + 1]) + (0.0722 * data[i + 2]);
    }
    return sum / (data.length / 4);
  };

  // Feedback component
  const FeedbackOverlay = () => (
    <div className="absolute inset-0 pointer-events-none">
      <div className={`
        absolute top-4 left-1/2 transform -translate-x-1/2 
        px-4 py-2 rounded-full 
        transition-all duration-300
        ${faceDetected ? 'bg-green-500' : 'bg-red-500'}
        ${isWellLit ? 'opacity-0' : 'opacity-100'}
      `}>
        <p className="text-white text-sm font-medium">
          {!faceDetected ? 'No face detected' :
           !isWellLit ? 'Please move to a better lit area' :
           facePosition === 'left' ? 'Move your face right' :
           facePosition === 'right' ? 'Move your face left' :
           'Perfect position!'}
        </p>
      </div>
      
      <div className={`
        absolute inset-0 border-4 rounded-full m-4
        transition-colors duration-300
        ${faceDetected && isWellLit && facePosition === 'center' ? 'border-green-500' : 'border-yellow-500'}
      `} />
    </div>
  );

  const handleCapture = async () => {
    if (isProcessing) return;
    
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
      if (!verified) {
        return;
      }

      setResults((prev) => [
        ...prev,
        { typeImage: steps[currentStep].id, verified, imageData },
      ]);
      
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

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
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className={`
        relative mx-auto max-w-md p-4
        ${isMobile ? 'h-screen' : 'min-h-[600px] mt-8 rounded-lg shadow-lg'}
      `}>
        {/* Progress indicator */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <Progress value={progress} className="h-1" />
        </div>

        {/* Main content */}
        <div className="relative h-full flex flex-col">
          {/* Camera view */}
          <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <FeedbackOverlay />
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-medium">{steps[currentStep].title}</h2>
              <p className="text-sm text-gray-600 mt-1">{steps[currentStep].instruction}</p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="w-12 h-12 rounded-full"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <Button
                onClick={handleCapture}
                disabled={!faceDetected || !isWellLit || facePosition !== 'center'}
                className={`
                  w-12 h-12 rounded-full
                  ${isProcessing ? 'animate-pulse' : ''}
                `}
                aria-label="Capture photo"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfieStep;
