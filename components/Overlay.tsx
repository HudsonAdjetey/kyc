import type React from "react";
import { motion } from "framer-motion";

interface FacePositioning {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayProps {
  type: "face" | "document";
  facePositioning: FacePositioning ;
  isValid?: boolean;
  stage?: "face" | "leftRight" | "blink";
  blinkCount?: number;
  centerFaceDetected?: boolean;
  leftFaceDetected?: boolean;
  rightFaceDetected?: boolean;
  faceAngle?: number;
}

const Overlay: React.FC<OverlayProps> = ({
  type,
  facePositioning,
  isValid,
  stage,
  blinkCount,
  centerFaceDetected,
  leftFaceDetected,
  rightFaceDetected,
  faceAngle,
}) => {
  if (type === "face") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full">
          <motion.div
            className={`absolute inset-0 rounded-full border-[3px] border-dashed ${
              isValid ? "border-green-500" : "border-orange-300"
            }`}
            animate={{
              scale: [1, 1.05, 1],
              borderColor: isValid ? "#22c55e" : "#fdba74",
            }}
            transition={{
              duration: 0.5,
              repeat: isValid ? 0 : Number.POSITIVE_INFINITY,
            }}
          >
            {facePositioning && (
              <motion.div
                className={`absolute border-2 ${
                  isValid ? "border-green-500" : "border-orange-300"
                }`}
                style={{
                  left: `${(facePositioning.x / 100) * 100}%`,
                  top: `${(facePositioning.y / 100) * 100}%`,
                  width: `${(facePositioning.width / 100) * 100}%`,
                  height: `${(facePositioning.height / 100) * 100}%`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            <div className="absolute  flex items-center justify-center">
              <div className="text-white text-sm text-center space-y-2 bg-black/50 p-2 rounded">
                {stage === "face" && (
                  <>
                    <p>Center your face within the circle</p>
                    {faceAngle !== undefined && (
                      <p>Face angle: {faceAngle.toFixed(1)}°</p>
                    )}
                    <p>
                      {centerFaceDetected
                        ? "Face centered ✅"
                        : "Centering face..."}
                    </p>
                  </>
                )}
                {stage === "leftRight" && (
                  <>
                    <p>Slowly turn your head left and right</p>
                    <p>
                      Left: {leftFaceDetected ? "✅" : "❌"} Right:{" "}
                      {rightFaceDetected ? "✅" : "❌"}
                    </p>
                    {faceAngle !== undefined && (
                      <p>Face angle: {faceAngle.toFixed(1)}°</p>
                    )}
                    {faceAngle !== undefined && (
                      <p>
                        {faceAngle < -30
                          ? "Turn your head left and hold"
                          : faceAngle > 30
                          ? "Turn your head right and hold"
                          : "Center your face, then turn left or right"}
                      </p>
                    )}
                  </>
                )}
                {stage === "blink" && (
                  <>
                    <p>Blink your eyes a few times</p>
                    <p>Blinks detected: {blinkCount || 0}</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Document overlay
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="relative w-full h-full">
        <motion.div
          className="absolute inset-0 border-2 border-dashed border-white/50"
          animate={{
            scale: [1, 1.02, 1],
            borderColor: [
              "rgba(255,255,255,0.5)",
              "rgba(255,255,255,0.8)",
              "rgba(255,255,255,0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        />
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center">
          <div className="text-white text-sm text-center space-y-2 bg-black/50 p-2 rounded">
            <p>Place document within the frame</p>
            <p>Ensure all text is clearly visible</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overlay;
