// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import { DefaultOllamaClient } from './services/ollama-client';
import { initializeState } from './utils/state-manager';

import { createPanel, setupMessageHandlers } from './webview/chat-panel';
import { ListResponse } from 'ollama';

import { ExtensionState } from './types/extension-state';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Initialize state with persistence
  initializeState(context);

  const ollamaClient = new DefaultOllamaClient();

  const disposable = vscode.commands.registerCommand(
    'mypilot.openmypilot',
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Initializing My Pilot...',
          cancellable: false,
        },
        async () => {
          try {
            const modelsList = await ollamaClient.list();
            const initialized = updateContextWithModelsList(
              context,
              modelsList
            );

            if (initialized) {
              const panel = createPanel(context);
              setupMessageHandlers(panel, context, ollamaClient);
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes('ECONNREFUSED')
            ) {
              vscode.window.showErrorMessage(
                'Could not connect to Ollama. Please ensure Ollama is running and try again.'
              );
            } else {
              vscode.window.showErrorMessage(
                `Failed to retrieve models: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
            return false;
          }
        }
      );
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// TODO: Consider moving this function to a utils file (e.g., src/utils/model-manager.ts)
export function updateContextWithModelsList(
  context: vscode.ExtensionContext,
  modelsList: ListResponse
) {
  // Validate the model list structure and content
  if (
    !modelsList ||
    !Array.isArray(modelsList.models) ||
    modelsList.models.length === 0
  ) {
    vscode.window.showErrorMessage(
      'No models found. Extension will not be activated. Please install at least one model using Ollama.'
    );
    return false;
  }

  // Validate that each model has the required properties
  for (const model of modelsList.models) {
    if (!model.name) {
      vscode.window.showErrorMessage(
        'Invalid model data received. Please reinstall your models or check Ollama installation.'
      );
      return false;
    }
  }

  context.globalState.update('modelsList', modelsList);
  const previousModel =
    context.globalState.get<ExtensionState['selectedModel']>('selectedModel');

  // Try to restore previously selected model if still available
  if (previousModel) {
    const modelStillExists = modelsList.models.some(
      (model) => model.name === previousModel.name
    );
    if (modelStillExists) {
      return true;
    }
  }

  // Otherwise default to the first model available
  context.globalState.update('selectedModel', modelsList.models[0]);

  return true;
}
