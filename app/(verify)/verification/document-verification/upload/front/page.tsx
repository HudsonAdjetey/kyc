"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle,
  CreditCard,
  HelpCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const Front = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const webCamRef = useRef<Webcam>(null);
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selfieImage, setSelfieImage] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const router = useRouter();
  const handleError = useCallback(
    (error: Error) => {
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
    [toast]
  );

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const initializeCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 1.7777 },
          facingMode: isMobile ? "environment" : "user",
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      setStream(mediaStream);
      setError("");
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error("Camera access failed")
      );
    }
  }, [isMobile, handleError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const validateImage = useCallback(
    (imageData: string) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const { width, height } = img;
          if (width < 640 || height < 480) {
            reject(new Error("Image resolution too low. Please try again."));
            toast({
              variant: "destructive",
              title: "Image Resolution",
              description: "Image resolution too low. Please try again.",
            });
          }
          resolve();
        };
        img.onerror = () => {
          reject(new Error("Failed to load image"));
          toast({
            variant: "destructive",
            title: "Image Load Error",
            description: "Failed to load image. Please try again.",
          });
        };
        img.src = imageData;
      });
    },
    [toast]
  );
  useEffect(() => {
    if (error) {
      setRetryCount(0);
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
      setError("");
    }
  }, [error, toast]);

  const uploadImage = useCallback(
    async (imageData: string) => {
      setUploading(true);
      try {
        await validateImage(imageData);
        const formData = new FormData();
        if (selfieImage) formData.append("selfieImage", selfieImage.toString());

        const response = await fetch("/api/verify-document/front", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error((await response.text()) || "Upload failed");
        }

        toast({
          title: "Success",
          description: "Document captured successfully",
          duration: 3000,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Document captured error",
          description: "Please ensure good lighting and face visibility",
        });
        console.log(error);
        if (retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1);
          handleError(
            new Error(
              `Upload failed. ${maxRetries - retryCount} attempts remaining.`
            )
          );
        } else {
          handleError(
            new Error("Maximum retry attempts reached. Please try again later.")
          );
        }
      } finally {
        setUploading(false);
      }
    },
    [handleError, retryCount, selfieImage, toast, validateImage]
  );

  const captureImage = useCallback(async () => {
    if (!webCamRef.current) return;
    setProcessing(true);

    try {
      const imageData = webCamRef.current.getScreenshot();
      if (!imageData) throw new Error("Failed to capture image");
      await uploadImage(imageData);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error("Capture failed"));
    } finally {
      setProcessing(false);
    }
  }, [uploadImage, handleError]);

  return (
    <section className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl shadow-lg mx-auto bg-white rounded-2xl">
        <div className="p-4 md:p-6 lg:p-8">
          {/* header section */}
          <div className=" gap-4 mb-3">
            <div className="space-y-4">
              <div className="flex-row-reverse flex-1 flex items-center justify-between w-full gap-4">
                <span className="inline-flex bg-green-500 text-white px-4 py-1.5 min-w-fit rounded-full text-sm font-medium">
                  Step 4
                </span>
                <Button
                  onClick={() => {
                    router.push("/verification/document-verification");
                    stopCamera();
                  }}
                  variant="outline"
                  className=" sm:w-auto"
                  size={"sm"}
                >
                  <ArrowLeft />
                </Button>
              </div>

              {retryCount > 0 && (
                <span className="text-sm text-gray-500">
                  Attempts: {retryCount}/{maxRetries}
                </span>
              )}
            </div>
          </div>

          {/* main content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-xl max-md:text-lg font-semibold text-gray-900 mb-2">
                Scan Front of Card
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Position your card within the frame and ensure all text is
                clearly visible
              </p>
            </div>

            {/* camera view */}
            <div
              className={`relative w-full max-md:aspect-[4/5] max-w-4xl mx-auto overflow-hidden rounded-lg border-2 border-gray-200 aspect-[4/2] ${
                isMobile && " aspect-[4/6] "
              }`}
            >
              <AnimatePresence mode="wait">
                {stream ? (
                  <motion.div
                    key={"camera"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-full"
                  >
                    <Webcam
                      ref={webCamRef}
                      audio={false}
                      screenshotFormat="image/png"
                      videoConstraints={{
                        facingMode: isMobile ? "environment" : "user",
                        aspectRatio: isMobile ? 4 / 5 : 3 / 2,
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-4 border-2 border-orange-500 rounded-lg opacity-50">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full bg-gray-800 flex items-center justify-center"
                  >
                    <div className="text-center p-4 md:p-6">
                      <CreditCard className="w-12 h-12 md:w-16 md:h-16 text-orange-400 mx-auto mb-4" />
                      <p className="text-gray-300 font-medium">Ready to scan</p>
                      <p className="text-sm text-white mt-2">
                        Use good lighting and avoid glare
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <Button
                onClick={stream ? stopCamera : initializeCamera}
                disabled={processing || uploading}
                variant="outline"
                className="w-full sm:w-auto py-5"
              >
                {stream ? (
                  <>
                    <CameraOff className="w-4 h-4 mr-2" /> Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" /> Start Camera
                  </>
                )}
              </Button>

              {stream && (
                <Button
                  onClick={captureImage}
                  disabled={processing || uploading || retryCount >= maxRetries}
                  className="w-full sm:w-auto py-5 bg-orange-500 hover:bg-orange-600"
                >
                  {processing || uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {processing ? "Processing..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" /> Capture
                    </>
                  )}
                </Button>
              )}

              {retryCount > 0 && retryCount < maxRetries && (
                <Button
                  onClick={() => setRetryCount(0)}
                  variant="outline"
                  className="w-full sm:w-auto "
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset Attempts
                </Button>
              )}
            </div>
            {/* Tips Section */}
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-orange-500" />
                Tips for a Successful Scan
              </h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Ensure all four corners of your ID are visible</li>
                <li>Avoid glare from lights or windows</li>
                <li>Place your ID on a dark, non-reflective surface</li>
                <li>Hold your device steady while capturing the image</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Front;
