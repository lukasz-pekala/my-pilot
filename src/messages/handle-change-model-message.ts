import * as vscode from 'vscode';
import { ChangeModelMessage } from '../types/messages';
import { ListResponse } from 'ollama';
import { WebviewCommand } from '../types/commands';

export function handleChangeModelMessage(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  message: ChangeModelMessage
): void {
  const modelsList = context.globalState.get('modelsList') as ListResponse;
  const newModel = modelsList.models.find(
    (model) => model.name === message.modelName
  );

  if (!newModel) {
    panel.webview.postMessage({
      command: WebviewCommand.Error,
      text: 'Model not found',
    });
    return;
  }

  context.globalState.update('currentModel', newModel);
  panel.webview.postMessage({
    command: WebviewCommand.ChangeModel,
    model: newModel,
  });
}
