'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/lib/auth-context';
import ManagerGuard from '@/app/ui/components/manager-guard';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import {
    getOrganizationDetails,
    getOrgMembers,
    addOrgMember,
    removeOrgMember,
    updateMemberRole,
    generateInviteCode,
    getInviteCodes,
    getOrgProgress,
    getOrgCourseProgress,
    getStudentActivity,
    resetMemberPicture,
    getOrgCourses,
    generateClassExam,
    getOrgClassExams,
    getClassExamResults,
} from '@/app/lib/api-client';
import type { Organization, OrganizationMember, InviteCode, MemberCourseProgressSummary, MemberCourseDetailedProgress, OrgCourse } from '@/app/lib/types/organization';
import type { AuditLogEntry } from '@/app/lib/types/audit';
import type { ClassExamSummary, ClassExamResults, StudentExamResult } from '@/app/lib/types/question';
import {
    UserGroupIcon,
    EnvelopeIcon,
    AcademicCapIcon,
    TrashIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ClipboardDocumentIcon,
    PlusIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    XMarkIcon,
    DocumentArrowDownIcon,
    ClipboardDocumentListIcon,
} from '@heroicons/react/24/solid';
import PageShell from '@/app/ui/components/page-shell';

export default function ManagerPage() {
    return (
        <ManagerGuard>
            <ManagerDashboard />
        </ManagerGuard>
    );
}

function ManagerDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState<'members' | 'invites' | 'progress' | 'exams'>('members');
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const orgId = user?.organization?.id;

    const loadOrg = useCallback(async () => {
        if (!orgId) return;
        try {
            const data = await getOrganizationDetails(orgId);
            setOrg(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load organization');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { loadOrg(); }, [loadOrg]);

    if (loading) return <LoadingComponent />;
    if (!org) return <ErrorComponent message={error || 'Organization not found.'} />;

    const tabs = [
        { id: 'members' as const, label: 'Members', icon: UserGroupIcon },
        { id: 'invites' as const, label: 'Invites', icon: EnvelopeIcon },
        { id: 'progress' as const, label: 'Course Progress', icon: AcademicCapIcon },
        { id: 'exams' as const, label: 'Class Exams', icon: ClipboardDocumentListIcon },
    ];

    const subtitle = `${org.member_count} of ${org.max_students} student seats used${
        org.manager_count > 0 ? ` · ${org.manager_count} manager${org.manager_count > 1 ? 's' : ''}` : ''
    }`;

    return (
        <PageShell title={org.name} subtitle={subtitle} maxWidthClass="max-w-7xl">
            {error && <ErrorComponent message={error} />}

            <div className="mb-6 border-b border-[var(--surface-border)]">
                <nav className="-mb-px flex gap-6">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setTab(t.id);
                                setError(null);
                            }}
                            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === t.id
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] hover:border-[var(--surface-border)]'
                            }`}
                        >
                            <t.icon className="h-4 w-4" />
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {tab === 'members' && <MembersTab orgId={org.id} onError={setError} onRefresh={loadOrg} />}
            {tab === 'invites' && <InvitesTab orgId={org.id} onError={setError} />}
            {tab === 'progress' && <ProgressTab orgId={org.id} onError={setError} />}
            {tab === 'exams' && <ExamsTab orgId={org.id} onError={setError} />}
        </PageShell>
    );
}

// ── Members Tab ──

function MembersTab({ orgId, onError, onRefresh }: { orgId: number; onError: (msg: string) => void; onRefresh: () => void }) {
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState<'manager' | 'member'>('member');
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getOrgMembers(orgId);
            setMembers(data);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to load members');
        } finally {
            setLoading(false);
        }
    }, [orgId, onError]);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addEmail.trim()) return;
        setAdding(true);
        try {
            const newMember = await addOrgMember(orgId, { email: addEmail.trim(), role: addRole });
            setMembers((prev) => [...prev, newMember]);
            setAddEmail('');
            onRefresh();
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to add member');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (userId: number, username: string) => {
        if (!confirm(`Remove ${username} from the organization?`)) return;
        try {
            await removeOrgMember(orgId, userId);
            setMembers((prev) => prev.filter((m) => m.user_id !== userId));
            onRefresh();
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to remove member');
        }
    };

    const handleRoleChange = async (userId: number, newRole: 'manager' | 'member') => {
        try {
            await updateMemberRole(orgId, userId, newRole);
            setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)));
            onRefresh();
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    if (loading) return <LoadingComponent />;

    return (
        <div>
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    member.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)]'
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
                                            className="p-1.5 text-purple-600 hover:text-purple-800 rounded hover:bg-purple-50"
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

// ── Invites Tab ──

function InvitesTab({ orgId, onError }: { orgId: number; onError: (msg: string) => void }) {
    const [invites, setInvites] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
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
            onError(err instanceof Error ? err.message : 'Failed to load invite codes');
        } finally {
            setLoading(false);
        }
    }, [orgId, onError]);

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
            onError(err instanceof Error ? err.message : 'Failed to generate invite code');
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
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            invite.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)]'
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

// ── Progress Tab ──

function ProgressTab({ orgId, onError }: { orgId: number; onError: (msg: string) => void }) {
    const [progressData, setProgressData] = useState<MemberCourseProgressSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
    const [detailedProgress, setDetailedProgress] = useState<Record<number, MemberCourseDetailedProgress[]>>({});
    const [detailLoading, setDetailLoading] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getOrgProgress(orgId);
            setProgressData(data);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to load progress');
        } finally {
            setLoading(false);
        }
    }, [orgId, onError]);

    useEffect(() => { load(); }, [load]);

    // Group progress by course
    const courseMap = new Map<number, { title: string; members: MemberCourseProgressSummary[] }>();
    for (const row of progressData) {
        if (!courseMap.has(row.course_id)) {
            courseMap.set(row.course_id, { title: row.course_title, members: [] });
        }
        courseMap.get(row.course_id)!.members.push(row);
    }

    const toggleCourse = async (courseId: number) => {
        if (expandedCourse === courseId) {
            setExpandedCourse(null);
            return;
        }
        setExpandedCourse(courseId);

        if (!detailedProgress[courseId]) {
            setDetailLoading(courseId);
            try {
                const data = await getOrgCourseProgress(orgId, courseId);
                setDetailedProgress((prev) => ({ ...prev, [courseId]: data }));
            } catch (err) {
                onError(err instanceof Error ? err.message : 'Failed to load detailed progress');
            } finally {
                setDetailLoading(null);
            }
        }
    };

    if (loading) return <LoadingComponent />;

    if (courseMap.size === 0) {
        return <div className="text-center py-12 text-[var(--brand-muted)]">No course progress data available yet.</div>;
    }

    return (
        <div className="space-y-4">
            {Array.from(courseMap.entries()).map(([courseId, { title, members }]) => {
                const isExpanded = expandedCourse === courseId;
                const membersWithProgress = members.filter((m) => m.status !== 'NOT_STARTED');
                const avgCompletion = members.length > 0
                    ? Math.round(members.reduce((sum, m) => sum + (m.units_total > 0 ? (m.units_completed / m.units_total) * 100 : 0), 0) / members.length)
                    : 0;

                return (
                    <div key={courseId} className="bg-[var(--surface)] rounded-xl shadow-sm overflow-hidden">
                        <button
                            onClick={() => toggleCourse(courseId)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--comment-secondary-bg)] transition-colors"
                        >
                            <div className="text-left">
                                <h3 className="text-sm font-semibold text-[var(--brand-foreground)]">{title}</h3>
                                <p className="text-xs text-[var(--brand-muted)] mt-0.5">
                                    {membersWithProgress.length} of {members.length} students started · {avgCompletion}% avg completion
                                </p>
                            </div>
                            {isExpanded ? (
                                <ChevronDownIcon className="h-5 w-5 text-[var(--brand-muted)]" />
                            ) : (
                                <ChevronRightIcon className="h-5 w-5 text-[var(--brand-muted)]" />
                            )}
                        </button>

                        {isExpanded && (
                            <div className="border-t border-[var(--surface-border)]">
                                {detailLoading === courseId ? (
                                    <div className="p-6"><LoadingComponent /></div>
                                ) : (
                                    <ProgressSummaryTable members={members} orgId={orgId} />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ProgressSummaryTable({ members, orgId }: { members: MemberCourseProgressSummary[]; orgId: number }) {
    const [selectedStudent, setSelectedStudent] = useState<{ userId: number; name: string } | null>(null);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--surface-border)]">
                <thead className="bg-[var(--comment-secondary-bg)]">
                    <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Student</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Units</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Progress</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Last Exam</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                    {members.map((m) => {
                        const pct = m.units_total > 0 ? Math.round((m.units_completed / m.units_total) * 100) : 0;
                        const displayName = m.first_name || m.last_name
                            ? `${m.first_name || ''} ${m.last_name || ''}`.trim()
                            : m.username;
                        return (
                            <tr
                                key={m.user_id}
                                className="hover:bg-[var(--comment-secondary-bg)] cursor-pointer transition-colors"
                                onClick={() => setSelectedStudent({ userId: m.user_id, name: displayName })}
                            >
                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-[var(--brand-foreground)]">
                                    {displayName}
                                    <span className="block text-xs text-[var(--brand-muted)]">@{m.username}</span>
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        m.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                        'bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)]'
                                    }`}>
                                        {m.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                    {m.units_completed}/{m.units_total}
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-[var(--surface-border)] rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-[var(--brand-muted)]">{pct}%</span>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                    {m.latest_exam_score !== null ? `${m.latest_exam_score}%` : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {selectedStudent && (
                <StudentActivityPanel
                    userId={selectedStudent.userId}
                    studentName={selectedStudent.name}
                    orgId={orgId}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    LOGIN: { label: 'Logged in', color: 'bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)]' },
    REGISTER: { label: 'Registered', color: 'bg-green-100 text-green-700' },
    VERIFY_EMAIL: { label: 'Verified email', color: 'bg-green-100 text-green-700' },
    COURSE_STARTED: { label: 'Started a course', color: 'bg-blue-100 text-blue-700' },
    UNIT_COMPLETED: { label: 'Completed a unit', color: 'bg-indigo-100 text-indigo-700' },
    EXAM_SUBMITTED: { label: 'Submitted an exam', color: 'bg-purple-100 text-purple-700' },
    COURSE_COMPLETED: { label: 'Completed a course', color: 'bg-emerald-100 text-emerald-700' },
    PROGRESS_RESET: { label: 'Reset progress', color: 'bg-red-100 text-red-700' },
    COURSE_PURCHASED: { label: 'Purchased a course', color: 'bg-yellow-100 text-yellow-700' },
    PRO_UPGRADE: { label: 'Upgraded to Pro', color: 'bg-amber-100 text-amber-700' },
};

function formatActionMeta(action: string, metadata: Record<string, unknown> | null): string {
    if (!metadata) return '';
    const parts: string[] = [];
    if (metadata.courseTitle) parts.push(String(metadata.courseTitle));
    if (metadata.score !== undefined) parts.push(`Score: ${metadata.score}%`);
    if (metadata.attempt !== undefined) parts.push(`Attempt #${metadata.attempt}`);
    return parts.join(' · ');
}

// ── Exams Tab ────────────────────────────────────────────────────────────────

const SCOPE_LABELS: Record<string, string> = {
    full_course: 'Full Course',
    unit: 'Unit',
    sub_unit: 'Sub-unit / Section',
};

function ExamsTab({ orgId, onError }: { orgId: number; onError: (msg: string) => void }) {
    const [courses, setCourses] = useState<OrgCourse[]>([]);
    const [exams, setExams] = useState<ClassExamSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [resultsFor, setResultsFor] = useState<ClassExamSummary | null>(null);

    // Form state
    const [courseId, setCourseId] = useState<number | ''>('');
    const [scope, setScope] = useState<'full_course' | 'unit' | 'sub_unit'>('full_course');
    const [scopeIds, setScopeIds] = useState('');
    const [version, setVersion] = useState('v1');
    const [isRandomized, setIsRandomized] = useState(true);
    const [questionCount, setQuestionCount] = useState('');
    const [label, setLabel] = useState('');
    const [dueDate, setDueDate] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [c, e] = await Promise.all([
                getOrgCourses(orgId),
                getOrgClassExams(orgId),
            ]);
            setCourses(c);
            setExams(e);
            if (c.length > 0 && courseId === '') setCourseId(c[0].id);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to load exam data');
        } finally {
            setLoading(false);
        }
    }, [orgId, onError, courseId]);

    useEffect(() => { load(); }, [load]);

    const notify = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 4000);
    };

    const handleGenerate = async () => {
        if (!courseId) return onError('Select a course first.');
        if ((scope === 'unit' || scope === 'sub_unit') && !scopeIds.trim()) {
            return onError('Enter at least one scope ID (unit or sub-unit number).');
        }
        const parsedIds = scopeIds
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n));

        setGenerating(true);
        try {
            const result = await generateClassExam({
                course_id: Number(courseId),
                scope,
                scope_ids: scope === 'full_course' ? [] : parsedIds,
                is_randomized: isRandomized,
                version: version.trim() || 'v1',
                question_count: questionCount ? parseInt(questionCount) : undefined,
                organization_id: orgId,
                label: label.trim() || undefined,
                due_date: dueDate || undefined,
            });
            notify(`Class exam assigned (${result.exam.questions.length} questions, version ${result.exam.version}).`);
            setShowForm(false);
            // Reset form
            setScope('full_course');
            setScopeIds('');
            setVersion('v1');
            setIsRandomized(true);
            setQuestionCount('');
            setLabel('');
            setDueDate('');
            // Reload list
            const updated = await getOrgClassExams(orgId);
            setExams(updated);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to generate class exam');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <LoadingComponent />;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Class Exams</h2>
                    <p className="text-sm text-[var(--brand-muted)] mt-0.5">
                        Assign practice exams to your class. Track who has taken them and view scores.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setResultsFor(null); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90"
                >
                    <PlusIcon className="h-4 w-4" /> Assign Exam
                </button>
            </div>

            {success && (
                <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg">{success}</div>
            )}

            {/* Generate form */}
            {showForm && (
                <div className="mb-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[var(--brand-foreground)] mb-4">New Class Exam Assignment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Course */}
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Course *</label>
                            <select
                                value={courseId}
                                onChange={(e) => setCourseId(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            >
                                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                {courses.length === 0 && <option disabled>No courses assigned to this org</option>}
                            </select>
                        </div>

                        {/* Scope */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Scope</label>
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value as typeof scope)}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            >
                                <option value="full_course">Full Course</option>
                                <option value="unit">Unit</option>
                                <option value="sub_unit">Sub-unit / Section</option>
                            </select>
                        </div>

                        {/* Scope IDs */}
                        {scope !== 'full_course' && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">
                                    {scope === 'unit' ? 'Unit ID(s)' : 'Sub-unit ID(s)'} *
                                    <span className="font-normal ml-1 text-[var(--brand-muted)]">(comma-separated)</span>
                                </label>
                                <input
                                    type="text"
                                    value={scopeIds}
                                    onChange={(e) => setScopeIds(e.target.value)}
                                    placeholder="e.g. 1, 2, 3"
                                    className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                                />
                            </div>
                        )}

                        {/* Version */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">
                                Version
                                <span className="font-normal ml-1 text-[var(--brand-muted)]">(A, B, v1, v2…)</span>
                            </label>
                            <input
                                type="text"
                                value={version}
                                maxLength={8}
                                onChange={(e) => setVersion(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Question count */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">
                                Question Count
                                <span className="font-normal ml-1 text-[var(--brand-muted)]">(blank = all available)</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={questionCount}
                                onChange={(e) => setQuestionCount(e.target.value)}
                                placeholder="e.g. 30"
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Label */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Label (optional)</label>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="e.g. Midterm Unit 1-3"
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Due date */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Due Date (optional)</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Randomized toggle */}
                        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRandomized}
                                    onChange={(e) => setIsRandomized(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-[var(--surface-border)] peer-focus:ring-2 peer-focus:ring-[var(--brand-primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--brand-primary)]" />
                            </label>
                            <div>
                                <p className="text-sm font-medium text-[var(--brand-foreground)]">
                                    {isRandomized ? 'Randomized' : 'Fixed'}
                                </p>
                                <p className="text-xs text-[var(--brand-muted)]">
                                    {isRandomized
                                        ? 'Each student gets a different random set of questions — reduces answer sharing.'
                                        : 'All students get identical questions in the same order. Reuses existing exam if this scope+version was already generated.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-5">
                        <button
                            onClick={handleGenerate}
                            disabled={generating || !courseId}
                            className="px-5 py-2 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {generating ? 'Generating…' : 'Generate & Assign'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-sm font-medium text-[var(--brand-muted)] border border-[var(--surface-border)] rounded-lg hover:text-[var(--brand-foreground)]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Results panel */}
            {resultsFor && (
                <ClassExamResultsPanel
                    summary={resultsFor}
                    courses={courses}
                    onClose={() => setResultsFor(null)}
                    onError={onError}
                />
            )}

            {/* Exam list */}
            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--surface-border)]">
                    <thead className="bg-[var(--comment-secondary-bg)]">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Label / Scope</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Course</th>
                            <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Version</th>
                            <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Questions</th>
                            <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Due</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Assigned</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-border)]">
                        {exams.map((e) => {
                            const courseName = courses.find((c) => c.id === e.course_id)?.title ?? `Course ${e.course_id}`;
                            const scopeLabel = e.scope === 'full_course'
                                ? 'Full Course'
                                : `${SCOPE_LABELS[e.scope]} ${e.scope_ids.join(', ')}`;
                            return (
                                <tr key={e.class_exam_id} className="hover:bg-[var(--comment-secondary-bg)]">
                                    <td className="px-4 sm:px-6 py-4">
                                        <p className="text-sm font-medium text-[var(--brand-foreground)]">
                                            {e.label || scopeLabel}
                                        </p>
                                        {e.label && (
                                            <p className="text-xs text-[var(--brand-muted)]">{scopeLabel}</p>
                                        )}
                                    </td>
                                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] max-w-[150px] truncate">{courseName}</td>
                                    <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                                        <span className="text-xs font-mono px-2 py-0.5 bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] rounded">
                                            {e.version}
                                        </span>
                                        {!e.is_randomized && (
                                            <span className="ml-1.5 text-xs text-[var(--brand-muted)]">fixed</span>
                                        )}
                                    </td>
                                    <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">{e.question_count}</td>
                                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                        {e.due_date ? new Date(e.due_date).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] whitespace-nowrap">
                                        {new Date(e.assigned_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-right">
                                        <button
                                            onClick={() => setResultsFor(resultsFor?.class_exam_id === e.class_exam_id ? null : e)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 rounded-lg hover:bg-[var(--brand-primary)]/8 transition-colors"
                                        >
                                            <AcademicCapIcon className="h-3.5 w-3.5" />
                                            Results
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {exams.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-sm text-[var(--brand-muted)]">
                                    No class exams assigned yet. Click <strong>Assign Exam</strong> to create one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ClassExamResultsPanel({
    summary,
    courses,
    onClose,
    onError,
}: {
    summary: ClassExamSummary;
    courses: OrgCourse[];
    onClose: () => void;
    onError: (msg: string) => void;
}) {
    const [results, setResults] = useState<ClassExamResults | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getClassExamResults(summary.class_exam_id);
                if (!cancelled) setResults(data);
            } catch (err) {
                if (!cancelled) onError(err instanceof Error ? err.message : 'Failed to load results');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [summary.class_exam_id, onError]);

    const handleExportCsv = () => {
        if (!results) return;
        const courseName = courses.find((c) => c.id === summary.course_id)?.title ?? `course-${summary.course_id}`;

        // Collect every unique section key that appears in any student's breakdown,
        // sorted by unit_id then sub_unit_id so columns are in a consistent order.
        const sectionKeySet = new Map<string, { unit_id: number; sub_unit_id: number | null }>();
        for (const s of results.students) {
            for (const sb of s.section_breakdown ?? []) {
                const key = `${sb.unit_id}:${sb.sub_unit_id ?? ''}`;
                if (!sectionKeySet.has(key)) sectionKeySet.set(key, { unit_id: sb.unit_id, sub_unit_id: sb.sub_unit_id });
            }
        }
        const sections = Array.from(sectionKeySet.values()).sort((a, b) =>
            a.unit_id !== b.unit_id ? a.unit_id - b.unit_id : (a.sub_unit_id ?? 0) - (b.sub_unit_id ?? 0),
        );
        const hasBreakdown = sections.length > 0;

        const sectionHeader = (s: { unit_id: number; sub_unit_id: number | null }) =>
            s.sub_unit_id != null ? `Unit ${s.unit_id} / Section ${s.sub_unit_id} (%)` : `Unit ${s.unit_id} (%)`;

        const header = [
            'Username',
            'Score (%)',
            'Status',
            'Completed At',
            ...(hasBreakdown ? sections.map(sectionHeader) : []),
            ...(hasBreakdown ? ['Failed Standards'] : []),
        ];

        const dataRows = results.students.map((s) => {
            const breakdownMap = new Map(
                (s.section_breakdown ?? []).map((sb) => [`${sb.unit_id}:${sb.sub_unit_id ?? ''}`, sb]),
            );
            const sectionScores = hasBreakdown
                ? sections.map((sec) => {
                      const sb = breakdownMap.get(`${sec.unit_id}:${sec.sub_unit_id ?? ''}`);
                      return sb != null ? String(sb.score_percent) : '—';
                  })
                : [];
            const failedStandards = hasBreakdown
                ? (s.section_breakdown ?? []).flatMap((sb) => sb.failed_standards).join('; ')
                : undefined;

            return [
                s.username,
                s.score != null ? String(s.score) : 'Not taken',
                s.score != null ? (s.score >= 70 ? 'Pass' : 'Fail') : '—',
                s.completed_at ? new Date(s.completed_at).toLocaleString() : '—',
                ...sectionScores,
                ...(hasBreakdown ? [failedStandards ?? ''] : []),
            ];
        });

        const csv = [header, ...dataRows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-results-${courseName}-${summary.version}.csv`.replace(/\s+/g, '-');
        a.click();
        URL.revokeObjectURL(url);
    };

    const scopeLabel = summary.scope === 'full_course'
        ? 'Full Course'
        : `${SCOPE_LABELS[summary.scope]} ${summary.scope_ids.join(', ')}`;

    return (
        <div className="mb-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--surface-border)]">
                <div>
                    <p className="text-sm font-semibold text-[var(--brand-foreground)]">
                        {summary.label || scopeLabel}
                        <span className="ml-2 text-xs font-mono text-[var(--brand-muted)]">v{summary.version}</span>
                    </p>
                    <p className="text-xs text-[var(--brand-muted)] mt-0.5">
                        {summary.question_count} questions · {scopeLabel}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCsv}
                        disabled={!results || loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--surface-border)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded-lg disabled:opacity-40"
                    >
                        <DocumentArrowDownIcon className="h-3.5 w-3.5" /> Export CSV
                    </button>
                    <button onClick={onClose} className="p-1 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-6"><LoadingComponent /></div>
            ) : results ? (
                <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 divide-x divide-[var(--surface-border)] border-b border-[var(--surface-border)]">
                        {[
                            { label: 'Assigned', value: results.total_assigned },
                            { label: 'Completed', value: results.total_completed },
                            {
                                label: 'Avg Score',
                                value: results.total_completed > 0
                                    ? `${Math.round(results.students.filter((s) => s.score != null).reduce((sum, s) => sum + (s.score ?? 0), 0) / results.total_completed)}%`
                                    : '—',
                            },
                        ].map((stat) => (
                            <div key={stat.label} className="p-4 text-center">
                                <p className="text-2xl font-bold text-[var(--brand-foreground)]">{stat.value}</p>
                                <p className="text-xs text-[var(--brand-muted)] mt-0.5">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Student table */}
                    <table className="min-w-full divide-y divide-[var(--surface-border)]">
                        <thead className="bg-[var(--comment-secondary-bg)]">
                            <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Student</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Score</th>
                                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Status</th>
                                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Completed</th>
                                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Weaknesses</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--surface-border)]">
                            {results.students
                                .slice()
                                .sort((a, b) => {
                                    if (a.score == null && b.score == null) return 0;
                                    if (a.score == null) return 1;
                                    if (b.score == null) return -1;
                                    return b.score - a.score;
                                })
                                .map((s: StudentExamResult) => {
                                    const failedStandards = s.section_breakdown
                                        ?.flatMap((sb) => sb.failed_standards)
                                        .filter(Boolean) ?? [];
                                    return (
                                        <tr key={s.user_id} className="hover:bg-[var(--comment-secondary-bg)]">
                                            <td className="px-4 sm:px-6 py-3 text-sm font-medium text-[var(--brand-foreground)]">
                                                @{s.username}
                                            </td>
                                            <td className="px-4 sm:px-6 py-3 text-sm">
                                                {s.score != null ? (
                                                    <span className={`font-semibold ${s.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {s.score}%
                                                    </span>
                                                ) : (
                                                    <span className="text-[var(--brand-muted)]">Not taken</span>
                                                )}
                                            </td>
                                            <td className="hidden sm:table-cell px-4 sm:px-6 py-3 text-sm">
                                                {s.score != null ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        s.score >= 70 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {s.score >= 70 ? 'Pass' : 'Fail'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)]">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                                {s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="hidden lg:table-cell px-4 sm:px-6 py-3 text-xs font-mono text-red-400">
                                                {failedStandards.length > 0 ? failedStandards.slice(0, 4).join(', ') + (failedStandards.length > 4 ? '…' : '') : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </>
            ) : null}
        </div>
    );
}

function StudentActivityPanel({ userId, studentName, orgId, onClose }: { userId: number; studentName: string; orgId: number; onClose: () => void }) {
    const [activity, setActivity] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [resettingPicture, setResettingPicture] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getStudentActivity(userId);
                if (!cancelled) setActivity(data);
            } catch {
                if (!cancelled) setActivity([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const handleResetPicture = async () => {
        if (!confirm(`Remove ${studentName}'s profile picture?`)) return;
        setResettingPicture(true);
        try {
            await resetMemberPicture(orgId, userId);
        } catch { /* swallow */ }
        finally { setResettingPicture(false); }
    };

    return (
        <div className="border-t border-[var(--surface-border)] bg-[var(--comment-secondary-bg)] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[var(--brand-foreground)]">Activity Log — {studentName}</h4>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetPicture}
                        disabled={resettingPicture}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                        {resettingPicture ? 'Resetting...' : 'Reset Picture'}
                    </button>
                    <button onClick={onClose} className="p-1 text-[var(--brand-muted)] hover:text-[var(--brand-muted)] rounded hover:bg-[var(--surface-border)]">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-[var(--brand-muted)]">Loading activity...</p>
            ) : activity.length === 0 ? (
                <p className="text-sm text-[var(--brand-muted)]">No activity recorded yet.</p>
            ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activity.map((entry) => {
                        const cfg = ACTION_LABELS[entry.action] || { label: entry.action, color: 'bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)]' };
                        const meta = formatActionMeta(entry.action, entry.metadata);
                        return (
                            <div key={entry.id} className="flex items-start gap-3 text-sm">
                                <span className="text-xs text-[var(--brand-muted)] whitespace-nowrap pt-0.5 w-32 shrink-0">
                                    {new Date(entry.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                    {cfg.label}
                                </span>
                                {meta && <span className="text-xs text-[var(--brand-muted)] pt-0.5">{meta}</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
