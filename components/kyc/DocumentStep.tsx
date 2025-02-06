"use client";
import { useCallback, useState } from "react";
import { FaIdCard } from "react-icons/fa";
import ImageBlur from "@/components/common/ImageBlur";
import { DocumentCapture } from "./DocumentCapture";
import { UseUserInfo } from "@/hooks/useUserInfo";
import { motion, AnimatePresence } from "framer-motion";
interface DocumentStepProps {
  step: Step;
  images: { [key in Step]?: string };
  onComplete: (image: string) => void;
  setErr: (err: string | null) => void;
  updateStep: (step: Step) => void;
  err: string | null;
}

export const DocumentStep: React.FC<DocumentStepProps> = ({
  step,
  images,
  onComplete,
  setErr,
  updateStep,
  err,
}) => {
  const [documentStage, setDocumentStage] = useState<Step | "submit" | "">("");

  const handleCapture = useCallback(
    (image: string) => {
      onComplete(image);
      setDocumentStage("");
    },
    [onComplete]
  );

  if (step === "front" || step === "back") {
    return (
      <DocumentCapture
        type={step}
        onCapture={handleCapture}
        setErr={setErr}
        onCancel={() => updateStep("document")}
        err={err}
      />
    );
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.3,
        type: "tween",
        ease: "easeInOut",
      },
    },
    tap: { scale: 0.98 },
  };

  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
      },
    },
  };
  const { userInfo } = UseUserInfo();
  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-4 py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="mb-8" variants={itemVariants}>
        <motion.div
          className="flex items-center gap-2 text-gray-500 mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Step 3 of 5
          </span>
        </motion.div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Document Verification
        </h1>
        <p className="text-gray-600 mt-2">
          Please upload clear photos of your identification document
        </p>
      </motion.div>

      <motion.div
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-6"
        variants={itemVariants}
        whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <div className="max-w-2xl mx-auto mb-8">
          <motion.div
            className="flex items-center gap-8 md:gap-12"
            variants={itemVariants}
          >
            <motion.div
              className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden flex-shrink-0 bg-gray-100"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ImageBlur
                width={128}
                height={128}
                src={images.selfie || "/api/placeholder/128/128"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {userInfo.name}
              </h2>
              <p className="text-gray-500 mt-1 truncate">{userInfo.email}</p>
            </div>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
            variants={itemVariants}
          >
            {["front", "back"].map((side) => (
              <motion.button
                key={side}
                onClick={() => setDocumentStage(side as Step)}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className={`relative p-6 rounded-lg border-2 border-dashed ${
                  documentStage === side
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <FaIdCard
                      className={`w-12 h-12 mb-3 ${
                        documentStage === side
                          ? "text-orange-500"
                          : "text-gray-400"
                      }`}
                    />
                  </motion.div>
                  <span className="block text-sm font-medium text-gray-900">
                    {side.charAt(0).toUpperCase() + side.slice(1)} Side
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={
                        images[side as keyof typeof images]
                          ? "uploaded"
                          : "upload"
                      }
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="block text-xs text-gray-500 mt-1"
                    >
                      {images[side as keyof typeof images]
                        ? "Document uploaded"
                        : "Click to upload"}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.button>
            ))}
          </motion.div>

          <motion.div className="mt-8" variants={itemVariants}>
            <AnimatePresence mode="wait">
              {images.selfie && images.back && images.front ? (
                <motion.button
                  key="submit"
                  variants={successVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 bg-orange-500 text-white rounded-lg font-medium"
                >
                  Submit Documents
                </motion.button>
              ) : (
                <motion.button
                  key="proceed"
                  onClick={() => {
                    if (documentStage) updateStep(documentStage as Step);
                  }}
                  disabled={!documentStage}
                  whileHover={!documentStage ? {} : { scale: 1.02 }}
                  whileTap={!documentStage ? {} : { scale: 0.98 }}
                  className="w-full py-3 px-4 bg-orange-500 text-white rounded-lg font-medium disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Proceed with Upload
                </motion.button>
              )}
            </AnimatePresence>

            <motion.p
              className="text-xs text-gray-500 text-center mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Your documents will be securely processed and verified
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
