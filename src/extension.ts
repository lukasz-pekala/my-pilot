// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import { DefaultOllamaClient } from './services/ollama-client';
import { initializeState } from './utils/state-manager';

import { createPanel, setupMessageHandlers } from './webview/chat-panel';
import { ListResponse } from 'ollama';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Initialize state with persistence
  initializeState(context);

  const ollamaClient = new DefaultOllamaClient();

  const disposable = vscode.commands.registerCommand(
    'mypilot.openmypilot',
    async () => {
      try {
        // Show progress during initialization
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Initializing My Pilot...',
            cancellable: false,
          },
          async () => {
            const modelsList = await ollamaClient.list();
            const initialized = updateContextWithModelsList(
              context,
              modelsList
            );

            if (initialized) {
              const panel = createPanel(context);
              setupMessageHandlers(panel, context, ollamaClient);
            }
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to initialize My Pilot: ${error}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// todo: consider moving to utils??
export function updateContextWithModelsList(
  context: vscode.ExtensionContext,
  modelsList: ListResponse
) {
  if (modelsList.models.length === 0) {
    vscode.window.showErrorMessage(
      'No models found. Extension will not be activated. Please install at least one model using Ollama.'
    );
    return false;
  }

  context.globalState.update('modelsList', modelsList);
  context.globalState.update('selectedModel', modelsList.models[0]);

  return true;
}
