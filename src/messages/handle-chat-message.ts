import { OllamaClient } from './../services/ollama-client';
import * as vscode from 'vscode';
import { Message, ModelResponse } from 'ollama';
import { WebviewCommand } from '../types/commands';
import { ExtensionState } from '../types/extension-state';

/* 
  Handle an incoming chat message with streaming responses.
  This function manages conversation history, supports cancellation, 
  and sends separate notifications for completion.
*/
export async function handleChatMessage(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  message: { text: string; bubbleId: string },
  ollamaClient: OllamaClient
) {
  const selectedModel =
    context.globalState.get<ExtensionState['selectedModel']>('selectedModel');
  if (!selectedModel) {
    panel.webview.postMessage({
      command: WebviewCommand.Error,
      text: 'No model selected',
    });
    return;
  }

  // Retrieve conversation history from global state
  let conversationHistory: Message[] =
    context.globalState.get<Message[]>('conversationHistory') || [];

  // Limit conversation history to prevent unbounded growth
  const MAX_HISTORY_LENGTH = 20; // Adjust based on your needs
  if (conversationHistory.length >= MAX_HISTORY_LENGTH * 2) {
    // Keep pairs of messages
    // Keep only recent messages
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
  }

  // Add the new user message to history and update storage
  conversationHistory.push({ role: 'user', content: message.text });

  const cancellationTokenSource = new vscode.CancellationTokenSource();
  // Store it in the global state indexed by bubbleId for cancellation support
  const activeStreams: Record<string, vscode.CancellationTokenSource> =
    context.globalState.get<Record<string, vscode.CancellationTokenSource>>(
      'activeStreams'
    ) || {};
  activeStreams[message.bubbleId] = cancellationTokenSource;
  context.globalState.update('activeStreams', activeStreams);

  const responseStream = await ollamaClient.chat({
    model: selectedModel.name,
    messages: conversationHistory,
    stream: true,
  });

  let responseText = '';
  for await (const part of responseStream) {
    // Check if operation was cancelled
    if (cancellationTokenSource.token.isCancellationRequested) {
      break;
    }

    responseText += part.message.content;
    await postChatResponseToWebView(panel, responseText, message.bubbleId);
  }

  delete activeStreams[message.bubbleId];
  context.globalState.update('activeStreams', activeStreams);

  // Send final response text
  await postChatResponseToWebView(panel, responseText, message.bubbleId);

  await postResponseStreamCompletedToWebView(panel, message.bubbleId);
}

/*
  Message handler to process cancellation requests coming from the UI.
  When a cancellation request is received (e.g. via the command "cancelChat"),
  this function will cancel the active streaming response for the corresponding bubbleId.
*/
export function handleCancelRequest(
  context: vscode.ExtensionContext,
  bubbleId: string
) {
  const activeStreams: Record<string, vscode.CancellationTokenSource> =
    context.globalState.get<Record<string, vscode.CancellationTokenSource>>(
      'activeStreams'
    ) || {};

  const tokenSource = activeStreams[bubbleId];
  if (tokenSource) {
    tokenSource.cancel();
    delete activeStreams[bubbleId];
    context.globalState.update('activeStreams', activeStreams);
    // TODO: Optionally, you could also notify the UI about the cancellation here if needed.
  }
}

function postChatResponseToWebView(
  panel: vscode.WebviewPanel,
  text: string,
  bubbleId: string
) {
  return panel.webview.postMessage({
    command: WebviewCommand.ChatResponse,
    text,
    bubbleId,
  });
}

function postResponseStreamCompletedToWebView(
  panel: vscode.WebviewPanel,
  bubbleId: string
) {
  return panel.webview.postMessage({
    command: WebviewCommand.ChatResponseComplete,
    bubbleId,
  });
}
