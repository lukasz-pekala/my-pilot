import ollama, { ChatRequest, ListResponse } from "ollama";

export interface OllamaClient {
  list(): Promise<ListResponse>;
  chat(
    request: ChatRequest & {
      stream: true;
    }
  ): Promise<AsyncIterable<any>>;
  ps(): Promise<ListResponse>;
}

export class DefaultOllamaClient implements OllamaClient {
  async list(): Promise<ListResponse> {
    return await ollama.list();
  }

  async chat(
    request: ChatRequest & {
      stream: true;
    }
  ): Promise<AsyncIterable<any>> {
    return await ollama.chat(request);
  }

  async ps() {
    return await ollama.ps();
  }
}
