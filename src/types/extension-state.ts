import * as vscode from 'vscode';

export interface ExtensionState {
  currentPanel?: vscode.WebviewPanel;
  isWebviewActive: boolean;
}
