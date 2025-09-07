// Based on backend DTOs
interface ArticleSlim {
    id: number;
    title: string;
    sub_title: string;
    image_url?: string;
    submitted_at: Date;
}

interface ArticleFull extends ArticleSlim {
    body: string;
}

export type {
    ArticleSlim,
    ArticleFull
}
