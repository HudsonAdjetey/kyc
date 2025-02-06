"use client";

import { CompleteStep } from "@/components/kyc/CompleteStep";
import { DocumentStep } from "@/components/kyc/DocumentStep";
import { PreloadStep } from "@/components/kyc/PreloadStep";
import { SelfieStep } from "@/components/kyc/SelfieStep";
import { useEffect, useState } from "react";

const KycVerification = () => {
  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      id: "preload",
      title: "Preload",
      description: "Loading required resources and preparing camera...",
      status: "pending",
    },
    {
      id: "selfie",
      title: "Selfie",
      description: "Please take a selfie with your face clearly visible.",
      status: "pending",
    },
    {
      id: "document",
      title: "Document",
      description: "Please upload a valid ID card.",
      status: "pending",
    },
    {
      id: "front",
      title: "Front",
      description: "Please upload the front side of the ID card.",
      status: "pending",
    },
    {
      id: "back",
      title: "Back",
      description: "Please upload the back side of the ID card.",
      status: "pending",
    },
    {
      id: "complete",
      title: "Complete",
      description: "Verification complete!",
      status: "pending",
    },
  ]);

  const [step, setStep] = useState<Step>("preload");
  const [images, setImages] = useState<{ [key in Step]?: string }>({});
  const [err, setErr] = useState<string | null>(null);

  const updateStep = (newStep: Step) => {
    setStep(newStep);
    setSteps((prevSteps) =>
      prevSteps.map((s) => ({
        ...s,
        status: s.id === newStep ? "processing" : s.status,
      }))
    );
  };

  const completeStep = (completedStep: Step) => {
    setSteps((prevSteps) =>
      prevSteps.map((s) => ({
        ...s,
        status: s.id === completedStep ? "complete" : s.status,
      }))
    );
  };

  const renderStep = () => {
    const currentStep = steps.find((s) => s.id === step);
    if (!currentStep) return null;

    switch (step) {
      case "preload":
        return (
          <PreloadStep
            onComplete={() => updateStep("selfie")}
            setErr={setErr}
          />
        );
      case "selfie":
        return (
          <SelfieStep
            onComplete={(image) => {
              setImages((prev) => ({ ...prev, selfie: image }));
              completeStep("selfie");
            }}
            setStep={() => setStep("document")}
            image={images.selfie || ""}
          />
        );
      case "document":
      case "front":
      case "back":
        return (
          <DocumentStep
            step={step}
            images={images}
            onComplete={(image) => {
              setImages((prev) => ({ ...prev, [step]: image }));
              completeStep(step);
              updateStep(step === "back" ? "complete" : "back");
            }}
            err={err}
            setErr={setErr}
            updateStep={updateStep}
          />
        );
      case "complete":
        return <CompleteStep />;
      default:
        return null;
    }
  };
  useEffect(() => {
    if (!err) return;
    const interval = setInterval(() => {
      setErr(null);
    }, 5000);

    return () => clearInterval(interval);
  }, [err]);
  return (
    <section className="container mx-auto px-10 py-8">
      {renderStep()}
      {err && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">{err}</div>
      )}
    </section>
  );
};

export default KycVerification;
