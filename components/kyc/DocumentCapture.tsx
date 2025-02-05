import type React from "react";
import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import Overlay from "@/components/Overlay";
import { validateDocument } from "@/lib/utils/index";
import { FaAddressCard } from "react-icons/fa";

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
      <div className="relative w-full flex items-center justify-center h-screen">
        <div className=" spinner  ">
          {Array.from({ length: 10 }).map((i, _idx) => {
            return (
              <div className="animate-spin w-8 h-8 text-gray-400" key={_idx} />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-lg text-gray-400">
          STEP {type === "front" ? "4" : "5"}
        </p>
        <h1 className="text-3xl max-md:text-xl text-green-500">
          {type === "front" ? "Front" : "Back"} of ID
        </h1>
      </div>
      <div className="max-sm:w-full max-w-lg mx-auto h-[350px] relative border overflow-hidden">
        {stream ? (
          <>
            <Webcam
              ref={webCamRef}
              audio={false}
              screenshotFormat="image/png"
              videoConstraints={{ facingMode: "environment" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <Overlay type="document" />
          </>
        ) : (
          <div className="flex items-center gap-3 justify-center h-full">
            <FaAddressCard className="text-6xl text-gray-400" />
            <p className="text-xl text-gray-600">
              Capture {type == "front" ? "Front" : "Back"} of ID
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-center gap-4">
        <Button
          onClick={stream ? () => stopCamera() : initializeCamera}
          disabled={processing}
        >
          {stream ? "Cancel" : err ? "Try Again" : "Capture Card"}
        </Button>
        {stream && (
          <Button onClick={captureImage} disabled={processing}>
            Capture
          </Button>
        )}
        <Button
          onClick={() => {
            onCancel();
            stopCamera();
          }}
        >
          Back
        </Button>
      </div>
    </div>
  );
};
