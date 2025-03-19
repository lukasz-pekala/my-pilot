import { ListResponse, ModelResponse } from 'ollama';
import * as vscode from 'vscode';

export interface ExtensionState {
  modelsList?: ListResponse;
  isWebviewActive: boolean;
  currentPanel?: vscode.WebviewPanel;
  selectedModel?: ModelResponse;
  chatHistory?: Array<{ role: string; content: string }>;
}
