import React, { useCallback,  useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  CheckCircle,
  X,
  Loader2,
  CreditCard,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const initializeCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.7777 },
          facingMode: "environment",
        },
      });

      setStream(mediaStream);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description:
          error instanceof DOMException
            ? error.message
            : "Unable to access camera",
      });
    }
  }, [toast]);

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

        if (!response.ok) {
          throw new Error(result.message || "Upload failed");
        }

        toast({
          title: "Success",
          description: "Document captured successfully",
          duration: 3000,
        });

        onCapture(result.imageData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: error instanceof Error ? error.message : "Upload failed",
        });
      } finally {
        setUploading(false);
        stopCamera();
      }
    },
    [selectedIdType, selfieImage, type, onCapture, stopCamera, toast]
  );

  const captureImage = useCallback(async () => {
    if (!webCamRef.current) return;
    setProcessing(true);

    try {
      const imageData = webCamRef.current.getScreenshot();
      if (!imageData) throw new Error("Failed to capture image");

      await uploadImage(imageData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Capture Error",
        description: error instanceof Error ? error.message : "Capture failed",
      });
    } finally {
      setProcessing(false);
    }
  }, [uploadImage, toast]);

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <span className="inline-flex bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">
              Step {type === "front" ? "4" : "5"} of 5
            </span>
            <Select
              value={selectedIdType}
              onValueChange={(value: IdType) => setSelectedIdType(value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
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

          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
            Scan {type === "front" ? "Front" : "Back"} of{" "}
            {getIdTypeLabel(selectedIdType)}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mb-6">
            Position your {getIdTypeLabel(selectedIdType).toLowerCase()} within
            the frame and ensure all text is clearly visible.
          </p>

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
                      facingMode: "environment",
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
                      Ready to scan {getIdTypeLabel(selectedIdType)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Use good lighting and avoid glare
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
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
                disabled={processing || uploading}
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

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Tips for best results:
            </h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                Ensure all text is clearly visible and glare-free
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                Place the document against a dark background
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                Make sure all corners are visible in the frame
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                Hold the camera steady when capturing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCapture;
