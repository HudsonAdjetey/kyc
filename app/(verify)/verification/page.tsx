"use client";

import "react-phone-number-input/style.css";

import { motion } from "framer-motion";
import { Users, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

const VerificationPage = () => {
  const router = useRouter();

  const verificationTypes = [
    {
      id: "personal",
      title: "Personal Verification",
      description: "Verify your personal identity with basic information",
      icon: <Users className="w-8 h-8 text-orange-400" />,
    },
    {
      id: "address",
      title: "Address Verification",
      description: "Complete Your address verification for enhanced security",
      icon: <Building2 className="w-8 h-8 text-orange-400" />,
    },
  ];

  return (
    <div className="container  mx-auto px-10 py-10">
      <h1 className="text-3xl font-semibold text-center mb-2">
        Choose Verification Type
      </h1>
      <p className="text-gray-600 text-center mb-10">
        Select the type of verification you would like to proceed with
      </p>

      <div className="grid md:grid-cols-2  gap-6 max-w-4xl mx-auto">
        {verificationTypes.map((type) => (
          <motion.div
            key={type.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              className="p-6 w-full disabled:text-black/50 disabled:shadow-none disabled:cursor-not-allowed shadow-md rounded-md cursor-pointer h-full hover:shadow-lg transition-shadow"
              onClick={() =>
                router.push("/verification/personal-identification")
              }
              disabled={type.id === "address"}
            >
              <div className="flex flex-col items-center text-center">
                {type.icon}
                <h2 className="text-xl font-semibold mt-4 mb-2">
                  {type.title}
                </h2>
                <p className="text-gray-600">{type.description}</p>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default VerificationPage;
