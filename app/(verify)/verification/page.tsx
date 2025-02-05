"use client";

import React, { useState } from "react";
import ImageBlur from "@/components/common/ImageBlur";
import { LandingIll } from "@/constants";
import "react-phone-number-input/style.css";
import PhoneInput, { formatPhoneNumber } from "react-phone-number-input";
import { E164Number } from "libphonenumber-js/core";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UseUserInfo } from "@/hooks/useUserInfo";

const Verification = () => {
  const [valuePhone, setValuePhone] = useState<E164Number | undefined>(
    undefined
  );
  const router = useRouter();
  const [formInfo, setFormInfo] = useState<FormInfo>({
    name: "",
    email: "",
    phoneNumber: "",
  });
  const { setUserInfo } = UseUserInfo();


  // Handling input changes 
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormInfo((prev) => ({ ...prev, [name]: value }));
  };

  //   handle phone input change
  const handlePhoneChange = (phoneValue: E164Number | undefined) => {
    setValuePhone(phoneValue);
    if (phoneValue) {
      setFormInfo((prev) => ({
        ...prev,
        phoneNumber: formatPhoneNumber(phoneValue).trim() || "",
      }));
    }
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // form validation
    if (!formInfo.name || !formInfo.email || !formInfo.phoneNumber) {
      alert("All fields are required");
      return;
    }

    console.log("Success ", formInfo);
    setUserInfo(formInfo);
    router.push("/verification/info-upload");
  };

  return (
    <div className="flex gap-10 p-10 container max-sm:flex-col-reverse justify-center items-center">
      <div className="w-1/2 max-sm:w-full">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md p-5 rounded-md"
          action=""
        >
          <h2 className="text-2xl text-green-400 mb-6 text-center font-semibold">
            Submit eKYC
          </h2>
          <div className="space-y-4">
            {/* Name Input */}
            <div className="space-y-2">
              <Label
                className="text-base font-medium text-gray-700"
                htmlFor="name"
              >
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Emmanuel Hudson"
                className="py-6"
                value={formInfo.name}
                onChange={handleOnChange}
              />
            </div>
            {/* Name Input */}

            {/* Email Input */}
            <div className="space-y-2">
              <Label
                className="text-base font-medium text-gray-700"
                htmlFor="email"
              >
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                placeholder="hudson@gmail.com"
                type="email"
                className="py-6"
                value={formInfo.email}
                onChange={handleOnChange}
              />
            </div>
            {/* Email Input */}

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label
                className="text-base font-medium text-gray-700"
                htmlFor="phoneNumber"
              >
                Phone Number
              </Label>
              <PhoneInput
                id="phoneNumber"
                value={valuePhone}
                onChange={handlePhoneChange}
                placeholder="Phone Input"
                className="border shadow-sm focus-within:outline-1 rounded-md px-3"
              />
            </div>
            {/* Phone Number Input */}
          </div>

          {/* Submit Button */}
          <Button className="w-full py-6 mt-6 bg-orange-400 hover:bg-orange-300">
            Proceed
          </Button>
          {/* Submit Button */}
        </form>
      </div>

      <div className="w-1/2 h-[400px] min-h-max max-sm:w-[80%]">
        <ImageBlur
          src={LandingIll.VerifyImage}
          alt="Verify Image"
          width={300}
          height={200}
          className="w-full object-contain h-full"
          sizes="(max-width:768px) 60vw, 80vw"
        />
      </div>
    </div>
  );
};

export default Verification;
