import Link from "next/link";
import React from "react";

const Header = () => {
  return (
    <header className="shadow-sm py-6 px-4 sticky top-0 inset-x-0 bg-white z-20">
      <nav className="flex items-center justify-between">
        {/* dummt logo */}
        <Link href={"/"} className="text-lg tracking-wider text-gray-900">Paymaster KYC</Link>

        <ul className="flex items-center gap-4 header-links">
          <li>
            <Link href={"/verification"}>Verification</Link>
          </li>
          <li>
            <Link href={"/customer-support"}>Customer Support</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
