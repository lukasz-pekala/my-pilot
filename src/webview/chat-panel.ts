import * as vscode from 'vscode';
import { loadWebviewContent } from './webview-utils';
import { WebviewMessage } from '../types/messages';
import { ListResponse } from 'ollama';
import { OllamaClient } from '../services/ollama-client';
import { WebviewCommand } from '../types/commands';
import { handleChatMessage } from '../messages/handle-chat-message';
import { handleChangeModelMessage } from '../messages/handle-change-model-message';
import { ExtensionState } from '../types/extension-state';

export function createPanel(
  context: vscode.ExtensionContext
): vscode.WebviewPanel {
  const column =
    vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
  const state = context.globalState.get<ExtensionState>('state', {
    isWebviewActive: false,
    currentPanel: undefined,
    selectedModel: undefined,
    chatHistory: [],
  });

  // display information meesagee with stringified state
  vscode.window.showInformationMessage(JSON.stringify(state));

  if (state.currentPanel?.title && state.isWebviewActive) {
    state.currentPanel.reveal(column);
    return state.currentPanel;
  }

  const panel = vscode.window.createWebviewPanel(
    'myPilot',
    'My Pilot',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'webviews'),
      ],
      retainContextWhenHidden: true,
    }
  );

  // Update state
  state.currentPanel = panel;
  state.isWebviewActive = true;
  context.globalState.update('state', state);

  // Handle disposal
  panel.onDidDispose(() => {
    const currentState = context.globalState.get<ExtensionState>('state', {
      isWebviewActive: false,
    });
    currentState.currentPanel = undefined;
    currentState.isWebviewActive = false;
    context.globalState.update('state', currentState);
  });

  const modelsList = context.globalState.get('modelsList') as ListResponse;
  panel.webview.html = loadWebviewContent(
    context.extensionUri,
    panel.webview,
    modelsList
  );

  return panel;
}

export function setupMessageHandlers(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  ollamaClient: OllamaClient
): void {
  // Track disposables
  const disposables: vscode.Disposable[] = [];

  // Add panel disposal handler
  panel.onDidDispose(
    () => {
      disposables.forEach((d) => d?.dispose());
    },
    null,
    disposables
  );

  // Add message handler
  disposables.push(
    panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.command) {
        case WebviewCommand.Chat:
          await handleChatMessage(panel, context, message, ollamaClient);
          break;
        case WebviewCommand.ChangeModel:
          handleChangeModelMessage(panel, context, message);
          break;
      }
    })
  );
}
