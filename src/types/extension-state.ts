import * as vscode from 'vscode';

export interface ExtensionState {
  isWebviewActive: boolean;
  currentPanel?: vscode.WebviewPanel;
  selectedModel?: string;
  chatHistory?: Array<{ role: string; content: string }>;
}
