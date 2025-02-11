"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles,  Mail } from "lucide-react";

export const CompleteStep = () => {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.2,
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

  return (
    <motion.div
      className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="relative mb-12">
        <motion.div
          className="text-green-500 w-24 h-24 relative z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.2,
          }}
        >
          <CheckCircle size={96} strokeWidth={2} />
        </motion.div>

        <motion.div
          className="absolute inset-0 bg-green-50 rounded-full z-0"
          initial={{ scale: 0 }}
          animate={{ scale: 1.2 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />

        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${Math.sin(i * (Math.PI / 3)) * 70 + 50}%`,
              left: `${Math.cos(i * (Math.PI / 3)) * 70 + 50}%`,
            }}
            initial={{
              scale: 0,
              rotate: 0,
            }}
            animate={{
              scale: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              delay: i * 0.2,
            }}
            custom={i}
          >
            <Sparkles className="text-green-300" size={20} />
          </motion.div>
        ))}
      </div>

      <motion.div className="text-center max-w-md" variants={itemVariants}>
        <motion.h2
          className="text-3xl font-bold text-blue-950 mb-4"
          variants={itemVariants}
        >
          Verification Complete!
        </motion.h2>

        <motion.p
          className="text-lg text-gray-600 mb-8"
          variants={itemVariants}
        >
          Thank you for completing the verification process.
        </motion.p>

        <motion.div className="space-y-6" variants={itemVariants}>
          <motion.div
            className="bg-orange-50 rounded-xl p-6 border border-green-100"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <p className="text-orange-700 flex  gap-2 justify-center">
              <CheckCircle size={25} className="inline-block" />
              Your documents have been successfully verified and processed.
            </p>
          </motion.div>

        

          <motion.div
            className="flex items-center justify-center gap-2 text-sm text-gray-500"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Mail size={16} />A confirmation email has been sent to your inbox
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default CompleteStep;
