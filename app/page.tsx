"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Menu, Settings2, X, Send, Plus, Mic, Trash2 } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id?: number;
  sender: string;
  text: string;
  type?: "text" | "chart" | "error";
  chartData?: any[];
  timestamp: string;
  isStreaming?: boolean;
};

const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableModels, setAvailableModels] = useState<{
    value: string;
    label: string;
  }[]>([]);
  const [model, setModel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
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
              label: m.name,
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
        setMessages((prev) => [
          ...prev,
          {
            sender: "error",
            text: "Falha ao carregar modelos. Verifique a conexão com o servidor.",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };
    fetchModels();
  }, []);

  const standardizeText = (text: string) => {
    if (!text) return "";
    let t = text.trim();
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  };

  const renderChart = (data: any[]) => (
    <div className="w-full h-64 bg-[#2c2c2c] rounded-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="time"
            stroke="#ccc"
            tickFormatter={(tick) =>
              new Date(tick).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          <YAxis stroke="#ccc" />
          <Tooltip
            contentStyle={{ backgroundColor: "#333", borderColor: "#666" }}
            labelFormatter={(label) => `Hora: ${new Date(label).toLocaleString()}`}
          />
          <Line
            type="monotone"
            dataKey="values"
            stroke="#FF8C00"
            strokeWidth={2}
            dot={false}
            name="Valor"
          />
          <Line
            type="monotone"
            dataKey={(entry) => (entry.anomaly ? entry.values : null)}
            stroke="#FF0000"
            strokeWidth={3}
            dot={{ r: 5 }}
            name="Anomalia"
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const queryMatrixProfile = async (metric: string) => {
    const data = {
      prom_query: metric,
    };

    try {
      const response = await axios.post("http://127.0.0.1:3003/matrix-profile", data);

      alert(JSON.stringify(response.data, null, 2));

      
      if (response.status !== 200) {
        alert("Erro ao consultar a métrica no Prometheus.");
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching matrix profile:", error);
      throw new Error(`Erro ao consultar a métrica ${metric} no Prometheus.`);
    }
  };

  const queryOllama = async (
    metric: string,
    matrixData: any,
    onStream: (chunk: string) => void
  ) => {
    try {
      const ollamaPrompt = `
      veja os dados somente dessa metrica:
      Você é um analista de observabilidade no projeto NuFuturo. Aqui estão os dados JSON da métrica '${metric}' obtida do Prometheus:
      \`\`\`json
      ${JSON.stringify(matrixData, null, 2)}
      \`\`\`
      Por favor, gere um resumo, descreva o comportamento da métrica, identifique se há anomalias e forneça uma avaliação geral. Use Markdown para formatar a resposta.
    `;
      const res = await fetch("http://127.0.0.1:3003/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: ollamaPrompt, model, stream: true }),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          onStream(chunk);
        }
      }
    } catch (err) {
      console.error(err);
      throw new Error("Erro ao processar a solicitação com o Ollama.");
    }
  };

  const handleSend = debounce(async () => {
    if (!inputValue.trim()) return;
    const userMessage = standardizeText(inputValue);
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage, timestamp: new Date().toLocaleTimeString() },
    ]);
    setInputValue("");
    setIsLoading(true);

    try {
      const matrixData = await queryMatrixProfile(inputValue);
      const assistantMessageId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          sender: "assistant",
          text: "",
          type: "text",
          timestamp: new Date().toLocaleTimeString(),
          isStreaming: true,
        },
      ]);

      const onStream = (chunk: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, text: msg.text + chunk } : msg
          )
        );
      };

      await queryOllama(userMessage, matrixData, onStream);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
        )
      );

      if (matrixData.data && Array.isArray(matrixData.data)) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: "",
            type: "chart",
            chartData: matrixData.data,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "error",
          text: err.message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, 500);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="flex h-screen w-screen bg-[#212121] overflow-hidden relative">
        <aside
          className={`fixed z-10 top-0 left-0 h-full w-64 bg-[#181818] p-4 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md:translate-x-0`}
        >
          <div className="flex items-center justify-between mb-8">
            <Settings2 size={24} className="text-white" />
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={24} className="text-white" />
            </button>
          </div>
          <div className="text-white text-2xl font-semibold mb-6">NuFuturo</div>
          <button
            onClick={() => setMessages([])}
            className="flex items-center space-x-2 text-white hover:bg-[#222] p-2 rounded-lg"
          >
            <Trash2 size={20} />
            <span>Limpar Conversa</span>
          </button>
        </aside>

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

        <div className="flex flex-1 flex-col md:pl-64 p-4">

          <div
            className={`flex-1 w-full max-w-3xl mx-auto no-scrollbar overflow-y-auto p-2 ${isEmpty ? "flex items-center justify-center" : "flex flex-col"
              }`}
          >
            {isEmpty ? (
              <h1 className="text-gray-400 text-center text-xl">
                Como posso ajudar?
              </h1>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl w-full max-w-3xl mx-auto my-1 text-gray-100 ${msg.sender === "user"
                    ? "bg-[#303030] self-end text-right"
                    : msg.sender === "error"
                      ? "bg-red-600 self-start text-left"
                      : msg.type === "chart"
                        ? "bg-transparent self-start"
                        : "bg-transparent self-start text-left"
                    }`}
                >
                  <div className="text-sm text-gray-400 mb-1">{msg.timestamp}</div>
                  {msg.type === "chart" ? (
                    renderChart(msg.chartData || [])
                  ) : (
                    <>
                      <div className="break-words text-left">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => <p className="block" {...props} />,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                        {msg.isStreaming && <span className="animate-pulse">▋</span>}

                      </div>
                    </>
                  )}


                </div>
              ))

            )}

            {isLoading && (
              <div className="p-4 rounded-2xl w-full max-w-3xl mx-auto my-1 text-gray-100 bg-[#303030] self-end text-right">
                <div className="animate-pulse">Analisando métrica, aguarde...</div>
              </div>
            )}
            <div ref={messagesEndRef}></div>
          </div>

          <div className="w-full max-w-3xl mx-auto mt-4">
            <div className="relative flex items-center bg-[#444654] rounded-3xl h-16">
              <button className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Plus size={20} className="text-white" />
              </button>
              <textarea
                placeholder="Envie uma métrica do Prometheus (ex.: go_info)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
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