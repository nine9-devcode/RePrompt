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
    isNsfw?: boolean;
    createdAt?: Date;
    images: PromptImage[];
}

export interface PromptImage {
    id?: number;
    imageUrl: string;
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
}
