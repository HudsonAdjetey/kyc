"use client";

import { cn } from "@/lib/utils";
import Image, { ImageProps } from "next/image";
import React, { useState } from "react";

const ImageBlur: React.FC<ImageProps> = ({
  className,
  src,
  width,
  height,
  alt,
  sizes,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Image
      className={cn(
        "transition duration-300 object-cover object-center",
        isLoading ? "blur-sm" : "blur-0",
        className
      )}
      onLoad={() => setIsLoading(false)}
      src={src}
      alt={alt || "An image is being loaded"}
      loading="lazy"
      placeholder="blur"
      decoding="async"
      blurDataURL={
        "https://cdn.pixabay.com/photo/2015/06/24/02/12/the-blurred-819388_1280.jpg"
      }
      sizes={sizes}
      {...props}
      width={width}
      height={height}
    />
  );
};

export default ImageBlur;
