// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from "vscode";
import { ListResponse, ModelResponse } from "ollama";
import { OllamaClient, DefaultOllamaClient } from "./services/ollama-client";
import { WebviewCommand } from "./types/commands";
import {
  WebviewMessage,
  ChatMessage,
  ChangeModelMessage,
} from "./types/messages";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const ollamaClient = new DefaultOllamaClient();

  const disposable = vscode.commands.registerCommand(
    "mypilot.openmypilot",
    async () => {
      try {
        // Show progress during initialization
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Initializing My Pilot...",
          cancellable: false,
        }, async () => {
          const panel = createWebviewPanel();
          const initialized = await initializeModels(panel, context, ollamaClient);
          if (initialized) {
            setupMessageHandlers(panel, context, ollamaClient);
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to initialize My Pilot: ${error}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function createWebviewPanel(): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    "myPilot",
    "My Pilot",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [],
      // Add security policy
      retainContextWhenHidden: true,
    }
  );

  // Enable vscode API in webview
  panel.webview.options = {
    enableScripts: true,
    enableCommandUris: true,
  };

  return panel;
}

async function initializeModels(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  ollamaClient: OllamaClient
): Promise<boolean> {
  try {
    const modelsList = await ollamaClient.list();
    if (modelsList.models.length === 0) {
      vscode.window.showErrorMessage(
        "No models found. Extension will not be activated. Please install at least one model using Ollama."
      );
      return false;
    }

    context.globalState.update("modelsList", modelsList);
    context.globalState.update("currentModel", modelsList.models[0]);

    panel.webview.html = getWebviewContent(modelsList, modelsList.models[0]);
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to initialize models: ${error}`);
    return false;
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(
  modelsList: ListResponse,
  currentModel: ModelResponse
): string {
  return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>My Pilot</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons/dist/codicon.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css">
        <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        
        <style>
            body {
                margin: 0;
                padding: 0;
                height: 100vh;
                display: flex;
                flex-direction: column;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-foreground);
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
            }

            .chat-container {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            .chat-bubble {
                display: flex;
                margin-bottom: 20px;
                gap: 12px;
            }

            .avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .message-content {
                flex: 1;
            }

            .message-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }

            .username {
                font-weight: 500;
                color: var(--vscode-foreground);
            }

            .message-bubble {
                background: var(--vscode-input-background);
                border-radius: 8px;
                padding: 8px;
                position: relative;
            }

            .input-container {
                position: sticky;
                bottom: 0;
                padding: 15px;
                background: var(--vscode-editor-background);
                border-top: 1px solid var(--vscode-panel-border);
            }

            .input-wrapper {
                display: flex;
                gap: 10px;
            }

            #question {
                flex: 1;
                min-height: 44px;
                max-height: 200px;
                padding: 12px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 6px;
                font-family: var(--vscode-editor-font-family);
                resize: none;
                overflow-y: auto;
            }

            .message-bubble pre {
                position: relative;
                background-color: var(--vscode-textCodeBlock-background);
                padding: 16px;
                border-radius: 6px;
                overflow-x: auto;
            }

            .copy-button {
                position: absolute;
                top: 8px;
                right: 8px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .message-bubble pre:hover .copy-button {
                opacity: 1;
            }

            .copy-button:hover {
                background: var(--vscode-button-hoverBackground);
            }

            #askBtn {
                padding: 8px 16px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            #askBtn:hover {
                background-color: var(--vscode-button-hoverBackground);
            }

            #askBtn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .model-selector {
                margin: 15px;
                padding: 8px 12px;
                background-color: var(--vscode-dropdown-background);
                color: var(--vscode-dropdown-foreground);
                border: 1px solid var(--vscode-dropdown-border);
                border-radius: 4px;
                width: calc(100% - 30px);
                cursor: pointer;
            }

            .model-selector:focus {
                outline: 1px solid var(--vscode-focusBorder);
                outline-offset: -1px;
            }

            .model-selector:hover {
                background-color: var(--vscode-dropdown-listBackground);
            }
        </style>
    </head>
    <body>
        <select id="modelSelector" class="model-selector">
            ${modelsList.models
              .map(
                (model) => `
                <option value="${model.name}" ${
                  model.name === currentModel.name ? "selected" : ""
                }>
                    ${model.name} [${formatSize(model.size)}]
                </option>
            `
              )
              .join("")}
        </select>
        <div class="chat-container" id="chatContainer"></div>
        
        <div class="input-container">
            <form id="chatForm" class="input-wrapper">
                <textarea id="question" placeholder="Type your message..." rows="1"></textarea>
                <button type="submit" id="askBtn">Send</button>
            </form>
        </div>

        <script>
            // Acquire vscode API
            const vscode = acquireVsCodeApi();

            const WebviewCommand = {
                Chat: 'chat',
                ChatResponse: 'chatResponse',
                ChangeModel: 'changeModel',
                Error: 'error',
                ModelChanged: 'modelChanged'
            };

            const form = document.getElementById('chatForm');
            const textarea = document.getElementById('question');
            const askButton = document.getElementById('askBtn');
            const modelSelector = document.getElementById('modelSelector');

            // Disable button initially
            askButton.disabled = true;

            // Update button state based on textarea content
            function updateButtonState() {
                askButton.disabled = textarea.value.trim().length === 0 || isSubmitting;
            }

            // Add input listener for textarea
            textarea.addEventListener('input', updateButtonState);

            // Auto-resize textarea
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });

            // Handle Enter key (submit on Enter, new line on Shift+Enter)
            textarea.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    form.requestSubmit();
                }
            });

            // Add submission tracking
            let isSubmitting = false;

            // Update form submit handler
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Prevent concurrent submissions
                if (isSubmitting) {
                    return;
                }

                const text = textarea.value.trim();
                if (!text) return;

                // Set submission state
                isSubmitting = true;
                updateButtonState();
                
                // Create user's message bubble
                createChatBubble(text, true);
                
                // Create thinking bubble
                const thinkingBubbleId = createThinkingBubble(modelSelector.value);
                const modelName = modelSelector.value;
                
                // Disable button and show processing state
                askButton.disabled = isSubmitting;
                askButton.innerHTML = '<i class="codicon codicon-loading codicon-modifier-spin"></i>';
                
                // Clear and reset textarea
                textarea.value = '';
                textarea.style.height = 'auto';
                
                const message = {
                    command: WebviewCommand.Chat,
                    text,
                    modelName,
                    bubbleId: thinkingBubbleId
                };
                vscode.postMessage(message);
            });

            function createThinkingBubble(modelName) {
                const bubbleId = 'thinking-' + Date.now();
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble';
                bubble.id = bubbleId;
            
                const avatar = document.createElement('div');
                avatar.className = 'avatar codicon codicon-symbol-misc';
            
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
            
                const header = document.createElement('div');
                header.className = 'message-header';

                const usernameSpan = document.createElement('span');
                usernameSpan.className = 'username';
                usernameSpan.textContent = modelName;
                header.appendChild(usernameSpan);
            
                const messageBubble = document.createElement('div');
                messageBubble.className = 'message-bubble';
                messageBubble.innerHTML = '<i class="codicon codicon-loading codicon-modifier-spin"></i> Thinking...';
            
                messageContent.appendChild(header);
                messageContent.appendChild(messageBubble);
                bubble.appendChild(avatar);
                bubble.appendChild(messageContent);
            
                document.getElementById('chatContainer').appendChild(bubble);
                bubble.scrollIntoView({ behavior: 'smooth' });
                return bubbleId;
            }

            function createChatBubble(content, isUser, modelName) {
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble';
            
                const avatar = document.createElement('div');
                avatar.className = 'avatar codicon';
                // Use VS Code's built-in Codicons
                if (isUser) {
                    avatar.className += ' codicon-account';
                } else {
                    avatar.className += ' codicon-symbol-misc';
                }
            
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
            
                const header = document.createElement('div');
                header.className = 'message-header';

                const usernameSpan = document.createElement('span');
                usernameSpan.className = 'username';
                usernameSpan.textContent = isUser ? 'User' : modelName;

                header.appendChild(usernameSpan);
            
                const messageBubble = document.createElement('div');
                messageBubble.className = 'message-bubble';
                messageBubble.innerHTML = marked.parse(content);
            
                // Add copy buttons to code blocks with codicon
                messageBubble.querySelectorAll('pre').forEach(pre => {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-button';
                    copyBtn.innerHTML = '<i class="codicon codicon-copy"></i>';
                    copyBtn.onclick = () => {
                        const code = pre.querySelector('code').textContent;
                        handleCodeCopy(code, copyBtn);
                    };
                    pre.appendChild(copyBtn);
                });
            
                messageContent.appendChild(header);
                messageContent.appendChild(messageBubble);
                bubble.appendChild(avatar);
                bubble.appendChild(messageContent);
            
                document.getElementById('chatContainer').appendChild(bubble);
                bubble.scrollIntoView({ behavior: 'smooth' });
            }

            function handleCodeCopy(code, button) {
                return navigator.clipboard.writeText(code)
                    .then(() => {
                        button.innerHTML = '<i class="codicon codicon-check"></i>';
                        setTimeout(() => {
                            button.innerHTML = '<i class="codicon codicon-copy"></i>';
                        }, 2000);
                    });
            }

            function addCopyButtonsToCodeBlocks(container) {
                container.querySelectorAll('pre').forEach(pre => {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-button';
                    copyBtn.innerHTML = '<i class="codicon codicon-copy"></i>';
                    copyBtn.onclick = () => {
                        const code = pre.querySelector('code').textContent;
                        handleCodeCopy(code, copyBtn);
                    };
                    pre.appendChild(copyBtn);
                });
            }

            function updateMessageBubble(bubble, text) {
                bubble.innerHTML = marked.parse(text);
                addCopyButtonsToCodeBlocks(bubble);
                bubble.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightElement(block);
                });
            }

            modelSelector.addEventListener('change', (e) => {
                const modelName = e.target.value;
                vscode.postMessage({ 
                    command: WebviewCommand.ChangeModel, 
                    modelName 
                });
            });

            // Configure marked options
            marked.setOptions({
                highlight: function(code, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true,
                gfm: true
            });

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case WebviewCommand.ChatResponse:
                        const thinkingBubble = document.getElementById(message.bubbleId);
                        if (!thinkingBubble) return; // Early return if element not found

                        const messageBubble = thinkingBubble.querySelector('.message-bubble');
                        if (!messageBubble) return; // Early return if element not found

                        updateMessageBubble(messageBubble, message.text);

                        if (message.done) {
                            // Reset submission state
                            isSubmitting = false;
                            askButton.disabled = false;
                            askButton.innerHTML = '<i class="codicon codicon-send"></i>';

                            textarea.focus();
                        }
                        break;
                    
                    case WebviewCommand.Error:
                        console.error(message.text);
                        // Reset submission state on error
                        isSubmitting = false;
                        askButton.disabled = false;
                        askButton.innerHTML = '<i class "codicon codicon-send"></i>';
                        break;
                }
            });
      </script>
    </body>
    </html>`;
}

// Add helper function to format size
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

function setupMessageHandlers(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  ollamaClient: OllamaClient
): void {
  // Track disposables
  const disposables: vscode.Disposable[] = [];

  // Add panel disposal handler
  panel.onDidDispose(() => {
    disposables.forEach(d => d?.dispose());
  }, null, disposables);

  // Add message handler
  disposables.push(
    panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.command) {
        case WebviewCommand.Chat:
          await handleChatMessage(panel, context, message, ollamaClient);
          break;
        case WebviewCommand.ChangeModel:
          handleModelChange(panel, context, message);
          break;
      }
    })
  );
}

function sendChatResponse(
  panel: vscode.WebviewPanel,
  text: string,
  bubbleId: string,
  done: boolean
) {
  return panel.webview.postMessage({
    command: WebviewCommand.ChatResponse,
    text,
    bubbleId,
    done,
  });
}

async function handleChatMessage(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  message: ChatMessage,
  ollamaClient: OllamaClient
): Promise<void> {
  try {
    const currentModel = context.globalState.get(
      "currentModel"
    ) as ModelResponse;

    const responseStream = await ollamaClient.chat({
      model: currentModel.name,
      messages: [{ role: "user", content: message.text }],
      stream: true,
    });

    let responseText = "";
    for await (const part of responseStream) {
      responseText += part.message.content;
      await sendChatResponse(panel, responseText, message.bubbleId, false);
    }

    await sendChatResponse(panel, responseText, message.bubbleId, true);
  } catch (error) {
    await sendChatResponse(
      panel,
      "An error occurred while communicating with the model",
      message.bubbleId,
      true
    );
  }
}

function handleModelChange(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  message: ChangeModelMessage
): void {
  const modelsList = context.globalState.get("modelsList") as ListResponse;
  const newModel = modelsList.models.find(
    (model) => model.name === message.modelName
  );

  if (!newModel) {
    panel.webview.postMessage({
      command: WebviewCommand.Error,
      text: "Model not found",
    });
    return;
  }

  context.globalState.update("currentModel", newModel);
  panel.webview.postMessage({
    command: WebviewCommand.ModelChanged,
    model: newModel,
  });
}
