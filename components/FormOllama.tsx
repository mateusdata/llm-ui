"use client";

import React, { useState, useMemo, useEffect } from "react";
import { fetchOllamaResponse } from "@/app/lib/ollama";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";

// Configura o marked para renderizar markdown com highlight.js
marked.setOptions({
  gfm: true,
  breaks: false,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

export default function FormOllama() {
  const [response, setResponse] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const promptText = formData.get("prompt") as string;

    try {
      const res = await fetchOllamaResponse(promptText);
      setResponse(res);
    } catch (error) {
      setResponse("Erro ao buscar resposta.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const formattedResponse = useMemo(() => {
    if (!response) return "";
    const cleanText = response.replace(/\\n/g, "\n").replace(/\\r/g, "");
    const html = marked.parse(cleanText);
    return DOMPurify.sanitize(html);
  }, [response]);

  useEffect(() => {
    if (formattedResponse) {
      hljs.highlightAll();
    }
  }, [formattedResponse]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white p-6">
      <header className="mb-8 text-center">
      <h1 className="text-4xl font-bold text-blue-400">Chat com Ollama</h1>
      <p className="text-gray-400 mt-2 text-sm">Converse com um modelo de linguagem treinado localmente</p>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full flex flex-col">
      {response && (
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg prose prose-invert max-w-none whitespace-pre-wrap mb-6 flex-1">
        <h2 className="text-2xl font-semibold mb-4 text-blue-300">Resposta:</h2>
        <div dangerouslySetInnerHTML={{ __html: formattedResponse }} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mt-auto">
        <input
        type="text"
        name="prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Digite sua pergunta aqui..."
        className="flex-1 px-4 py-3 rounded-md border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
        required
        />
        <button
        type="submit"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition disabled:opacity-50"
        disabled={loading}
        >
        {loading ? "Carregando..." : "Enviar"}
        </button>
      </form>
      </main>

      <footer className="text-center text-sm text-gray-600 mt-12">
      &copy; {new Date().getFullYear()} - Projeto Ollama Chat
      </footer>
    </div>
  );
}
