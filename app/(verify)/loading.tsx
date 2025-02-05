"use client";
import Image from "next/image";

const Loading = () => {
  return (
    <div className="flex items-center flex-col justify-center  size-full h-screen gap-3 text-white">
      <Image
        src="/icons/loader.svg"
        alt="loader"
        width={40}
        height={40}
        className="animate-spin"
        layout="intrinsic"
      />
      Loading...
    </div>
  );
};
export default Loading;
