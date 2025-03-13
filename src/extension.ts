// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from "vscode";
import ollama, { ListResponse, ModelResponse } from 'ollama';
let modelsList: ListResponse;
let currentModel: ModelResponse;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  

  const disposable = vscode.commands.registerCommand(
    "mypilot.openmypilot", // Changed command name
    async () => {
      const panel = vscode.window.createWebviewPanel(
        "myPilot", // Identifies the type of the webview. Used internally
        "My Pilot",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      modelsList = await ollama.list();
      if (modelsList.models.length === 0) {
        vscode.window.showErrorMessage('No models found. Extension will not be activated. Please install at least one model using Ollama.');
        return;
      }

      currentModel = modelsList.models[0];

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case "chat":
            try {
              const responseStream = await ollama.chat({
                model: currentModel.name,
                messages: [{ role: 'user', content: message.text }],
                stream: true,
              });

              let responseText = '';
              for await (const part of responseStream) {
                responseText += part.message.content;
                panel.webview.postMessage({ command: 'chatResponse', text: responseText });
              }
            } catch (error) {
              console.error(error);
              panel.webview.postMessage({ command: 'chatResponse', text: 'An error occurred' });
            }
            break;
          case "changeModel":
            currentModel = modelsList.models.find(model => model.name === message.modelName) || currentModel;
            panel.webview.postMessage({ command: 'modelChanged', model: currentModel });
            break;
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
function getWebviewContent(): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>My Pilot</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons/dist/codicon.css" />
        <style>
            body {
                padding: 15px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-foreground);
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                line-height: 1.6;
            }
            h1 {
                color: var(--vscode-foreground);
                font-weight: normal;
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 5px;
            }
            h2 {
                color: var(--vscode-foreground);
                font-weight: normal;
                font-size: 1.1em;
            }
            #question {
                width: calc(100% - 20px);
                min-height: 100px;
                padding: 8px;
                margin-bottom: 10px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 2px;
                font-family: var(--vscode-editor-font-family);
                resize: vertical;
            }
            #question:focus {
                outline: 1px solid var(--vscode-focusBorder);
                border-color: var (--vscode-focusBorder);
            }
            #askBtn {
                padding: 8px 12px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 2px;
                cursor: pointer;
            }
            #askBtn:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            #answer {
                margin-top: 15px;
                padding: 10px;
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 2px;
                white-space: pre-wrap;
                font-family: var(--vscode-editor-font-family);
            }
            ::-webkit-scrollbar {
                width: 10px;
            }
            ::-webkit-scrollbar-track {
                background: var(--vscode-scrollbarSlider-background);
            }
            ::-webkit-scrollbar-thumb {
                background: var(--vscode-scrollbarSlider-hoverBackground);
            }
            
            .model-info {
                margin: 10px 0;
                padding: 8px;
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 2px;
                opacity: 0.8;
            }
            
            .model-info h3 {
                margin: 0 0 5px 0;
                color: var(--vscode-descriptionForeground);
                font-weight: normal;
                font-size: 0.9em;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .model-info p {
                margin: 4px 0;
                font-size: 0.85em;
                color: var(--vscode-descriptionForeground);
            }
            
            .model-tag {
                color: var(--vscode-descriptionForeground);
                font-size: 0.85em;
                margin-right: 8px;
            }
            
            .codicon {
                font-family: codicon;
                cursor: default;
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
            }

            #modelSelect {
                width: 100%;
                padding: 8px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 2px;
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-font-size);
                margin-bottom: 10px;
            }
            #modelSelect:focus {
                outline: 1px solid var(--vscode-focusBorder);
                border-color: var(--vscode-focusBorder);
            }
        </style>
    </head>
    <body>
        <h1>My Pilot</h1>
        
        <div class="model-info">
            <h3>
                <i class="codicon codicon-symbol-class"></i>
                Current Model: <span id="currentModelName">${currentModel.name}</span>
            </h3>
        </div>

        <h2>Change Model</h2>
        <select id="modelSelect">
          ${modelsList.models.map(model => `<option value="${model.name}">${model.name}</option>`).join('')}
        </select>

        <h2>Ask AI about something</h2>
        <textarea id="question" placeholder="Type your question here..."></textarea>
        <button id="askBtn">Ask AI</button>
        <div id="answer"></div>
        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('modelSelect').addEventListener('change', () => {
                const modelName = document.getElementById('modelSelect').value;
                vscode.postMessage({ command: 'changeModel', modelName });
            });

            document.getElementById('askBtn').addEventListener('click', () => {
                const text = document.getElementById('question').value;
                if (!text) {
                    return;
                }

                const askButton = document.getElementById('askBtn');
                askButton.disabled = true;
                askButton.textContent = 'Processing...';

                const message = {
                    command: 'chat',
                    text,
                };
                vscode.postMessage(message);
            });

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'chatResponse':
                        document.getElementById('answer').innerText = message.text;
                        document.getElementById('askBtn').disabled = false;
                        document.getElementById('askBtn').textContent = 'Ask AI';
                        break;
                    case 'modelChanged':
                        document.getElementById('currentModelName').innerText = message.model.name;
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}
