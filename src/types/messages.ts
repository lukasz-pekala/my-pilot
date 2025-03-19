import { WebviewCommand } from './commands';

export interface ChatMessage {
  command: WebviewCommand.Chat;
  text: string;
  modelName: string;
  bubbleId: string;
}

export interface ChatResponseMessage {
  command: WebviewCommand.ChatResponse;
  text: string;
  bubbleId: string;
  done?: boolean;
}

export interface ChangeModelMessage {
  command: WebviewCommand.ChangeModel;
  modelName: string;
}

export interface ErrorMessage {
  command: WebviewCommand.Error;
  text: string;
}

export type WebviewMessage =
  | ChatMessage
  | ChatResponseMessage
  | ChangeModelMessage
  | ErrorMessage;
