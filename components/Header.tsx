"use client";

import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavLinks = [
    { href: "/verification", label: "Verification" },
    { href: "/customer-support", label: "Customer Support" },
  ];

  

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const menuList = document.getElementById("mobile-menu");
      const menuButton = document.getElementById("menu-button");

      if (
        menuList &&
        !menuList.contains(event.target as Node) &&
        menuButton &&
        !menuButton.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscapeKey);
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      // Cleanup
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 inset-x-0 z-20 bg-white shadow-sm">
      <div className="px-10 max-sm:px-5">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-semibold tracking-wider text-gray-900 hover:text-gray-700 transition-colors"
          >
            Paymaster KYC
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden sm:flex items-center space-x-8">
            {mainNavLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-gray-800 text-lg font-medium tracking-wide hover:text-orange-400 transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile Menu Button */}
          <button
            id="menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed  inset-0 bg-black/50 sm:hidden transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div
          id="mobile-menu"
          className={`fixed right-0 top-0 h-full w-[80%] bg-white shadow-xl transition-transform duration-300 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <nav className="h-full  p-10 pt-4 overflow-y-auto">
            <button
              id="menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="sm:hidden p-2 mb-5 rounded-md hover:bg-gray-100 transition-colors"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <X size={24} />
            </button>
            <ul className="p-4 space-y-4">
              {mainNavLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
