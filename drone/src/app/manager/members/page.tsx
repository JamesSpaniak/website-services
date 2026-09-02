'use client';

import { useCallback, useEffect, useState } from 'react';
import { useManagerOrg } from '../shell';
import {
    getOrgMembers,
    addOrgMember,
    removeOrgMember,
    updateMemberRole,
    getOrgClasses,
    createOrgClass,
    updateOrgClass,
    deleteOrgClass,
    updateMemberClass,
} from '@/app/lib/api-client';
import type { OrganizationMember, OrgClass } from '@/app/lib/types/organization';
import { ORG_ROLE_TONE } from '@/app/lib/status-tones';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

export default function ManagerMembersPage() {
    const { org, refreshOrg } = useManagerOrg();
    const orgId = org.id;

    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [classes, setClasses] = useState<OrgClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState<'manager' | 'member'>('member');
    const [addClassId, setAddClassId] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);
    const [filterClassId, setFilterClassId] = useState<'all' | 'none' | number>('all');
    const [newClassName, setNewClassName] = useState('');
    const [classSaving, setClassSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [memberData, classData] = await Promise.all([
                getOrgMembers(orgId),
                getOrgClasses(orgId),
            ]);
            setMembers(memberData);
            setClasses(classData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load members');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const refreshClasses = useCallback(async () => {
        try {
            setClasses(await getOrgClasses(orgId));
        } catch {
            // class counts are cosmetic; ignore refresh failures
        }
    }, [orgId]);

    const handleAdd = async () => {
        if (!addEmail.trim()) return;
        setAdding(true);
        try {
            const newMember = await addOrgMember(orgId, {
                email: addEmail.trim(),
                role: addRole,
                class_id: addRole === 'member' && addClassId !== null ? addClassId : undefined,
            });
            setMembers((prev) => [...prev, newMember]);
            setAddEmail('');
            refreshOrg();
            refreshClasses();
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
            refreshClasses();
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

    const handleClassChange = async (userId: number, classId: number | null) => {
        try {
            await updateMemberClass(orgId, userId, classId);
            const className = classId !== null ? (classes.find((c) => c.id === classId)?.name ?? null) : null;
            setMembers((prev) =>
                prev.map((m) => (m.user_id === userId ? { ...m, class_id: classId, class_name: className } : m)),
            );
            refreshClasses();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update class');
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        setClassSaving(true);
        try {
            const created = await createOrgClass(orgId, { name: newClassName.trim() });
            setClasses((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setNewClassName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create class');
        } finally {
            setClassSaving(false);
        }
    };

    const handleRenameClass = async (cls: OrgClass) => {
        const name = window.prompt('Rename class:', cls.name);
        if (!name || name.trim() === '' || name.trim() === cls.name) return;
        try {
            const updated = await updateOrgClass(orgId, cls.id, { name: name.trim() });
            setClasses((prev) => prev.map((c) => (c.id === cls.id ? updated : c)));
            setMembers((prev) =>
                prev.map((m) => (m.class_id === cls.id ? { ...m, class_name: updated.name } : m)),
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to rename class');
        }
    };

    const handleDeleteClass = async (cls: OrgClass) => {
        if (!confirm(`Delete class "${cls.name}"? It must be empty (move members out first).`)) return;
        try {
            await deleteOrgClass(orgId, cls.id);
            setClasses((prev) => prev.filter((c) => c.id !== cls.id));
            if (filterClassId === cls.id) setFilterClassId('all');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete class');
        }
    };

    if (loading) return <LoadingComponent />;

    const filteredMembers = members.filter((m) => {
        if (filterClassId === 'all') return true;
        if (filterClassId === 'none') return m.class_id === null;
        return m.class_id === filterClassId;
    });

    return (
        <div>
            {error && <ErrorComponent message={error} />}

            <div className="bg-[var(--surface)] rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-[var(--brand-foreground)] mb-4">Classes (Periods)</h3>
                {classes.length > 0 ? (
                    <ul className="flex flex-wrap gap-2 mb-4">
                        {classes.map((c) => (
                            <li key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--comment-secondary-bg)] rounded-lg text-sm">
                                <span className="text-[var(--brand-foreground)]">
                                    {c.name}
                                    <span className="text-[var(--brand-muted)]">
                                        {' '}· {c.member_count}{c.max_students != null ? `/${c.max_students}` : ''}
                                    </span>
                                </span>
                                <button onClick={() => handleRenameClass(c)} className="text-xs text-[var(--brand-primary)] hover:underline">Rename</button>
                                <button onClick={() => handleDeleteClass(c)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-[var(--brand-muted)] mb-4">No classes yet. Create classes (e.g. &quot;Period 2&quot;) to group students, filter progress, and target class exams.</p>
                )}
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="New class name (e.g. Period 2)"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateClass(); }}
                        className="flex-1 px-3 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                    />
                    <button
                        onClick={handleCreateClass}
                        disabled={classSaving || !newClassName.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" />
                        {classSaving ? 'Adding...' : 'Add Class'}
                    </button>
                </div>
            </div>

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
                    {addRole === 'member' && classes.length > 0 && (
                        <select
                            value={addClassId ?? ''}
                            onChange={(e) => setAddClassId(e.target.value ? Number(e.target.value) : null)}
                            className="px-3 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                        >
                            <option value="">No class</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
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

            {classes.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm text-[var(--brand-muted)]">Filter by class:</label>
                    <select
                        value={filterClassId === 'all' || filterClassId === 'none' ? filterClassId : String(filterClassId)}
                        onChange={(e) => {
                            const v = e.target.value;
                            setFilterClassId(v === 'all' || v === 'none' ? v : Number(v));
                        }}
                        className="px-3 py-1.5 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                    >
                        <option value="all">All classes</option>
                        <option value="none">Unassigned</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--surface-border)]">
                <thead className="bg-[var(--comment-secondary-bg)]">
                    <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Name</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Email</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Role</th>
                        {classes.length > 0 && (
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Class</th>
                        )}
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Joined</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                    {filteredMembers.map((member) => (
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
                            {classes.length > 0 && (
                                <td className="px-4 sm:px-6 py-4 text-sm">
                                    <select
                                        value={member.class_id ?? ''}
                                        onChange={(e) => handleClassChange(member.user_id, e.target.value ? Number(e.target.value) : null)}
                                        className="px-2 py-1 border border-[var(--input-border)] rounded text-xs bg-[var(--surface)] text-[var(--brand-foreground)]"
                                    >
                                        <option value="">No class</option>
                                        {classes.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </td>
                            )}
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
                    {filteredMembers.length === 0 && (
                        <tr><td colSpan={classes.length > 0 ? 6 : 5} className="px-6 py-8 text-center text-[var(--brand-muted)]">
                            {members.length === 0
                                ? 'No members yet. Add existing users above or generate invite codes in the Invites tab.'
                                : 'No members in this class.'}
                        </td></tr>
                    )}
                </tbody>
            </table>
            </div>
        </div>
    );
}
