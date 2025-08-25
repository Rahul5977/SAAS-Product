import type { Channel, User, StreamChat } from "stream-chat";

export interface AIAgents {
  user?: User;
  channel?: Channel;
  chatClient?: StreamChat;
  getLastInteractions?: () => number;
  init: () => Promise<void>;
  dispose: () => Promise<void>;
}
export enum AgentPlatform {
  OPENAI = "openai",
  WRITING_ASSISTANT = "writing-assistant",
}

export interface WritingMessages {
  custom?: {
    suggestions?: string[];
    writing_task?: string;
    message_type?: "user" | "assistant" | "system_message";
  };
}
