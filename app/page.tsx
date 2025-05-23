"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Settings2, X, Send, Plus, Mic } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [availableModels, setAvailableModels] = useState<{
    value: string;
    label: string;
  }[]>([]);
  const [model, setModel] = useState<string>("deeksek");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("http://127.0.0.1:3003/tags");
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(
            data.models.map((m: any) => ({
              value: m.name,
              label: m.details?.family
                ? `${m.details.family} (${m.name})`
                : m.name,
            }))
          );
          setModel(data.models[0].name);
        } else {
          setAvailableModels([{ value: "none", label: "Nenhum modelo" }]);
          setModel("none");
        }
      } catch {
        setAvailableModels([{ value: "none", label: "Nenhum modelo" }]);
        setModel("none");
      }
    };
    fetchModels();
  }, []);

  // Padroniza o texto (primeira letra maiúscula e ponto final)
  const standardizeText = (text: string) => {
    if (!text) return "";
    let t = text.trim();
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  };

  // Envia mensagem para backend Ollama
  const queryOllama = async (prompt: string) => {
    try {
      const res = await fetch("http://127.0.0.1:3003/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });
      const data = await res.json();
      return data.response as string;
    } catch (err) {
      console.error(err);
      return "Desculpe, ocorreu um erro.";
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userMessage = standardizeText(inputValue);
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInputValue("");

    const assistantRaw = await queryOllama(userMessage);
    const assistantMessage = standardizeText(assistantRaw);
    setMessages((prev) => [...prev, { sender: "assistant", text: assistantMessage }]);
  };

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="flex h-screen w-screen bg-[#212121] overflow-hidden relative">

        {/* Sidebar */}
        <aside
          className={`fixed z-10 top-0 left-0 h-full w-64 bg-[#181818] p-4 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="flex items-center justify-between mb-8">
            <Settings2 size={24} className="text-white" />
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={24} className="text-white" />
            </button>
          </div>
          <div className="text-white text-2xl font-semibold mb-6">NuFuturo</div>
        </aside>

        {/* Avatar and Model Select */}
        <div className="fixed top-4 right-4 z-20 flex items-center space-x-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-40 md:w-64 bg-[#333333] border border-[#333] text-white focus:ring-2 focus:ring-[#444]">
              <SelectValue>
                {model
                  ? `Modelo: ${model.charAt(0).toUpperCase() + model.slice(1)}`
                  : "Modelo"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#181818] text-white border-none">
              {availableModels.map((m) => (
                <SelectItem
                  key={m.value}
                  value={m.value}
                  className="hover:bg-[#222] text-white"
                >
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-10 h-10 rounded-full bg-[#FF8C00] flex items-center justify-center text-white font-bold">
            MS
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col md:pl-64 p-4">

          {/* Messages or placeholder */}
          <div className={`flex-1 w-full max-w-3xl mx-auto no-scrollbar overflow-y-auto p-2 ${
            isEmpty ? 'flex items-center justify-center' : 'flex flex-col'
          }`}>
            {isEmpty ? (
              <h1 className="text-gray-400 text-center text-xl">
                Como posso ajudar?
              </h1>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl w-full max-w-3xl mx-auto my-1 text-gray-100 ${
                    msg.sender === 'user'
                      ? 'bg-[#303030] self-end text-right'
                      : 'bg-transparent self-start text-left'
                  }`}
                >
                  {msg.text}
                </div>
              ))
            )}
            <div ref={messagesEndRef}></div>
          </div>

          {/* Input Bar */}
          <div className="w-full max-w-3xl mx-auto mt-4">
            <div className="relative flex items-center bg-[#444654] rounded-3xl h-16">
              <button className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Plus size={20} className="text-white" />
              </button>
              <textarea
                placeholder="Envie uma matriz do Prometheus"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-[#303030] outline-none rounded-3xl placeholder-gray-400 text-base text-white resize-none py-4 pl-12 pr-20 max-h-32 overflow-y-auto"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <button>
                  <Mic size={20} className="text-white" />
                </button>
                <button onClick={handleSend}>
                  <Send size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          className="fixed top-4 left-4 z-20"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Menu size={24} className="text-white" />
          )}
        </button>
      </div>
    </>
  );
}
