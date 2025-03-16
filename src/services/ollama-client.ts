import ollama, { ListResponse } from 'ollama';

export interface OllamaClient {
  list(): Promise<ListResponse>;
  chat(params: any): Promise<AsyncIterable<any>>;
}

export class DefaultOllamaClient implements OllamaClient {
  async list(): Promise<ListResponse> {
    return await ollama.list();
  }

  async chat(params: any): Promise<AsyncIterable<any>> {
    return await ollama.chat(params);
  }
}