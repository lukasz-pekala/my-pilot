import * as vscode from 'vscode';
import { Message, ModelResponse } from 'ollama';
import { WebviewCommand } from '../types/commands';
import { ChatMessage } from '../types/messages';
import { OllamaClient } from '../services/ollama-client';
import { ExtensionState } from '../types/extension-state';

export async function handleChatMessage(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  message: ChatMessage,
  ollamaClient: OllamaClient
): Promise<void> {
  try {
    const selectedModel =
      context.globalState.get<ExtensionState['selectedModel']>('selectedModel');

    if (!selectedModel) {
      await postChatResponseToWebView(
        panel,
        'No model selected. Please select a model to chat with.',
        message.bubbleId,
        true
      );
      return;
    }

    // Store conversation history in the context.globalState
    let conversationHistory =
      context.globalState.get<Message[]>('conversationHistory') || [];

    // Add the new message to history
    conversationHistory.push({ role: 'user', content: message.text });

    const responseStream = await ollamaClient.chat({
      model: selectedModel.name,
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
      true // todo: consider posting separate message for done
    );

    // Add the assistant's response to the conversation history
    conversationHistory.push({ role: 'assistant', content: responseText });
    // Update the global state with the updated conversation history
    context.globalState.update('conversationHistory', conversationHistory);
  } catch (error) {
    await postChatResponseToWebView(
      panel,
      `An error occurred while communicating with the model ${error}`,
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
