import * as vscode from 'vscode';
import { ModelResponse } from 'ollama';
import { WebviewCommand } from '../types/commands';
import { ChatMessage } from '../types/messages';
import { OllamaClient } from '../services/ollama-client';

export async function handleChatMessage(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  message: ChatMessage,
  ollamaClient: OllamaClient
): Promise<void> {
  try {
    const currentModel = context.globalState.get(
      'currentModel'
    ) as ModelResponse;

    // Store conversation history in the context.globalState
    let conversationHistory = context.globalState.get('conversationHistory') || [];
    
    // Add the new message to history
    conversationHistory.push({ role: 'user', content: message.text });
    
    const responseStream = await ollamaClient.chat({
      model: currentModel.name,
      messages: conversationHistory,
      stream: true,
    });

    let responseText = '';
    for await (const part of responseStream) {
      responseText += part.message.content;
      await postChatResponseToWebView(
        panel,
        responseText,
        message.bubbleId,
        false
      );
    }

    await postChatResponseToWebView(
      panel,
      responseText,
      message.bubbleId,
      true
    );
  } catch (error) {
    await postChatResponseToWebView(
      panel,
      'An error occurred while communicating with the model',
      message.bubbleId,
      true
    );
  }
}

function postChatResponseToWebView(
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
