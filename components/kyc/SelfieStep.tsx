import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

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

interface SelfieStepProps {
  onComplete: (imageData: string) => void;
  setStep: () => void;
}

const SelfieStep: React.FC<SelfieStepProps> = ({ onComplete, setStep }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [results, setResults] = useState<CaptureResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAllverified, setAllIsVerifed] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [orientation, setOrientation] = useState<string>("portrait");
  const errorTimeoutRef = useRef<NodeJS.Timeout>(null);
  const [showSteps, setShowSteps] = useState(true);
  const [activeInstruction, setActiveInstruction] = useState<string | null>(
    null
  );
  const instructionTimeoutRef = useRef<NodeJS.Timeout>(null);

  const steps: VerificationStep[] = useMemo(
    () => [
      {
        id: "face",
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

  // Handle screen orientation
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? "portrait" : "landscape"
      );
    };

    handleOrientationChange();
    window.addEventListener("resize", handleOrientationChange);
    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  // Error timeout handler
  useEffect(() => {
    if (error) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
      }, 3000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  useEffect(() => {
    const verifiedSteps = steps.filter((step) =>
      results.some((result) => result.typeImage === step.id && result.verified)
    ).length;
    const newProgress = (verifiedSteps / steps.length) * 100;
    setProgress(newProgress);
  }, [results, steps]);

  const toggleFullScreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullScreen(false);
      }
    } catch (err) {
      console.error(err);
      setError("Fullscreen mode is not supported on this device");
    }
  }, []);

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
      setError(null);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to access camera. Please ensure you have granted permissions."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsCapturing(false);
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

  // Handle sequential instructions
  useEffect(() => {
    if (!isCapturing) return;

    const showInstruction = () => {
      setActiveInstruction(steps[currentStep].instruction);

      // Clear previous timeout
      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
      }

      // Set new timeout for current instruction
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
  }, [currentStep, isCapturing, steps]);

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
            step: steps[currentStep].id,
          }),
        });

        if (!response.ok) {
          setError("Verification failed");
          console.log(response);
          throw new Error("Verification failed");
        }

        const result = await response.json();
        return result.verified;
      } catch (err) {
        console.log(err);
        setError("Verification failed. Please try again.");
        return false;
      }
    },
    [currentStep, steps]
  );

  const handleCapture = async () => {
    const imageData = captureImage();

    if (!imageData) {
      setError("Failed to capture image. Please try again.");
      return;
    }
    setIsProcessing(true);

    try {
      const verified = await verifyImage(imageData);
      if (!verified) {
        setIsProcessing(false);
        return;
      }

      setResults((prev) => [
        ...prev,
        { typeImage: steps[currentStep].id, verified, imageData },
      ]);

      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        stopCamera();
      }
    } catch (error) {
      console.log(error);
      setError("Verification failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (steps[currentStep].id !== "blink") return;

    let isMounted = true;

    const handleBlinkDetection = async () => {
      while (isMounted) {
        const imageData = captureImage();

        if (!imageData) {
          setError("Failed to capture image. Please try again.");
          break;
        }

        try {
          const isVerified = await verifyImage(imageData);

          if (isVerified) {
            setResults((prev) => [
              ...prev,
              { typeImage: "blink", imageData, verified: true },
            ]);
            setError(null);
            setIsProcessing(false);
            break;
          }
        } catch (error) {
          console.error("Blink verification error:", error);
          setError(
            "Verification failed. Please ensure good lighting and face visibility."
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    handleBlinkDetection();

    return () => {
      isMounted = false;
    };
  }, [steps, currentStep, captureImage, verifyImage]);

  useEffect(() => {
    if (isAllverified) return;

    const isVerificationComplete = steps.every((step) =>
      results.some((result) => result.typeImage === step.id && result.verified)
    );
    const faceResult = results.find((result) => result.typeImage === "face");

    if (isVerificationComplete && faceResult) {
      setAllIsVerifed(true);
      setError(null);
      setIsProcessing(false);
      onComplete(faceResult.imageData);
    }
  }, [results, onComplete, setStep, steps.length, isAllverified, steps]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="h-full flex flex-col">
        {/* Header Section */}
        <div className="sticky top-0 z-50 px-4 py-2 bg-white/90 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => {}}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <h1 className="text-xl font-semibold text-gray-900 mt-1">
                  Identity Verification
                </h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullScreen}
              className="text-gray-500"
            >
              {isFullScreen ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 9h6v6H9z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m-7 11h4m-4 0v4m0-4l5 5m11-5h-4m4 0v4m0-4l-5 5"
                  />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative overflow-y-auto">
          <div className=" my-2">
            {/* Show instruction alert */}
            {activeInstruction && (
              <Alert className="bg-orange-50 border-orange-200 transition-all w-fit z-[90] absolute duration-300 ease-in-out mx-4">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-700 ml-2">
                  {activeInstruction}
                </AlertDescription>
              </Alert>
            )}

            <div className="max-w-7xl mx-auto px-4 py-2">
              {/* Progress Steps - Only show on larger screens */}
              {showSteps && (
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                        idx === currentStep
                          ? "bg-orange-50 border-2 border-orange-200 shadow-sm scale-105"
                          : idx < currentStep
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div
                        className={`rounded-full p-1 ${
                          idx === currentStep
                            ? "text-orange-500"
                            : idx < currentStep
                            ? "text-green-500"
                            : "text-gray-400"
                        }`}
                      >
                        {idx < currentStep ? (
                          <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                        ) : (
                          <div className="h-4 w-4 md:h-5 md:w-5 rounded-full border-2 flex items-center justify-center text-xs">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <span className="text-xs mt-1 text-center font-medium">
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar - Show on all screens */}
              <div className="my-2">
                <Progress
                  value={progress}
                  className="h-2 bg-gray-100 transition-all duration-300"
                />
                <p className="text-sm text-gray-500 text-right mt-1">
                  {Math.round(progress)}% complete
                </p>
              </div>

              {/* Camera View */}
              <div className="relative aspect-[3/4] mx-auto sm:max-w-5xl md:aspect-video bg-black rounded-xl overflow-hidden  shadow-lg mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {!isCapturing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70">
                    <Button
                      onClick={startCamera}
                      size="lg"
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transform hover:scale-105 transition-transform"
                    >
                      <Camera className="h-5 w-5" />
                      Start Camera
                    </Button>
                    <p className="text-white/90 text-sm mt-4 max-w-md text-center px-4">
                      We&apos;ll guide you through a quick verification process
                    </p>
                  </div>
                )}

                {isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[85%] md:w-[60%] h-[80%] border-2 border-white rounded-full opacity-50 animate-pulse" />
                  </div>
                )}

                {isCapturing &&
                  steps[currentStep].id !== "blink" &&
                  !isAllverified && (
                    <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-16 px-4">
                      <Button
                        variant="outline"
                        onClick={stopCamera}
                        className="bg-white/80 hover:bg-white/90 transition-all duration-300"
                      >
                        <X size={40} className="text-red-500" />
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleCapture}
                        disabled={isProcessing}
                        className={`bg-white/80 hover:bg-white/90 transition-all duration-300 ${
                          isProcessing ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <Check size={40} className="text-green-500" />
                      </Button>
                    </div>
                  )}
              </div>

              {/* Error Display */}
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 border-red-200 animate-shake transition-all duration-300 ease-in-out"
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700 ml-2">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-4 sticky bottom-4 mt-4">
                {isAllverified && (
                  <Button
                    onClick={setStep}
                    className="w-full py-7 bg-green-500 hover:bg-green-600 transform hover:scale-105 transition-all duration-300 text-white font-medium text-lg"
                  >
                    Continue to Next Step
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center pb-4">
                Your photos are encrypted and will only be used for verification
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfieStep;
