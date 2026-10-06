interface ContentBlock {
    id: string;
    type: 'text' | 'image' | 'video';
    content: string;
    alt?: string;
    caption?: string;
}

interface ArticleSlim {
    id: number;
    /** URL segment. Optional until every API in use has migration 1765000013000. */
    slug?: string;
    title: string;
    sub_heading: string;
    image_url?: string;
    tags?: string[];
    /** Computed by the API (~230 wpm). */
    read_minutes?: number;
    hidden: boolean;
    submitted_at: Date;
    updated_at?: Date;
}

interface ArticleFull extends ArticleSlim {
    body: string;
    content_blocks?: ContentBlock[];
}

interface ArticleCreateDto {
    title: string;
    /** Omit on update to keep the current slug; omit on create to generate one from the title. */
    slug?: string;
    tags?: string[];
    sub_heading: string;
    image_url?: string;
    body: string;
    content_blocks?: ContentBlock[];
    hidden: boolean;
}

export type {
    ContentBlock,
    ArticleSlim,
    ArticleFull,
    ArticleCreateDto,
}
