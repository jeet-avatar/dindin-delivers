import React from "react";
import { Link } from "react-router-dom";
import Button from "./Button";
import { LogIn, UserPlus } from "lucide-react";

export default function Navbar() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
      <Link to="/" className="font-bold text-lg">
        Chatbot
      </Link>
      <div className="flex gap-2 items-center">
        <Link to="/login">
          <Button className="flex items-center gap-2">
            <LogIn className="h-4 w-4" /> Login
          </Button>
        </Link>
        <Link to="/signup">
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Sign up
          </Button>
        </Link>
      </div>
    </div>
  );
}
