import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ListResponse } from 'ollama';

export function loadWebviewContent(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
  modelsList: ListResponse
): string {
  const templatePath = path.join(
    extensionUri.fsPath,
    'webviews',
    'template.html'
  );
  let content = fs.readFileSync(templatePath, 'utf8');

  const resources = getWebviewResources(extensionUri, webview);

  return content
    .replace(/{{webview-csp-source}}/g, webview.cspSource)
    .replace('{{styles-main}}', resources.styleMainUri.toString())
    .replace('{{scripts-main}}', resources.scriptMainUri.toString())
    .replace('{{model-options}}', mapListOfModels(modelsList));
}

interface WebviewResources {
  styleMainUri: vscode.Uri;
  scriptMainUri: vscode.Uri;
}

function getWebviewResources(
  extensionUri: vscode.Uri,
  webview: vscode.Webview
): WebviewResources {
  return {
    styleMainUri: webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'webviews', 'styles', 'main.css')
    ),
    scriptMainUri: webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'webviews', 'scripts', 'main.js')
    ),
  };
}

function mapListOfModels(modelsList: ListResponse): string {
  if (!modelsList || !modelsList.models || modelsList.models.length === 0) {
    return '<option value="">No models available</option>';
  }
  // ... rest of the function logic
}
  return modelsList.models
    .map(
      (model) =>
        `<option value="${model.model}">${model.name} [${formatSize(
          model.size
        )}]</option>`
    )
    .join('\n');
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
