import OpenAI from "openai";
import type { AssistantStream } from "openai/lib/AssistantStream";
import type {
  Channel,
  Message,
  Event,
  StreamChat,
  MessageResponse,
} from "stream-chat";

export class OpenAIResponseHandler {
  private message_text = "";
  private chunk_couter = 0;
  private runId = "";
  private is_done = false;
  private last_update_time = 0;
  constructor(
    private readonly openai: OpenAI,
    private readonly openAiThread: OpenAI.Beta.Threads.Thread,
    private readonly assistantStream: AssistantStream,
    private readonly chatClient: StreamChat,
    private readonly channel: Channel,
    private readonly message: MessageResponse,
    private readonly onDisposal: () => void
  ) {
    this.chatClient.on("ai_indicator.stop", this.handleStopGeneration);
  }
  run = async () => {};
  dispose = async () => {
    if (this.is_done) return;
    this.is_done = true;
    this.chatClient.off("ai_indicator.stop", this.handleStopGeneration);
    this.onDisposal();
  };
  private handleStopGeneration = async (event: Event) => {
    if (this.is_done || event.message_id !== this.message.id) return;
    console.log("Stopping generation for message:", this.message.id);
    if (
      !this.openai ||
      !this.openAiThread ||
      !this.runId ||
      !this.assistantStream
    ) {
      console.error("OpenAI client, thread, or stream is not initialized.");
      return;
    }
    try {
      await this.openai.beta.threads.runs.cancel(this.runId, {
        thread_id: this.openAiThread.id,
      });
    } catch (error) {
      console.error("Error stopping generation:", error);
      return;
    }
    await this.channel.sendEvent({
      type: "ai_indicator.clear",
      ai_state: "AI_STATE_STOPPED",
      cid: this.channel.cid,
      message_id: this.message.id,
    });
    await this.chatClient.partialUpdateMessage(this.message.id, {
      set: {
        text: this.message_text + "\n\n**Generation stopped by user.**",
      },
    });
    await this.dispose();
  };
  private handleStreamEvent = async (event: Event) => {};
  private handleStreamError = async (error: Error) => {
    if (this.is_done) return;
    await this.channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_ERROR",
      cid: this.channel.cid,
      message_id: this.message.id,
      error: error.message,
    });
    await this.chatClient.partialUpdateMessage(this.message.id, {
      set: {
        text: this.message_text + "\n\n**Error:** " + error.message,
      },
    });
    await this.dispose();
  };
  private performWebSearchResults = async (query: string): Promise<string> => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return JSON.stringify({ error: "Tavily API key is not configured." });
    }
    console.log("Performing web search for query:", query);
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: "advanced",
          max_results: 3,
          include_answers: true,
          safe_search: true,
          include_raw_content: false,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Tavily API error:", errorText);
        return JSON.stringify({
          error: "Error from Tavily API.",
          status: response.status,
          detail: errorText,
        });
      }
      const data = await response.json();
      console.log(`Web search results for query "${query}":`, data);
      return JSON.stringify(data);
    } catch (error) {
      console.error(`Error performing web search for query "${query}":`, error);
      return JSON.stringify({ error: "Error performing web search." });
    }
  };
}
