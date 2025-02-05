"use client";
import ImageBlur from "@/components/common/ImageBlur";
import { LandingIll } from "@/constants";
import React from "react";

const HomePage = () => {
  return (
    <main className="min-h-screen  container">
      <div className="max-w-lg space-y-2 my-6 text-center mx-auto max-sm:w-full">
        <h1 className="text-2xl ">Paymaster KYC Verification</h1>
        <p className="text-gray-600 text-sm">
          Paymaster is a digital payment gateway that enables you to accept
          payments securely and easily. With Paymaster KYC Verification, we help
          you verify your identity and address to ensure your payments are
          processed correctly and safely.
        </p>
      </div>
      <div className="max-w-md mx-auto">
        <ImageBlur
          alt=""
          src={LandingIll.srcImage}
          width={300}
          height={400}
          className="w-full"
        />
      </div>
      <footer className="mt-10">
        <div className="text-center text-gray-600 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Paymaster. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default HomePage;
