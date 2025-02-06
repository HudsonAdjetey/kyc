"use client";

import React from "react";

import "react-phone-number-input/style.css";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import PhoneInput from "react-phone-number-input";
import { useForm, Controller } from "react-hook-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Personal = () => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phoneNumber: "",
      fullName: "",
    },
  });
  const onSubmit = (data: {
    phoneNumber: string;
    fullName: string;
  }) => {
    console.log(data);
    if (data) {
      console.log("data");
    }
    if ( data.fullName && data.phoneNumber) {
      router.push("/verification/info-upload");
    }
  };

  return (
    <div className="container mx-auto px-10 py-10">
      <Link href={"/verification"} className="mb-6 flex items-center gap-3">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to Verification Types
      </Link>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Personal Verification</h1>
        <p className="text-gray-600 mb-8">Please fill in your details below</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              {...register("fullName", { required: "Full name is required" })}
              className={`${errors.fullName ? "border-red-500" : ""} `}
            />
            <p className="text-red-500 text-sm">{errors?.fullName?.message}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Controller
              name="phoneNumber"
              control={control}
              rules={{ required: "Phone number is required" }}
              render={({ field: { onChange, value } }) => (
                <PhoneInput
                  international
                  defaultCountry="GH"
                  value={value}
                  onChange={onChange}
                  className={`border rounded-md p-2 w-full ${
                    errors.phoneNumber ? "border-red-500" : "border-gray-300"
                  }`}
                />
              )}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-400 hover:bg-orange-300 text-white py-6"
          >
            Submit Verification
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Personal;
