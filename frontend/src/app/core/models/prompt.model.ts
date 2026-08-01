export interface Prompt {
  id?: number;
  title: string;
  positivePrompt: string;
  negativePrompt?: string;
  sampler?: string;
  steps: number;
  cfgScale: number;
  seed?: string;
  modelName?: string;
  category: string;
  /** Free-form labels, always lowercase — the server normalises them. */
  tags: string[];
  isNsfw?: boolean;
  createdAt?: Date;
  images: PromptImage[];
}

export interface PromptImage {
  id?: number;
  imageUrl: string;
  /** Gallery-sized copy. Null for images uploaded before thumbnails existed. */
  thumbnailUrl?: string | null;
  /** Intrinsic size of the original, used to reserve layout space. */
  width?: number | null;
  height?: number | null;
  promptId?: number;
}

export interface PaginatedResponse<T> {
  totalCount: number;
  prompts: T[];
}

export interface Suggestions {
  models: string[];
  samplers: string[];
  categories: string[];
  tags: string[];
}

export interface TagCount {
  name: string;
  count: number;
}
