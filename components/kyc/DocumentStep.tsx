import { useCallback, useState } from "react";
import { FaIdCard } from "react-icons/fa";
import ImageBlur from "@/components/common/ImageBlur";
import { DocumentCapture } from "./DocumentCapture";
import person from "@/public/images/people-working-with-ai-operated-devices.jpg";
import { UseUserInfo } from "@/hooks/useUserInfo";

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
  const { userInfo } = UseUserInfo();
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-lg text-gray-400">STEP 3</p>
        <h1 className="text-3xl max-md:text-xl text-green-500">Document</h1>
      </div>
      <div className="max-w-xl w-full mt-10 mx-auto">
        <div className="flex items-center gap-10 max-sm:flex-col">
          <span className="w-[250px] overflow-hidden flex h-[300px] rounded-full">
            <ImageBlur
              width={300}
              height={300}
              src={images.selfie || person}
              alt="selfie"
              className="object-cover h-full w-full"
              sizes={"(max-width: 768px) 70vw, 90vw"}
            />
          </span>
          <div>
            <h1 className="text-2xl">
              {userInfo.name ? <span>{`${userInfo.name}`}</span> : "@testUser"}
            </h1>
            <p className="text-lg max-sm:text-base mt-2 text-gray-500">
              {userInfo.email ? <p>{userInfo.email}</p> : "nonreply@gmail.com"}
            </p>
          </div>
        </div>
        <div className="flex gap-4  justify-center my-10 max-sm:flex-col">
          <button
            className={`flex-1 max-w-full max-sm:justify-center flex items-center h-20 ${
              images.front || documentStage === "front"
                ? "border-green-500"
                : ""
            } rounded-md border-dashed border-2 items-center gap-4 max-w-xs max-sm:w-full px-4 py-5`}
            onClick={() => setDocumentStage("front")}
          >
            <FaIdCard size={50} />
            <p className="text-xl uppercase text-gray-700">front</p>
          </button>
          <button
            className={`flex-1 max-w-full flex items-center h-20 max-sm:justify-center ${
              images.back || documentStage === "back" ? "border-green-500" : ""
            } rounded-md border-dashed border-2 items-center gap-4 max-w-xs px-4 py-5`}
            onClick={() => setDocumentStage("back")}
          >
            <FaIdCard size={50} />
            <p className="text-xl uppercase text-gray-700">Back</p>
          </button>
        </div>
        {images.selfie && images.back && images.front ? (
          <button
            className="py-4 mx-auto text-white mt-6 w-full bg-orange-400 disabled:bg-orange-100 rounded-md disabled:select-none"
            onClick={() => setDocumentStage("submit")}
          >
            Submit
          </button>
        ) : (
          <div className="max-w-full mx-auto">
            <button
              className="py-4 mx-auto text-white mt-6 w-full bg-orange-400 disabled:bg-orange-100 rounded-md disabled:select-none"
              disabled={documentStage === ""}
              onClick={() => {
                if (documentStage === "") return;
                updateStep(documentStage as Step);
              }}
            >
              Proceed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
