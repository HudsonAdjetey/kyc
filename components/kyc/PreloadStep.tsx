import { useEffect } from "react";
import { startCamera } from "@/lib/utils/camera";
import type React from "react"; 

interface PreloadStepProps {
  onComplete: () => void;
  setErr: (err: string | null) => void;
}

export const PreloadStep: React.FC<PreloadStepProps> = ({
  onComplete,
  setErr,
}) => {
  useEffect(() => {
    const preloadResource = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await startCamera();
        onComplete();
      } catch (error) {
        setErr(
          error instanceof Error
            ? error.message
            : "Failed to initialize resources. Please try again."
        );
      }
    };
    preloadResource();
  }, [onComplete, setErr]);

  return (
    <div className="space-y-3">
      <p className="text-lg text-gray-400">STEP 1</p>
      <h1 className="text-3xl max-md:text-xl text-green-500">Preload</h1>
      <p>Loading required resources and preparing camera...</p>
    </div>
  );
};
