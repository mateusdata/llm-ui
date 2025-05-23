"use client";

import { useState } from "react";
import { Menu, Search, Settings2, Mic2, X } from "lucide-react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [responses, setResponses] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      setResponses((prev) => [...prev, "pensanado"]);
      setInputValue("");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#212121] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed z-10 top-0 left-0 h-full w-64 bg-[#181818] p-4 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Settings2 size={24} className="text-white" />
            <Search size={24} className="text-white" />
          </div>
          {/* Mobile-only toggle inside sidebar */}
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={24} className="text-white" />
          </button>
        </div>
        <div className="text-white text-2xl font-semibold mb-6">NuFuturo</div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64">
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-6">
            <h1 className="text-white text-2xl text-center">Como posso ajudar?</h1>

            {/* Responses */}
            <div className="space-y-2">
              {responses.map((resp, i) => (
                <div key={i} className="italic text-gray-400 text-center">
                  {resp}
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center bg-[#2a2a2a] rounded-2xl p-4">
              <input
                type="text"
                placeholder="Pergunte alguma coisa"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-base"
              />
              <div className="flex items-center gap-4 ml-4">
                <Mic2 size={24} className="text-white cursor-pointer hover:opacity-70" />
                <Settings2 size={24} className="text-white cursor-pointer hover:opacity-70" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Universal toggle (always visible) */}
      <button
        className="fixed top-4 left-4 z-20"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
      </button>
    </div>
  );
}
