export type StreamProvider = {
  id: string;
  label: string;
  description?: string;
};

export const STREAM_PROVIDERS = [
  {
    id: 'anikoto',
    label: 'Anikoto',
    description: 'Fast HD / Zero Ads',
  },
  {
    id: 'vidsrc',
    label: 'VidSrc Mirror',
    description: undefined,
  },
  {
    id: 'embedsu',
    label: 'EmbedSu Multi-Stream',
    description: undefined,
  },
  {
    id: '2embed',
    label: '2Embed Direct Engine',
    description: undefined,
  },
] as const satisfies readonly StreamProvider[];

export const STREAM_PROVIDER_IDS = STREAM_PROVIDERS.map(provider => provider.id);

export const DEFAULT_PREFERRED_STREAM_SERVER_IDS = STREAM_PROVIDER_IDS.slice(0, 3);
