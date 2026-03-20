import type { MessengerChannel } from "../../messenger/channels.ts";
import { isNativeMessengerChannel } from "../../messenger/channels.ts";
import { normalizeText } from "./normalize.ts";
import {
  sendDiscordMessage,
  sendDiscordTyping,
  sendGoogleChatMessage,
  sendIMessageMessage,
  sendSignalMessage,
  sendSignalTyping,
  sendSlackMessage,
  sendTelegramMessage,
  sendTelegramTyping,
  sendWhatsAppMessage,
} from "./channel-transports.ts";

export async function sendByChannel(channel: MessengerChannel, token: string, targetId: string, text: string): Promise<void> {
  if (!isNativeMessengerChannel(channel)) {
    throw new Error(`channel transport not implemented: ${channel}`);
  }
  const normalizedToken = normalizeText(token);
  if (!normalizedToken && channel !== "imessage") {
    throw new Error(`${channel} token missing`);
  }
  const normalizedTarget = normalizeText(targetId);
  if (!normalizedTarget) {
    throw new Error(`${channel} target missing`);
  }

  if (channel === "telegram") {
    await sendTelegramMessage(normalizedToken, normalizedTarget, text);
    return;
  }
  if (channel === "discord") {
    await sendDiscordMessage(normalizedToken, normalizedTarget, text);
    return;
  }
  if (channel === "slack") {
    await sendSlackMessage(normalizedToken, normalizedTarget, text);
    return;
  }
  if (channel === "whatsapp") {
    await sendWhatsAppMessage(normalizedToken, normalizedTarget, text);
    return;
  }
  if (channel === "googlechat") {
    await sendGoogleChatMessage(normalizedToken, normalizedTarget, text);
    return;
  }
  if (channel === "signal") {
    await sendSignalMessage(normalizedToken, normalizedTarget, text);
    return;
  }
  if (channel === "imessage") {
    await sendIMessageMessage(normalizedTarget, text);
    return;
  }
  throw new Error(`channel transport not implemented: ${channel}`);
}

export async function sendTypingByChannel(channel: MessengerChannel, token: string, targetId: string): Promise<void> {
  if (!isNativeMessengerChannel(channel)) {
    return;
  }
  if (!token) {
    throw new Error(`${channel} token missing`);
  }
  const normalizedTarget = normalizeText(targetId);
  if (!normalizedTarget) {
    throw new Error(`${channel} target missing`);
  }

  if (channel === "telegram") {
    await sendTelegramTyping(token, normalizedTarget);
    return;
  }
  if (channel === "discord") {
    await sendDiscordTyping(token, normalizedTarget);
    return;
  }
  if (channel === "signal") {
    await sendSignalTyping(token, normalizedTarget);
    return;
  }
  // Slack bot API has no native typing indicator endpoint.
}
