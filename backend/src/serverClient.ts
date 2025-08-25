import { StreamChat } from "stream-chat";

export const apiKey = process.env.STREAM_API_KEY as string;
export const apiSecret = process.env.STREAM_API_SECRET as string;

if (!apiKey || !apiSecret) {
  throw new Error("STREAM_API_KEY or STREAM_API_SECRET is not defined");
}
export const client = new StreamChat(apiKey, apiSecret);
