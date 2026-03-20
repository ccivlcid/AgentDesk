import type { MessengerChannel } from "../../messenger/channels.ts";

export type { MessengerChannel };

export type PersistedSession = {
  id?: string;
  name?: string;
  targetId?: string;
  enabled?: boolean;
  token?: string;
  agentId?: string;
};

export type PersistedChannelConfig = {
  token?: string;
  sessions?: PersistedSession[];
};

export type PersistedMessengerChannels = Partial<Record<MessengerChannel, PersistedChannelConfig>>;

export type MessengerSession = {
  id: string;
  name: string;
  targetId: string;
  enabled: boolean;
  token?: string;
  agentId?: string;
};

export type MessengerChannelConfig = {
  token: string;
  sessions: MessengerSession[];
};

export type MessengerRuntimeConfig = Record<MessengerChannel, MessengerChannelConfig>;

export type MessengerRuntimeSession = {
  sessionKey: string;
  channel: MessengerChannel;
  targetId: string;
  enabled: boolean;
  displayName: string;
};

export type DiscordDiscoverableChannel = {
  id: string;
  name: string;
  guildId: string;
  guildName: string;
  type: number;
};
