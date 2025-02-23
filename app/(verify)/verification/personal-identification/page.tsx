"use client";

import React, { useMemo, useState } from "react";
import "react-phone-number-input/style.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PhoneInput from "react-phone-number-input";
import { useForm, Controller } from "react-hook-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import countryList from "react-select-country-list";
import { CountryCode } from "libphonenumber-js";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormData {
  phoneNumber: string;
  fullName: string;
}

const Personal = () => {
  const router = useRouter();
  const options = useMemo(() => countryList().getData(), []);
  const [selectedCountry, setSelectedCountry] = useState<string>("GH");
  const [countryError, setCountryError] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      phoneNumber: "",
      fullName: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setCountryError("");

      if (!selectedCountry) {
        setCountryError("Please select a country");
        return;
      }

      console.log({ ...data, country: selectedCountry });

      if (data.fullName && data.phoneNumber && selectedCountry) {
        await router.push("/verification/face-validation");
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value as string);
    setCountryError("");
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/verification" className="mb-6 flex items-center gap-3">
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
              {...register("fullName", {
                required: "Full name is required",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters long",
                },
              })}
              className={`${errors.fullName ? "border-red-500" : ""}`}
            />
            {errors.fullName && (
              <p className="text-red-500 text-sm">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger
                className={`w-full h-14 py-6 ${
                  countryError ? "border-red-500" : ""
                }`}
              >
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {options.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {countryError && (
              <p className="text-red-500 text-sm">{countryError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Controller
              name="phoneNumber"
              control={control}
              rules={{
                required: "Phone number is required",
                validate: (value) => {
                  if (value && value.length < 8) {
                    return "Please enter a valid phone number";
                  }
                  return true;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <PhoneInput
                  international
                  defaultCountry={selectedCountry as CountryCode}
                  value={value}
                  onChange={onChange}
                  className={`border rounded-md p-2 w-full ${
                    errors.phoneNumber ? "border-red-500" : "border-gray-300"
                  }`}
                />
              )}
            />
            {errors.phoneNumber && (
              <p className="text-red-500 text-sm">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-400 hover:bg-orange-300 text-white py-6 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Verification"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Personal;
