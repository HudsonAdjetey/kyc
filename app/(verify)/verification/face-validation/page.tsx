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
      console.log(err);
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
            step: steps[currentStep].id,
          }),
        });

        if (!response.ok) {
          toast({
            variant: "destructive",
            title: "Verification Failed",
            description: `Please ensure your ${steps[
              currentStep
            ].title.toLowerCase()} is clearly visible`,
          });
          throw new Error("Verification failed");
        }

        const result = await response.json();
        if (!result.verified) {
          // using toast
          toast({
            variant: "destructive",
            title: "Verification Failed",
            /*    description: `Please ensure your ${steps[
              currentStep
            ].title.toLowerCase()} is clearly visible`, */
            description: result.message,
          });
          return false;
        }
        return result.verified;
      } catch (err) {
        console.log(err);
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

  const handleCapture = async () => {
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
        setIsProcessing(false);
        return;
      }

      setResults((prev) => [
        ...prev,
        { typeImage: steps[currentStep].id, verified, imageData },
      ]);

      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
        toast({
          title: "Step Completed",
          description: "Moving to next step",
        });
      } else {
        stopCamera();
        toast({
          title: "Verification Complete",
          description: "All steps completed successfully",
        });
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
  };

  useEffect(() => {
    if (steps[currentStep].id !== "blink") return;

    let isMounted = true;

    const handleBlinkDetection = async () => {
      while (isMounted) {
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
            setIsProcessing(false);
            break;
          }
        } catch (error) {
          console.log(error);

          setIsProcessing(false);
          toast({
            variant: "destructive",
            title: "Blink Detection Error",
            description: "Please ensure good lighting and face visibility",
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    handleBlinkDetection();

    return () => {
      isMounted = false;
    };
  }, [steps, currentStep, captureImage, verifyImage, toast]);

  useEffect(() => {
    if (isAllverified) return;

    const isVerificationComplete = steps.every((step) =>
      results.some((result) => result.typeImage === step.id && result.verified)
    );
    const faceResult = results.find((result) => result.typeImage === "face");

    if (isVerificationComplete && faceResult) {
      setAllIsVerifed(true);
      setIsProcessing(false);
      onComplete(faceResult.imageData);
      toast({
        title: "Verification Complete",
        description: "All steps completed successfully",
      });
    }
  }, [results, onComplete, setStep, steps.length, isAllverified, steps, toast]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100">
      <Toaster />
      <div className="h-full flex flex-col">
        {/* Header Section */}
        <div className=" px-4 py-2 bg-white/90 backdrop-blur-sm shadow-sm">
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
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative overflow-y-auto">
          <div className="mt-2 mb-4">
            <div className="aspect-[3/4] sm:max-w-5xl md:aspect-video mx-auto px-4 py-2">
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
              <div className="relative aspect-[3/4] mx-auto sm:max-w-5xl md:aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-4">
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
                {isCapturing}

                {isCapturing && (
                  <div className="absolute flex-col gap-5 inset-0 flex items-center justify-center ">
                    <div className="w-[85%] md:w-[60%] h-[80%] border-2 border-white rounded-full pointer-events-none opacity-50 animate-pulse" />
                    {isCapturing &&
                      steps[currentStep].id !== "blink" &&
                      !isAllverified && (
                        <div className=" flex  items-center  gap-16 px-4">
                          <Button
                            variant="outline"
                            onClick={stopCamera}
                            className="bg-white/80  hover:bg-white/90 transition-all duration-300"
                          >
                            <X size={40} className="text-red-500" />
                          </Button>

                          <Button
                            variant="outline"
                            onClick={handleCapture}
                            disabled={isProcessing}
                            className={`bg-white/80 hover:bg-white/90 transition-all duration-300 ${
                              isProcessing
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                            ) : (
                              <Check size={40} className="text-green-500" />
                            )}
                          </Button>
                        </div>
                      )}
                  </div>
                )}

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                      <p className="text-sm font-medium">Processing...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-4 sticky bottom-4 mt-4">
                {isAllverified && (
                  <Button
                    onClick={() => {
                      router.push("/verification/document-verification/");
                    }}
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
