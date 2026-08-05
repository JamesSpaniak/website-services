'use client';

import { useCallback, useEffect, useState } from 'react';
import { useManagerOrg } from '../shell';
import { getInviteCodes, generateInviteCode } from '@/app/lib/api-client';
import type { InviteCode } from '@/app/lib/types/organization';
import { ORG_ROLE_TONE } from '@/app/lib/status-tones';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid';

export default function ManagerInvitesPage() {
    const { org } = useManagerOrg();
    const orgId = org.id;

    const [invites, setInvites] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'manager' | 'member'>('member');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getInviteCodes(orgId);
            setInvites(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invite codes');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const newCode = await generateInviteCode(orgId, {
                email: email.trim() || undefined,
                role,
            });
            setInvites((prev) => [newCode, ...prev]);
            setEmail('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate invite code');
        } finally {
            setGenerating(false);
        }
    };

    const copyCode = (code: string, id: number) => {
        const frontendUrl = typeof window !== 'undefined' ? window.location.origin : '';
        navigator.clipboard.writeText(`${frontendUrl}/register?code=${code}`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) return <LoadingComponent />;

    return (
        <div>
            {error && <ErrorComponent message={error} />}

            <div className="bg-[var(--surface)] rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-[var(--brand-foreground)] mb-4">Generate Invite Code</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        placeholder="Email (optional - sends invite automatically)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 px-3 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                    />
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'manager' | 'member')}
                        className="px-3 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                    >
                        <option value="member">Student</option>
                        <option value="manager">Manager</option>
                    </select>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" />
                        {generating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--surface-border)]">
                    <thead className="bg-[var(--comment-secondary-bg)]">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Code</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Role</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Email</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Status</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Expires</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase">Copy</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-border)]">
                        {invites.map((invite) => {
                            const isExpired = new Date(invite.expires_at) < new Date();
                            return (
                                <tr key={invite.id} className={`hover:bg-[var(--comment-secondary-bg)] ${invite.used || isExpired ? 'opacity-60' : ''}`}>
                                    <td className="px-4 sm:px-6 py-4 text-sm font-mono font-medium text-[var(--brand-foreground)]">{invite.code}</td>
                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                            ORG_ROLE_TONE[invite.role] ?? ORG_ROLE_TONE.member
                                        }`}>
                                            {invite.role === 'manager' ? 'Manager' : 'Student'}
                                        </span>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">{invite.email || '—'}</td>
                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                        {invite.used ? (
                                            <span className="text-green-600">Used by @{invite.used_by_username}</span>
                                        ) : isExpired ? (
                                            <span className="text-red-600">Expired</span>
                                        ) : (
                                            <span className="text-yellow-600">Pending</span>
                                        )}
                                    </td>
                                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                        {new Date(invite.expires_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                        {!invite.used && !isExpired && (
                                            <button
                                                onClick={() => copyCode(invite.code, invite.id)}
                                                className="p-1.5 text-[var(--brand-primary)] hover:opacity-90 rounded hover:bg-[var(--comment-secondary-bg)]"
                                                title="Copy invite link"
                                            >
                                                {copiedId === invite.id ? (
                                                    <span className="text-xs text-green-600">Copied!</span>
                                                ) : (
                                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {invites.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--brand-muted)]">No invite codes generated yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
