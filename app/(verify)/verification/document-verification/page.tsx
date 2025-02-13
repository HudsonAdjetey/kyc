"use client";

import { useState } from "react";
import { Camera, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { IdType } from "@/components/kyc/DocumentCapture";
import { motion, AnimatePresence } from "framer-motion";
import { UseUserInfo } from "@/hooks/useUserInfo";
import ImageBlur from "@/components/common/ImageBlur";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

interface DocumentStepProps {
  step: Step;
  images: { [key in Step]?: string };
  onComplete: (image: string) => void;
  updateStep: (step: Step) => void;
}

const ID_TYPE_LABELS: Record<IdType, string> = {
  passport: "Passport",
  driverLicense: "Driver's License",
  nationalId: "National ID",
};

export const DocumentStep: React.FC<DocumentStepProps> = () => {
  const [documentStage, setDocumentStage] = useState<Step | "submit" | "">("");
  const [selectedIdType, setSelectedIdType] = useState<IdType>("nationalId");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [images, setImages] = useState<Record<string, string>>({});
  const { userInfo } = UseUserInfo();
  const router = useRouter();

  const progress = Object?.values(images).filter(Boolean).length * 33.33;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <motion.div
        className="max-w-4xl mx-auto space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="inline-flex bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-medium">
                Step 3 of 5
              </span>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="w-32" />
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}% Complete
                </span>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Document Verification</CardTitle>
              <CardDescription>
                Please upload clear photos of your identification document
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {/* User Profile Section */}
            <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg mb-8">
              <motion.div
                className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-orange-500 ring-offset-2"
                whileHover={{ scale: 1.05 }}
              >
                <ImageBlur
                  width={96}
                  height={96}
                  src={images.selfie || "/api/placeholder/96/96"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {userInfo.name}
                </h2>
                <p className="text-gray-500">{userInfo.email}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Identity Verification in Progress</span>
                </div>
              </div>
            </div>

            {/* Document Type Selection */}
            <div className="space-y-4 mb-8">
              <Label className="text-base">Select Document Type</Label>
              <Select
                value={selectedIdType}
                onValueChange={(value: IdType) => setSelectedIdType(value)}
              >
                <SelectTrigger className="w-full py-6">
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

            {/* Document Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {["front", "back"].map((side) => (
                <motion.button
                  key={side}
                  onClick={() => setDocumentStage(side as Step)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-6 rounded-xl border-2 ${
                    images[side as keyof typeof images]
                      ? "bg-green-50 border-green-500"
                      : documentStage === side
                      ? "border-orange-500 bg-orange-50"
                      : "border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50"
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    {images[side as keyof typeof images] ? (
                      <div className="w-16 h-16 rounded-lg bg-green-100 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-orange-600" />
                      </div>
                    )}
                    <div>
                      <span className="block text-base font-medium">
                        {side.charAt(0).toUpperCase() + side.slice(1)} Side
                      </span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={
                            images[side as keyof typeof images]
                              ? "uploaded"
                              : "upload"
                          }
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`block text-sm mt-1 ${
                            images[side as keyof typeof images]
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {images[side as keyof typeof images]
                            ? "Document uploaded successfully"
                            : "Click to capture photo"}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Warning Message */}
            <Alert className="mb-8">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Ensure your document is well-lit and all text is clearly visible
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {images.selfie && images.back && images.front ? (
                  <motion.button
                    key="submit"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Submit Documents for Verification
                  </motion.button>
                ) : (
                  <motion.button
                    key="proceed"
                    onClick={() => {
                      router.push(
                        `/verification/document-verification/upload/${documentStage}`
                      );
                    }}
                    disabled={!documentStage}
                    className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Document
                  </motion.button>
                )}
              </AnimatePresence>

              <p className="text-sm text-gray-500 text-center">
                Your documents will be securely processed and verified within 24
                hours
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DocumentStep;
