interface ContentBlock {
    id: string;
    type: 'text' | 'image' | 'video';
    content: string;
    alt?: string;
    caption?: string;
}

interface ArticleSlim {
    id: number;
    title: string;
    sub_heading: string;
    image_url?: string;
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
