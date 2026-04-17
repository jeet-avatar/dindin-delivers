import React from "react";
import Sidebar from "./Sidebar";
import { ChatProvider } from "../contexts/ChatContext";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ChatProvider>
  );
}
