export interface CommentAuthor {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
}

export interface CommentData {
    id: number;
    body: string;
    author: CommentAuthor;
    parent_id: number | null;
    upvote_count: number;
    has_upvoted: boolean;
    created_at: string;
    updated_at: string;
    replies: CommentData[];
}
