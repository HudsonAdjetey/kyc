"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Camera, Check } from "lucide-react";
import type React from "react";

interface PreloadStepProps {
  onComplete: () => void;
  setErr: (err: string | null) => void;
}

interface LoadingStepProps {
  title: string;
  isLoading: boolean;
  isComplete: boolean;
}

const LoadingStep: React.FC<LoadingStepProps> = ({
  title,
  isLoading,
  isComplete,
}) => (
  <div className="flex items-center space-x-3">
    <div className="w-6">
      {isLoading && (
        <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
      )}
      {isComplete && <Check className="w-5 h-5 text-green-500" />}
    </div>
    <span className={`${isComplete ? "text-green-500" : "text-gray-600"}`}>
      {title}
    </span>
  </div>
);

export const PreloadStep: React.FC<PreloadStepProps> = ({
  onComplete,
  setErr,
}) => {
  const [loadingStates, setLoadingStates] = useState({
    resources: { loading: true, complete: false },
    camera: { loading: false, complete: false },
  });

  useEffect(() => {
    const preloadResource = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setLoadingStates((prev) => ({
          ...prev,
          resources: { loading: false, complete: true },
          camera: { loading: true, complete: false },
        }));

        setLoadingStates((prev) => ({
          ...prev,
          camera: { loading: false, complete: true },
        }));

        setTimeout(onComplete, 1000);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 rounded-xl bg-white shadow-lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-medium text-orange-400"
          >
            STEP 1
          </motion.p>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-gray-900"
          >
            Preparing Verification
          </motion.h1>
        </div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <LoadingStep
            title="Loading required resources"
            isLoading={loadingStates.resources.loading}
            isComplete={loadingStates.resources.complete}
          />
          <LoadingStep
            title="Initializing camera"
            isLoading={loadingStates.camera.loading}
            isComplete={loadingStates.camera.complete}
          />
        </motion.div>

        {/* Camera Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center p-4 bg-gray-50 rounded-lg"
        >
          <Camera className="w-6 h-6 text-gray-400 mr-2" />
          <span className="text-sm text-gray-600">
            {loadingStates.camera.complete
              ? "Camera ready"
              : "Preparing camera..."}
          </span>
        </motion.div>

        {/* Progress Bar */}
        <motion.div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-orange-400"
            initial={{ width: "0%" }}
            animate={{
              width: loadingStates.camera.complete
                ? "100%"
                : loadingStates.resources.complete
                ? "50%"
                : "25%",
            }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
