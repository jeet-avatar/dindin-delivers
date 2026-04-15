import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import NetSuiteModal from "./NetSuiteModal";
import type { NetSuiteStatus } from "../services/netsuiteService";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [netsuiteStatus, setNetsuiteStatus] = useState<NetSuiteStatus>({ authenticated: false });
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/log-in");
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sticky top-0 z-50 flex justify-between items-center px-6 py-3 bg-[#0d0d0d] border-b border-gray-800">
      {/* Logo or Title */}
      <h1 className="text-white text-lg font-semibold">ArthaBuild</h1>

      <div className="flex items-center gap-3">
        {/* NetSuite TBA connection button and modal */}
        <NetSuiteModal onStatusChange={setNetsuiteStatus} />

        {/* Deploy button — shown when NetSuite is connected */}
        {netsuiteStatus.authenticated && (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Deploy
          </button>
        )}

        {/* 3 Dots Button + Dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-gray-800 transition"
          >
            <MoreHorizontal className="w-6 h-6 text-white" />
          </button>

          {/* Animated Dropdown menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-40 bg-gray-900 text-white rounded-lg shadow-lg overflow-hidden"
              >
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-700">
                  Settings
                </button>
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-700">
                  Help
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                >
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
