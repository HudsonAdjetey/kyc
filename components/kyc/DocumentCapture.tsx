"use client";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  CheckCircle,
  X,
  Loader2,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "../ui/alert";

type IdType = "passport" | "driverLicense" | "nationalId";

interface DocumentCaptureProps {
  type: "front" | "back";
  onCapture: (image: string) => void;
  onCancel: () => void;
  selfieImage: string;
}

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  type,
  onCapture,
  onCancel,
  selfieImage,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedIdType, setSelectedIdType] = useState<IdType>("nationalId");
  const webCamRef = useRef<Webcam>(null);
  const [err, setError] = useState<string>("");

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (err) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setError(""), 300);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [err, setError]);

  const initializeCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, aspectRatio: 1.7777 },
      });

      setStream(mediaStream);
      setError("");
    } catch (error) {
      console.error("Camera Access Error:", error);
      setError(
        error instanceof DOMException
          ? `Camera Error: ${error.message}`
          : "Unable to access camera"
      );
    }
  }, [setError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const uploadImage = useCallback(
    async (imageData: string) => {
      setUploading(true);
      try {
        const response = await fetch("/api/verify-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idImage: imageData,
            idType: selectedIdType,
            selfieImage: selfieImage,
            stage: type,
          }),
        });

        const result = await response.json();
        console.log(result);
        if (!response.ok) {
          console.log(result.message || "Upload failed");
          return;
        }
        onCapture(result.imageData);
        setError("");
      } catch (error) {
        console.error(error);
        setError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setUploading(false);
        stopCamera();
      }
    },
    [selectedIdType, selfieImage, type, onCapture, setError, stopCamera]
  );

  const captureImage = useCallback(async () => {
    if (!webCamRef.current) return;
    setProcessing(true);
    setError("");

    try {
      const imageData = webCamRef.current.getScreenshot();
      if (!imageData) throw new Error("Failed to capture image");

      await uploadImage(imageData);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Capture failed");
    } finally {
      setProcessing(false);
    }
  }, [setError, uploadImage]);

  const getIdTypeLabel = (idType: IdType): string => {
    switch (idType) {
      case "passport":
        return "Passport";
      case "driverLicense":
        return "Driver's License";
      case "nationalId":
        return "National ID";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">
            Step {type === "front" ? "4" : "5"} of 5
          </span>
          <Select
            value={selectedIdType}
            onValueChange={(value: IdType) => setSelectedIdType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select ID Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="driverLicense">
                Driver&apos;s License
              </SelectItem>
              <SelectItem value="nationalId">National ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Scan {type === "front" ? "Front" : "Back"} of{" "}
          {getIdTypeLabel(selectedIdType)}
        </h1>
        <p className="text-gray-600 mt-2">
          Position your {getIdTypeLabel(selectedIdType).toLowerCase()} within
          the frame and ensure all text is clearly visible.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="relative aspect-[4/3] max-w-2xl mx-auto overflow-hidden rounded-xl">
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
                    facingMode: "environment",
                    aspectRatio: 4 / 3,
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-orange-500 rounded-lg opacity-50" />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-gray-50 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200"
              >
                <div className="text-center p-6">
                  <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    {err || `Ready to scan ${getIdTypeLabel(selectedIdType)}`}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Use good lighting and avoid glare
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {err && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-center text-red-600 text-sm">{err}</p>
          </div>
        )}

        <div className="mt-8 flex max-md:flex-col justify-center gap-4">
          <button
            onClick={stream ? stopCamera : initializeCamera}
            disabled={processing || uploading}
            className="px-6 py-3 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
              disabled={processing || uploading}
              className="px-6 py-3 rounded-lg font-medium flex justify-center items-center gap-2 bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed"
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

          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="px-6 py-3 justify-center rounded-lg font-medium flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <X className="w-4 h-4" /> Back
          </button>
        </div>
        <AnimatePresence>
          {isVisible && err && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <Alert
                variant="destructive"
                className="flex items-center gap-2 shadow-lg"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm font-medium">
                  {err}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Tips for best results:
          </h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Ensure all text is clearly visible and glare-free</li>
            <li>• Place the document against a dark background</li>
            <li>• Make sure all corners are visible in the frame</li>
            <li>• Hold the camera steady when capturing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DocumentCapture;
