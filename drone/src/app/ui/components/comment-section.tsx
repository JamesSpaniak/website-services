'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/lib/auth-context';
import {
    getArticleComments,
    createComment,
    updateComment,
    deleteComment,
    toggleCommentUpvote,
} from '@/app/lib/api-client';
import type { CommentData } from '@/app/lib/types/comment';
import Link from 'next/link';

export default function CommentSection({ articleId }: { articleId: number }) {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [rootBody, setRootBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await getArticleComments(articleId);
            setComments(data);
        } catch {
            /* empty — show empty state */
        } finally {
            setLoading(false);
        }
    }, [articleId]);

    useEffect(() => { load(); }, [load]);

    const handleRootSubmit = async () => {
        if (!rootBody.trim() || submitting) return;
        setSubmitting(true);
        try {
            await createComment(articleId, rootBody.trim());
            setRootBody('');
            await load();
        } catch { /* handled by UI */ }
        finally { setSubmitting(false); }
    };

    const totalCount = countComments(comments);

    return (
        <section className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
                {totalCount > 0 ? `Comments (${totalCount})` : 'Comments'}
            </h3>

            {user ? (
                <div className="mb-8">
                    <textarea
                        value={rootBody}
                        onChange={(e) => setRootBody(e.target.value)}
                        placeholder="Share your thoughts..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <div className="mt-2 flex justify-end">
                        <button
                            onClick={handleRootSubmit}
                            disabled={submitting || !rootBody.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">
                        <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link> to join the conversation.
                    </p>
                </div>
            )}

            {loading ? (
                <p className="text-sm text-gray-500">Loading comments...</p>
            ) : comments.length === 0 ? (
                <p className="text-sm text-gray-500">No comments yet. Be the first to share your thoughts!</p>
            ) : (
                <div className="space-y-6">
                    {comments.map((c) => (
                        <CommentThread
                            key={c.id}
                            comment={c}
                            articleId={articleId}
                            currentUserId={user?.id}
                            isAdmin={user?.role === 'admin'}
                            onRefresh={load}
                            depth={0}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function countComments(comments: CommentData[]): number {
    let count = 0;
    for (const c of comments) {
        count += 1 + countComments(c.replies);
    }
    return count;
}

const MAX_REPLY_DEPTH = 4;

function CommentThread({
    comment,
    articleId,
    currentUserId,
    isAdmin,
    onRefresh,
    depth,
}: {
    comment: CommentData;
    articleId: number;
    currentUserId?: number;
    isAdmin?: boolean;
    onRefresh: () => void;
    depth: number;
}) {
    const [replying, setReplying] = useState(false);
    const [editing, setEditing] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [editBody, setEditBody] = useState(comment.body);
    const [submitting, setSubmitting] = useState(false);
    const [localUpvoteCount, setLocalUpvoteCount] = useState(comment.upvote_count);
    const [localHasUpvoted, setLocalHasUpvoted] = useState(comment.has_upvoted);

    const isOwner = currentUserId === comment.author.id;
    const canModify = isOwner || isAdmin;
    const authorName = comment.author.first_name || comment.author.last_name
        ? `${comment.author.first_name || ''} ${comment.author.last_name || ''}`.trim()
        : comment.author.username;

    const handleReply = async () => {
        if (!replyBody.trim() || submitting) return;
        setSubmitting(true);
        try {
            await createComment(articleId, replyBody.trim(), comment.id);
            setReplyBody('');
            setReplying(false);
            onRefresh();
        } catch { /* handled */ }
        finally { setSubmitting(false); }
    };

    const handleEdit = async () => {
        if (!editBody.trim() || submitting) return;
        setSubmitting(true);
        try {
            await updateComment(comment.id, editBody.trim());
            setEditing(false);
            onRefresh();
        } catch { /* handled */ }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this comment? Replies will also be removed.')) return;
        try {
            await deleteComment(comment.id);
            onRefresh();
        } catch { /* handled */ }
    };

    const handleUpvote = async () => {
        if (!currentUserId) return;
        const prev = { count: localUpvoteCount, voted: localHasUpvoted };
        setLocalHasUpvoted(!localHasUpvoted);
        setLocalUpvoteCount(localHasUpvoted ? localUpvoteCount - 1 : localUpvoteCount + 1);
        try {
            const result = await toggleCommentUpvote(comment.id);
            setLocalUpvoteCount(result.upvote_count);
            setLocalHasUpvoted(result.has_upvoted);
        } catch {
            setLocalUpvoteCount(prev.count);
            setLocalHasUpvoted(prev.voted);
        }
    };

    return (
        <div className={depth > 0 ? 'ml-6 pl-4 border-l-2 border-gray-100' : ''}>
            <div className="group">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                        {comment.author.picture_url ? (
                            <img src={comment.author.picture_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            authorName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{authorName}</span>
                            <span className="text-xs text-gray-400">
                                {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            {comment.created_at !== comment.updated_at && (
                                <span className="text-xs text-gray-400">(edited)</span>
                            )}
                        </div>

                        {editing ? (
                            <div className="mt-2">
                                <textarea
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                                <div className="mt-1 flex gap-2">
                                    <button
                                        onClick={handleEdit}
                                        disabled={submitting || !editBody.trim()}
                                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => { setEditing(false); setEditBody(comment.body); }}
                                        className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                        )}

                        <div className="mt-2 flex items-center gap-4">
                            <button
                                onClick={handleUpvote}
                                disabled={!currentUserId}
                                className={`flex items-center gap-1 text-xs transition-colors ${
                                    localHasUpvoted
                                        ? 'text-blue-600 font-semibold'
                                        : 'text-gray-400 hover:text-blue-500'
                                } ${!currentUserId ? 'cursor-default' : 'cursor-pointer'}`}
                                title={currentUserId ? (localHasUpvoted ? 'Remove upvote' : 'Upvote') : 'Sign in to upvote'}
                            >
                                <svg className="w-3.5 h-3.5" fill={localHasUpvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                                {localUpvoteCount > 0 && <span>{localUpvoteCount}</span>}
                            </button>

                            {currentUserId && depth < MAX_REPLY_DEPTH && (
                                <button
                                    onClick={() => setReplying(!replying)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                    Reply
                                </button>
                            )}

                            {canModify && !editing && (
                                <>
                                    <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600">
                                        Edit
                                    </button>
                                    <button onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500">
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {replying && (
                    <div className="ml-11 mt-3">
                        <textarea
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            placeholder={`Reply to ${authorName}...`}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            autoFocus
                        />
                        <div className="mt-1 flex gap-2">
                            <button
                                onClick={handleReply}
                                disabled={submitting || !replyBody.trim()}
                                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? 'Posting...' : 'Reply'}
                            </button>
                            <button
                                onClick={() => { setReplying(false); setReplyBody(''); }}
                                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                    {comment.replies.map((reply) => (
                        <CommentThread
                            key={reply.id}
                            comment={reply}
                            articleId={articleId}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            onRefresh={onRefresh}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
