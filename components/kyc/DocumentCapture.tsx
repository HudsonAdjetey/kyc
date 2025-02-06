"use client";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import { validateDocument } from "@/lib/utils/index";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, CheckCircle, X } from "lucide-react";
interface DocumentCaptureProps {
  type: "front" | "back";
  onCapture: (image: string) => void;
  setErr: (err: string | null) => void;
  onCancel: () => void;
  err: string | null;
}

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  type,
  onCapture,
  setErr,
  onCancel,
  err,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const webCamRef = useRef<Webcam>(null);

  const initializeCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.7777 },
        },
      });

      setStream(mediaStream);

      if (webCamRef.current?.video) {
        webCamRef.current.video.srcObject = mediaStream;

        webCamRef.current.video.onloadedmetadata = () => {
          webCamRef.current?.video?.play();
        };
      }
    } catch (error) {
      console.error("Camera Access Error:", error);
      setErr(
        error instanceof DOMException
          ? `Camera Error: ${error.message}`
          : "Unable to access camera"
      );
    }
  }, [setErr]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream, setStream]);

  const captureImage = useCallback(async () => {
    if (!webCamRef.current) return;
    setProcessing(true);
    setErr(null);

    try {
      const imageData = webCamRef.current.getScreenshot();
      if (!imageData) throw new Error("Failed to capture image");

      const validation = await validateDocument(imageData);
      if (!validation.isValid)
        throw new Error(validation.errors?.[0] || "Invalid Document");

      onCapture(imageData);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Capture failed");
    } finally {
      setProcessing(false);
      if (stream) {
        stopCamera();
      }
    }
  }, [onCapture, setErr, stopCamera, stream]);

  /* useEffect(() => {
    const preloadResources = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await initializeCamera();
      } catch (error) {
        setErr(
          error instanceof Error
            ? error.message
            : "Failed to initialize resources. Please try again"
        );
      }
    };

    preloadResources();
    if (stream == null) {
      stopCamera();
    }
  }, [initializeCamera, setErr]); */

  // performing a loading state
  if (processing) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mb-4"
          >
            <Camera className="w-12 h-12 text-orange-500 mx-auto" />
          </motion.div>
          <p className="text-gray-600">Processing document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Step {type === "front" ? "4" : "5"} of 5
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Scan {type === "front" ? "Front" : "Back"} of ID
        </h1>
        <p className="text-gray-600 mt-2">
          Position your ID card within the frame and ensure it&apos;s clearly
          visible
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="relative aspect-[4/3] max-w-2xl mx-auto overflow-hidden rounded-lg">
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

                {/* Overlay for document scanning */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={false}
                >
                  <div className="absolute inset-[10%] border-2 border-dashed border-white/70">
                    <motion.div
                      className="absolute inset-0 border border-green-500/50"
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* markers */}
                    {[
                      "top-0 left-0",
                      "top-0 right-0",
                      "bottom-0 left-0",
                      "bottom-0 right-0",
                    ].map((position) => (
                      <motion.div
                        key={position}
                        className={`absolute w-6 h-6 ${position}`}
                        initial={false}
                        animate={{
                          opacity: [1, 0.5, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <div
                          className="absolute inset-0 border-2 border-green-500"
                          style={{
                            borderLeftWidth: position.includes("left") ? 4 : 0,
                            borderRightWidth: position.includes("right")
                              ? 4
                              : 0,
                            borderTopWidth: position.includes("top") ? 4 : 0,
                            borderBottomWidth: position.includes("bottom")
                              ? 4
                              : 0,
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Guidance text */}
                  <div className="absolute inset-x-0 bottom-4 flex justify-center">
                    <motion.div
                      className="bg-black/70 text-white text-sm px-4 py-2 rounded-full"
                      animate={{
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      Center your ID card within the frame
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-gray-50 flex items-center justify-center"
              >
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {err || `Ready to scan ${type} of ID`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={stream ? stopCamera : initializeCamera}
            disabled={processing}
            className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors
                     bg-white border border-gray-200 hover:bg-gray-50 text-gray-700
                     disabled:bg-gray-100 disabled:text-gray-400"
          >
            {stream ? (
              <>
                <CameraOff className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Start Camera
              </>
            )}
          </button>

          {stream && (
            <button
              onClick={captureImage}
              disabled={processing}
              className="px-6 py-2 rounded-lg font-medium flex items-center gap-2
                       bg-orange-500 text-white hover:bg-orange-400 transition-colors
                       disabled:bg-orange-200"
            >
              <CheckCircle className="w-4 h-4" />
              Capture
            </button>
          )}

          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="px-6 py-2 rounded-lg font-medium flex items-center gap-2
                     bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <X className="w-4 h-4" />
            Back
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Make sure all text on your ID is clearly visible and glare-free
        </p>
      </div>
    </div>
  );
};
