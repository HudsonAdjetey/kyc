import type { Metadata } from "next";

import React from "react";

export const metadata: Metadata = {
  title: "Verification",
  description: "Verify your personal info",
};

const layout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <main>
      {children}
    </main>
  );
};

export default layout;
