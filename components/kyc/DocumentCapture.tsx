"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";

import {
  Camera,
  CameraOff,
  CheckCircle,
  X,
  Loader2,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type IdType = "passport" | "driverLicense" | "nationalId";

interface DocumentCaptureProps {
  type: "front" | "back";
  onCapture: (image: string) => void;
  onCancel: () => void;
  selfieImage?: string;
  defaultIdType?: IdType;
  maxRetries?: number;
  onError?: (error: Error) => void;
}

const ID_TYPE_LABELS: Record<IdType, string> = {
  passport: "Passport",
  driverLicense: "Driver's License",
  nationalId: "National ID",
};

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  type,
  onCapture,
  onCancel,
  selfieImage,
  defaultIdType = "nationalId",
  maxRetries = 3,
  onError,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedIdType, setSelectedIdType] = useState<IdType>(defaultIdType);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const webCamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      setError(error.message);
      onError?.(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
    [onError, toast]
  );

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
      setError(null);
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

  const validateImage = useCallback((imageData: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        if (width < 640 || height < 480) {
          reject(new Error("Image resolution too low. Please try again."));
        }
        resolve();
      };
      img.onerror = () =>
        reject(new Error("Invalid image captured. Please try again."));
      img.src = imageData;
    });
  }, []);

  const uploadImage = useCallback(
    async (imageData: string) => {
      setUploading(true);
      try {
        await validateImage(imageData);

        const formData = new FormData();
        formData.append("idImage", imageData);
        formData.append("idType", selectedIdType);
        if (selfieImage) formData.append("selfieImage", selfieImage);
        formData.append("stage", type);

        const response = await fetch("/api/verify-document", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error((await response.text()) || "Upload failed");
        }

        const result = await response.json();

        toast({
          title: "Success",
          description: "Document captured successfully",
          duration: 3000,
        });

        onCapture(result.imageData);
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
    [
      selectedIdType,
      selfieImage,
      type,
      onCapture,
      retryCount,
      maxRetries,
      handleError,
      validateImage,
      toast,
    ]
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="inline-flex bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">
                Step {type === "front" ? "4" : "5"} of 5
              </span>
              {retryCount > 0 && (
                <span className="text-sm text-gray-500">
                  Attempts: {retryCount}/{maxRetries}
                </span>
              )}
            </div>
            <Select
              value={selectedIdType}
              onValueChange={(value: IdType) => setSelectedIdType(value)}
              disabled={processing || uploading}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Select ID Type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ID_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                Scan {type === "front" ? "Front" : "Back"} of{" "}
                {ID_TYPE_LABELS[selectedIdType]}
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Position your {ID_TYPE_LABELS[selectedIdType].toLowerCase()}{" "}
                within the frame and ensure all text is clearly visible.
              </p>
            </div>

            {/* Camera View */}
            <div className="relative aspect-[4/3] w-full max-w-2xl mx-auto overflow-hidden rounded-xl border-2 border-gray-200">
              <AnimatePresence mode="wait">
                {stream ? (
                  <motion.div
                    key="camera"
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
                        aspectRatio: 4 / 3,
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
                    className="w-full h-full bg-gray-50 flex items-center justify-center"
                  >
                    <div className="text-center p-4 md:p-6">
                      <CreditCard className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">
                        Ready to scan {ID_TYPE_LABELS[selectedIdType]}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Use good lighting and avoid glare
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <button
                onClick={stream ? stopCamera : initializeCamera}
                disabled={processing || uploading}
                className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {stream ? (
                  <>
                    <CameraOff className="w-4 h-4" /> Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" /> Start Camera
                  </>
                )}
              </button>

              {stream && (
                <button
                  onClick={captureImage}
                  disabled={processing || uploading || retryCount >= maxRetries}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium flex justify-center items-center gap-2 bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed"
                >
                  {processing || uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {processing ? "Processing..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Capture
                    </>
                  )}
                </button>
              )}

              {retryCount > 0 && retryCount < maxRetries && (
                <button
                  onClick={() => setRetryCount(0)}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium flex justify-center items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Attempts
                </button>
              )}

              <button
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium flex justify-center items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                <X className="w-4 h-4" /> Back
              </button>
            </div>

            {/* Tips Section */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCapture;
