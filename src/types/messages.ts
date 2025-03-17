import { ModelResponse } from 'ollama';

export interface ChatMessage {
    command: 'chat';
    text: string;
    modelName: string;
    bubbleId: string;
}

export interface ChatResponseMessage {
    command: 'chatResponse';
    text: string;
    bubbleId: string;
    done?: boolean;
}

export interface ChangeModelMessage {
    command: 'changeModel';
    modelName: string;
}

export interface ModelChangedMessage {
    command: 'modelChanged';
    model: ModelResponse;
}

export interface ErrorMessage {
    command: 'error';
    text: string;
}

export type WebviewMessage = 
    | ChatMessage 
    | ChatResponseMessage 
    | ChangeModelMessage 
    | ModelChangedMessage 
    | ErrorMessage;