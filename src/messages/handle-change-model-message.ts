import * as vscode from 'vscode';
import { ChangeModelMessage } from '../types/messages';
import { ListResponse } from 'ollama';
import { WebviewCommand } from '../types/commands';
import { updateSelectedModel } from '../utils/state-manager';

export function handleChangeModelMessage(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  message: ChangeModelMessage
): void {
  const modelsList = context.globalState.get('modelsList') as ListResponse;
  const selectedModel = modelsList.models.find(
    (model) => model.name === message.modelName
  );

  if (selectedModel) {
    updateSelectedModel(context, selectedModel.name);
  } else {
    panel.webview.postMessage({
      command: WebviewCommand.Error,
      text: 'Model not found',
    });
  }
}
