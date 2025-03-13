// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from "vscode";
import ollama from 'ollama';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "My Pilot" is now active!');

  const disposable = vscode.commands.registerCommand(
    "mypilot.helloWorld",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "myPilot", // Identifies the type of the webview. Used internally
        "My Pilot",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case "chat":
            try {
              const responseStream = await ollama.chat({
                model: 'deepseek-r1:1.5b',
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
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                padding: 0;
                background-color: #f4f4f4;
            }
            h1 {
                color: #333;
            }
            h2 {
                color: #666;
            }
            #question {
                width: calc(100% - 22px);
                padding: 10px;
                margin-bottom: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            #askBtn {
                padding: 10px 20px;
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            #askBtn:hover {
                background-color: #005f99;
            }
            #answer {
                margin-top: 20px;
                padding: 10px;
                background-color: #fff;
                border: 1px solid #ccc;
                border-radius: 4px; /* Fixed missing semicolon */
            }
        </style>
    </head>
    <body>
        <h1>My Pilot</h1>
        <h2>Ask AI about something</h2>
        <input id="question" type="text" />
        <button id="askBtn">Ask</button>
        <div id="answer"></div>
        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('askBtn').addEventListener('click', () => {
                const text = document.getElementById('question').value;
                if (!text) {
                    return;
                }

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
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}
