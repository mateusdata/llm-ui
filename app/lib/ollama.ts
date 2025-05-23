// app/lib/ollama.ts
export interface ModelTag {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: Record<string, unknown>;
}

export async function fetchOllamaResponse(
  prompt: string,
  model: string = 'deepseek-coder',
  stream: boolean = false
): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao conectar com o Ollama');
    }

    const data: { response: string } = await response.json();
    return data.response;
  } catch (error) {
    console.error('Erro na requisição ao Ollama:', error);
    throw error;
  }
}

export async function fetchModels(): Promise<ModelTag[]> {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (!res.ok) throw new Error('Erro ao buscar modelos');
    const data: { models: ModelTag[] } = await res.json();
    return data.models;
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    return [];
  }
}