"use client";
import React from "react";

function Footer() {
  const handleClick = () => {
    window.open("https://sanayvarghese.github.io/", "_blank");
  };
  return (
    <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-[#020713] to-[#10001e] text-center">
      <p className="text-slate-500 text-sm">
        Game Developed for Gemini API Competition
      </p>
      <p className="text-gray-600 text-sm inline-flex gap-1">
        &copy; Infergram 2024 - Developed by{" "}
        <span
          className="hover:text-sky-900 cursor-pointer hover:underline"
          onClick={handleClick}
        >
          Sanay George Varghese
        </span>
      </p>
    </div>
  );
}

export default Footer;
