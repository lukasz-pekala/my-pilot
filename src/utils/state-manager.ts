import * as vscode from 'vscode';
import { ExtensionState } from '../types/extension-state';

const DEFAULT_STATE: ExtensionState = {
  isWebviewActive: false,
  selectedModel: undefined,
  chatHistory: [],
};

export function getState(context: vscode.ExtensionContext): ExtensionState {
  return context.globalState.get<ExtensionState>('state', DEFAULT_STATE);
}

export function updateState(
  context: vscode.ExtensionContext,
  updates: Partial<ExtensionState>
): void {
  const currentState = getState(context);
  const newState = { ...currentState, ...updates };
  context.globalState.update('state', newState);
}

export function initializeState(context: vscode.ExtensionContext): void {
  const savedState = context.globalState.get<ExtensionState>('state');
  if (!savedState) {
    updateState(context, DEFAULT_STATE);
  }
}

export function updateSelectedModel(
  context: vscode.ExtensionContext,
  model: string
): void {
  updateState(context, { selectedModel: model });
}
