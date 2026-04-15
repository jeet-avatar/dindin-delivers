import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Logo() {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav("/")}
      className="flex items-center gap-2 focus:outline-none"
    >
      <img src={logo} alt="Artha Build" className="h-12 w-auto" />
    </button>
  );
}
