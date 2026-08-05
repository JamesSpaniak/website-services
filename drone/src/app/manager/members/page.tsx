'use client';

import { useCallback, useEffect, useState } from 'react';
import { useManagerOrg } from '../shell';
import { getOrgMembers, addOrgMember, removeOrgMember, updateMemberRole } from '@/app/lib/api-client';
import type { OrganizationMember } from '@/app/lib/types/organization';
import { ORG_ROLE_TONE } from '@/app/lib/status-tones';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

export default function ManagerMembersPage() {
    const { org, refreshOrg } = useManagerOrg();
    const orgId = org.id;

    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState<'manager' | 'member'>('member');
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getOrgMembers(orgId);
            setMembers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load members');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addEmail.trim()) return;
        setAdding(true);
        try {
            const newMember = await addOrgMember(orgId, { email: addEmail.trim(), role: addRole });
            setMembers((prev) => [...prev, newMember]);
            setAddEmail('');
            refreshOrg();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add member');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (userId: number, username: string) => {
        if (!confirm(`Remove ${username} from the organization?`)) return;
        try {
            await removeOrgMember(orgId, userId);
            setMembers((prev) => prev.filter((m) => m.user_id !== userId));
            refreshOrg();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove member');
        }
    };

    const handleRoleChange = async (userId: number, newRole: 'manager' | 'member') => {
        try {
            await updateMemberRole(orgId, userId, newRole);
            setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)));
            refreshOrg();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    if (loading) return <LoadingComponent />;

    return (
        <div>
            {error && <ErrorComponent message={error} />}

            <div className="bg-[var(--surface)] rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-[var(--brand-foreground)] mb-4">Add Existing User</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        placeholder="User's email address"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                        className="flex-1 px-3 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                    />
                    <select
                        value={addRole}
                        onChange={(e) => setAddRole(e.target.value as 'manager' | 'member')}
                        className="px-3 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                    >
                        <option value="member">Student</option>
                        <option value="manager">Manager</option>
                    </select>
                    <button
                        onClick={handleAdd}
                        disabled={adding || !addEmail.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" />
                        {adding ? 'Adding...' : 'Add Member'}
                    </button>
                </div>
                <p className="mt-2 text-xs text-[var(--brand-muted)]">Add a user who already has an account. For new users, generate an invite link in the Invites tab.</p>
            </div>

            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--surface-border)]">
                <thead className="bg-[var(--comment-secondary-bg)]">
                    <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Name</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Email</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Role</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Joined</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                    {members.map((member) => (
                        <tr key={member.user_id} className="hover:bg-[var(--comment-secondary-bg)]">
                            <td className="px-4 sm:px-6 py-4 text-sm font-medium text-[var(--brand-foreground)]">
                                {member.first_name || member.last_name
                                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                    : member.username}
                                <span className="block text-xs text-[var(--brand-muted)]">@{member.username}</span>
                            </td>
                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">{member.email}</td>
                            <td className="px-4 sm:px-6 py-4 text-sm">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                    ORG_ROLE_TONE[member.role] ?? ORG_ROLE_TONE.member
                                }`}>
                                    {member.role}
                                </span>
                            </td>
                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                {new Date(member.joined_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {member.role === 'member' ? (
                                        <button
                                            onClick={() => handleRoleChange(member.user_id, 'manager')}
                                            className="p-1.5 text-violet-400 hover:text-violet-300 rounded hover:bg-violet-500/10"
                                            title="Promote to Manager"
                                        >
                                            <ArrowUpIcon className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleRoleChange(member.user_id, 'member')}
                                            className="p-1.5 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded hover:bg-[var(--comment-secondary-bg)]"
                                            title="Demote to Member"
                                        >
                                            <ArrowDownIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemove(member.user_id, member.username)}
                                        className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                        title="Remove member"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {members.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--brand-muted)]">No members yet. Add existing users above or generate invite codes in the Invites tab.</td></tr>
                    )}
                </tbody>
            </table>
            </div>
        </div>
    );
}
