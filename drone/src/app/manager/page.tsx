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
} from '@/app/lib/api-client';
import type { Organization, OrganizationMember, InviteCode, MemberCourseProgressSummary, MemberCourseDetailedProgress } from '@/app/lib/types/organization';
import type { AuditLogEntry } from '@/app/lib/types/audit';
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
} from '@heroicons/react/24/solid';

export default function ManagerPage() {
    return (
        <ManagerGuard>
            <ManagerDashboard />
        </ManagerGuard>
    );
}

function ManagerDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState<'members' | 'invites' | 'progress'>('members');
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
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{org.name}</h1>
                <p className="mt-2 text-sm text-gray-600">
                    {org.member_count} of {org.max_students} student seats used
                    {org.manager_count > 0 && ` · ${org.manager_count} manager${org.manager_count > 1 ? 's' : ''}`}
                </p>
            </div>

            {error && <ErrorComponent message={error} />}

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => { setTab(t.id); setError(null); }}
                            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === t.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        </div>
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
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Existing User</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        placeholder="User's email address"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        value={addRole}
                        onChange={(e) => setAddRole(e.target.value as 'manager' | 'member')}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="member">Student</option>
                        <option value="manager">Manager</option>
                    </select>
                    <button
                        onClick={handleAdd}
                        disabled={adding || !addEmail.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" />
                        {adding ? 'Adding...' : 'Add Member'}
                    </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Add a user who already has an account. For new users, generate an invite link in the Invites tab.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {members.map((member) => (
                        <tr key={member.user_id} className="hover:bg-gray-50">
                            <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                                {member.first_name || member.last_name
                                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                    : member.username}
                                <span className="block text-xs text-gray-500">@{member.username}</span>
                            </td>
                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">{member.email}</td>
                            <td className="px-4 sm:px-6 py-4 text-sm">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    member.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {member.role}
                                </span>
                            </td>
                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">
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
                                            className="p-1.5 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
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
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No members yet. Add existing users above or generate invite codes in the Invites tab.</td></tr>
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
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Invite Code</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        placeholder="Email (optional - sends invite automatically)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'manager' | 'member')}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="member">Student</option>
                        <option value="manager">Manager</option>
                    </select>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" />
                        {generating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Copy</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invites.map((invite) => {
                            const isExpired = new Date(invite.expires_at) < new Date();
                            return (
                                <tr key={invite.id} className={`hover:bg-gray-50 ${invite.used || isExpired ? 'opacity-60' : ''}`}>
                                    <td className="px-4 sm:px-6 py-4 text-sm font-mono font-medium text-gray-900">{invite.code}</td>
                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            invite.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {invite.role === 'manager' ? 'Manager' : 'Student'}
                                        </span>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">{invite.email || '—'}</td>
                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                        {invite.used ? (
                                            <span className="text-green-600">Used by @{invite.used_by_username}</span>
                                        ) : isExpired ? (
                                            <span className="text-red-600">Expired</span>
                                        ) : (
                                            <span className="text-yellow-600">Pending</span>
                                        )}
                                    </td>
                                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500">
                                        {new Date(invite.expires_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                        {!invite.used && !isExpired && (
                                            <button
                                                onClick={() => copyCode(invite.code, invite.id)}
                                                className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
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
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No invite codes generated yet.</td></tr>
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
        return <div className="text-center py-12 text-gray-500">No course progress data available yet.</div>;
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
                    <div key={courseId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <button
                            onClick={() => toggleCourse(courseId)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="text-left">
                                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {membersWithProgress.length} of {members.length} students started · {avgCompletion}% avg completion
                                </p>
                            </div>
                            {isExpanded ? (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                            )}
                        </button>

                        {isExpanded && (
                            <div className="border-t border-gray-200">
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
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Exam</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {members.map((m) => {
                        const pct = m.units_total > 0 ? Math.round((m.units_completed / m.units_total) * 100) : 0;
                        const displayName = m.first_name || m.last_name
                            ? `${m.first_name || ''} ${m.last_name || ''}`.trim()
                            : m.username;
                        return (
                            <tr
                                key={m.user_id}
                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => setSelectedStudent({ userId: m.user_id, name: displayName })}
                            >
                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">
                                    {displayName}
                                    <span className="block text-xs text-gray-500">@{m.username}</span>
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        m.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {m.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm text-gray-500">
                                    {m.units_completed}/{m.units_total}
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500">{pct}%</span>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-3 text-sm text-gray-500">
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
    LOGIN: { label: 'Logged in', color: 'bg-gray-100 text-gray-700' },
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
        <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Activity Log — {studentName}</h4>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetPicture}
                        disabled={resettingPicture}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                        {resettingPicture ? 'Resetting...' : 'Reset Picture'}
                    </button>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500">Loading activity...</p>
            ) : activity.length === 0 ? (
                <p className="text-sm text-gray-500">No activity recorded yet.</p>
            ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activity.map((entry) => {
                        const cfg = ACTION_LABELS[entry.action] || { label: entry.action, color: 'bg-gray-100 text-gray-600' };
                        const meta = formatActionMeta(entry.action, entry.metadata);
                        return (
                            <div key={entry.id} className="flex items-start gap-3 text-sm">
                                <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5 w-32 shrink-0">
                                    {new Date(entry.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                    {cfg.label}
                                </span>
                                {meta && <span className="text-xs text-gray-500 pt-0.5">{meta}</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
