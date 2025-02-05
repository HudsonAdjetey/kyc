import type React from "react";

export const CompleteStep: React.FC = () => {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-green-500">
        Verification Complete!
      </h2>
      <p className="mt-2 text-gray-600">
        Thank you for completing the verification process.
      </p>
    </div>
  );
};
