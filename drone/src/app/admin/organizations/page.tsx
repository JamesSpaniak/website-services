'use client';

import { useEffect, useState } from 'react';
import { CourseData } from '@/app/lib/types/course';
import type { Organization, OrgCourse } from '@/app/lib/types/organization';
import {
    getCourses,
    getOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    generateInviteCode,
    bulkGenerateInviteCodes,
    assignOrgCourses,
    removeOrgCourse,
    getOrgCourses,
} from '@/app/lib/api-client';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, PencilSquareIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/solid';

export default function AdminOrganizationsPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [orgsData, coursesData] = await Promise.all([getOrganizations(), getCourses()]);
                setOrganizations(orgsData);
                setCourses(coursesData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load organizations');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <LoadingComponent />;

    return (
        <div>
            {error && <ErrorComponent message={error} />}
            <OrganizationsPanel
                organizations={organizations}
                setOrganizations={setOrganizations}
                courses={courses}
                onError={setError}
            />
        </div>
    );
}

function OrganizationsPanel({
    organizations,
    setOrganizations,
    courses,
    onError,
}: {
    organizations: Organization[];
    setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
    courses: CourseData[];
    onError: (msg: string) => void;
}) {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [maxStudents, setMaxStudents] = useState(10);
    const [initialManagerEmail, setInitialManagerEmail] = useState('');
    const [schoolYear, setSchoolYear] = useState('');
    const [semester, setSemester] = useState('');
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editMaxStudents, setEditMaxStudents] = useState(10);
    const [editSchoolYear, setEditSchoolYear] = useState('');
    const [editSemester, setEditSemester] = useState('');
    const [inviteOrgId, setInviteOrgId] = useState<number | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'manager' | 'member'>('manager');
    const [inviteResult, setInviteResult] = useState<string | null>(null);
    const [bulkEmails, setBulkEmails] = useState('');
    const [bulkRole, setBulkRole] = useState<'manager' | 'member'>('member');
    const [bulkSending, setBulkSending] = useState(false);
    const [bulkResult, setBulkResult] = useState<string | null>(null);
    const [courseOrgId, setCourseOrgId] = useState<number | null>(null);
    const [orgCourses, setOrgCourses] = useState<OrgCourse[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setCreating(true);
        try {
            const org = await createOrganization({
                name: name.trim(),
                max_students: maxStudents,
                initial_manager_email: initialManagerEmail.trim() || undefined,
                school_year: schoolYear.trim() || undefined,
                semester: semester.trim() || undefined,
            });
            setOrganizations((prev) => [org, ...prev]);
            setName('');
            setMaxStudents(10);
            setInitialManagerEmail('');
            setSchoolYear('');
            setSemester('');
            setShowForm(false);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to create organization');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number, orgName: string) => {
        if (!confirm(`Delete organization "${orgName}"? All memberships and invite codes will be removed. User accounts will not be deleted.`)) return;
        try {
            await deleteOrganization(id);
            setOrganizations((prev) => prev.filter((o) => o.id !== id));
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to delete organization');
        }
    };

    const handleUpdate = async (id: number) => {
        try {
            const updated = await updateOrganization(id, {
                name: editName.trim() || undefined,
                max_students: editMaxStudents,
                school_year: editSchoolYear.trim(),
                semester: editSemester.trim(),
            });
            setOrganizations((prev) => prev.map((o) => (o.id === id ? updated : o)));
            setEditingId(null);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to update organization');
        }
    };

    const handleGenerateInvite = async (orgId: number) => {
        try {
            const code = await generateInviteCode(orgId, {
                email: inviteEmail.trim() || undefined,
                role: inviteRole,
            });
            const link = `${window.location.origin}/register?code=${code.code}`;
            setInviteResult(link);
            setInviteEmail('');
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to generate invite');
        }
    };

    const handleBulkInvite = async (orgId: number) => {
        const emails = bulkEmails
            .split(/[\n,;]+/)
            .map((e) => e.trim())
            .filter((e) => e.length > 0);
        if (emails.length === 0) return;
        setBulkSending(true);
        try {
            const results = await bulkGenerateInviteCodes(orgId, { emails, role: bulkRole });
            setBulkResult(`Sent ${results.length} invite(s) successfully.`);
            setBulkEmails('');
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to send bulk invites');
        } finally {
            setBulkSending(false);
        }
    };

    const handleOpenCourses = async (orgId: number) => {
        if (courseOrgId === orgId) {
            setCourseOrgId(null);
            return;
        }
        try {
            const oc = await getOrgCourses(orgId);
            setOrgCourses(oc);
            setCourseOrgId(orgId);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to load org courses');
        }
    };

    const handleAssignCourse = async (orgId: number) => {
        if (!selectedCourseId) return;
        try {
            const updated = await assignOrgCourses(orgId, [selectedCourseId]);
            setOrgCourses(updated);
            setSelectedCourseId(null);
            setOrganizations((prev) =>
                prev.map((o) => (o.id === orgId ? { ...o, course_count: updated.length } : o)),
            );
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to assign course');
        }
    };

    const handleRemoveCourse = async (orgId: number, courseId: number) => {
        try {
            await removeOrgCourse(orgId, courseId);
            const updated = orgCourses.filter((c) => c.id !== courseId);
            setOrgCourses(updated);
            setOrganizations((prev) =>
                prev.map((o) => (o.id === orgId ? { ...o, course_count: updated.length } : o)),
            );
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to remove course');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Organizations ({organizations.length})</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90"
                >
                    <PlusIcon className="h-4 w-4" /> New Organization
                </button>
            </div>

            {showForm && (
                <div className="bg-[var(--surface)] rounded-xl shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-semibold text-[var(--brand-foreground)] mb-4">Create Organization</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Organization name *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="px-3 py-2 bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                        />
                        <input
                            type="number"
                            min={1}
                            placeholder="Student seats *"
                            value={maxStudents}
                            onChange={(e) => setMaxStudents(parseInt(e.target.value) || 1)}
                            className="px-3 py-2 bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                        <input
                            type="email"
                            placeholder="Initial manager email (optional)"
                            value={initialManagerEmail}
                            onChange={(e) => setInitialManagerEmail(e.target.value)}
                            className="px-3 py-2 bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                        />
                        <input
                            type="text"
                            placeholder="School year (optional)"
                            value={schoolYear}
                            onChange={(e) => setSchoolYear(e.target.value)}
                            className="px-3 py-2 bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                        />
                        <input
                            type="text"
                            placeholder="Semester (optional)"
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="px-3 py-2 bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={creating || !name.trim()}
                            className="px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--surface-border)]">
                    <thead className="bg-[var(--comment-secondary-bg)]">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Name</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Seats</th>
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Members</th>
                            <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Term</th>
                            <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Courses</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-border)]">
                        {organizations.map((org) => (
                            <tr key={org.id}>
                                <td className="px-4 sm:px-6 py-4">
                                    {editingId === org.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="px-2 py-1 border border-[var(--input-border)] rounded text-sm w-full"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <BuildingOfficeIcon className="h-4 w-4 text-[var(--brand-muted)]" />
                                            <span className="text-sm font-medium text-[var(--brand-foreground)]">{org.name}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                    {editingId === org.id ? (
                                        <input
                                            type="number"
                                            min={1}
                                            value={editMaxStudents}
                                            onChange={(e) => setEditMaxStudents(parseInt(e.target.value) || 1)}
                                            className="px-2 py-1 border border-[var(--input-border)] rounded text-sm w-20"
                                        />
                                    ) : (
                                        `${org.member_count}/${org.max_students}`
                                    )}
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                    {org.member_count} students, {org.manager_count} managers
                                </td>
                                <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                    {editingId === org.id ? (
                                        <div className="flex flex-col gap-1">
                                            <input type="text" placeholder="School year" value={editSchoolYear}
                                                onChange={(e) => setEditSchoolYear(e.target.value)}
                                                className="px-2 py-1 border border-[var(--input-border)] rounded text-xs w-28" />
                                            <input type="text" placeholder="Semester" value={editSemester}
                                                onChange={(e) => setEditSemester(e.target.value)}
                                                className="px-2 py-1 border border-[var(--input-border)] rounded text-xs w-28" />
                                        </div>
                                    ) : (
                                        <span>{[org.school_year, org.semester].filter(Boolean).join(' / ') || '—'}</span>
                                    )}
                                </td>
                                <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                    <button
                                        onClick={() => handleOpenCourses(org.id)}
                                        className="text-[var(--brand-primary)] hover:underline text-xs"
                                    >
                                        {org.course_count} course{org.course_count !== 1 ? 's' : ''}
                                    </button>
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {editingId === org.id ? (
                                            <>
                                                <button
                                                    onClick={() => handleUpdate(org.id)}
                                                    className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-2 py-1 text-xs font-medium text-[var(--brand-muted)] bg-[var(--comment-secondary-bg)] rounded hover:bg-[var(--surface-border)]"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => { setInviteOrgId(inviteOrgId === org.id ? null : org.id); setInviteResult(null); setBulkResult(null); }}
                                                    className="p-1.5 text-green-600 hover:text-green-800 rounded hover:bg-green-50"
                                                    title="Invite members"
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(org.id);
                                                        setEditName(org.name);
                                                        setEditMaxStudents(org.max_students);
                                                        setEditSchoolYear(org.school_year || '');
                                                        setEditSemester(org.semester || '');
                                                    }}
                                                    className="p-1.5 text-[var(--brand-primary)] hover:opacity-90 rounded hover:bg-[var(--comment-secondary-bg)]"
                                                    title="Edit organization"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(org.id, org.name)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                    title="Delete organization"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Single invite panel */}
                                    {inviteOrgId === org.id && (
                                        <div className="mt-3 p-3 bg-[var(--comment-secondary-bg)] rounded-lg text-left space-y-4">
                                            <div className="flex flex-col gap-2">
                                                <p className="text-xs font-semibold text-[var(--brand-foreground)]">Single Invite</p>
                                                <input
                                                    type="email"
                                                    placeholder="Email (optional)"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    className="px-2 py-1 border border-[var(--input-border)] rounded text-sm"
                                                />
                                                <select
                                                    value={inviteRole}
                                                    onChange={(e) => setInviteRole(e.target.value as 'manager' | 'member')}
                                                    className="px-2 py-1 border border-[var(--input-border)] rounded text-sm"
                                                >
                                                    <option value="manager">Manager (Teacher)</option>
                                                    <option value="member">Student</option>
                                                </select>
                                                <button
                                                    onClick={() => handleGenerateInvite(org.id)}
                                                    className="px-3 py-1 text-xs font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded hover:opacity-90"
                                                >
                                                    Generate Invite
                                                </button>
                                                {inviteResult && (
                                                    <div className="text-xs">
                                                        <p className="text-green-600 font-medium mb-1">Invite link:</p>
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={inviteResult}
                                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                                            className="w-full px-2 py-1 border border-[var(--input-border)] rounded text-xs bg-[var(--surface)]"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <hr className="border-[var(--surface-border)]" />

                                            {/* Bulk invite panel */}
                                            <div className="flex flex-col gap-2">
                                                <p className="text-xs font-semibold text-[var(--brand-foreground)]">Bulk Invite</p>
                                                <textarea
                                                    placeholder="Paste emails (one per line, or comma/semicolon separated)"
                                                    value={bulkEmails}
                                                    onChange={(e) => setBulkEmails(e.target.value)}
                                                    rows={4}
                                                    className="px-2 py-1 border border-[var(--input-border)] rounded text-sm resize-y"
                                                />
                                                <select
                                                    value={bulkRole}
                                                    onChange={(e) => setBulkRole(e.target.value as 'manager' | 'member')}
                                                    className="px-2 py-1 border border-[var(--input-border)] rounded text-sm"
                                                >
                                                    <option value="member">Student</option>
                                                    <option value="manager">Manager (Teacher)</option>
                                                </select>
                                                <button
                                                    onClick={() => handleBulkInvite(org.id)}
                                                    disabled={bulkSending || !bulkEmails.trim()}
                                                    className="px-3 py-1 text-xs font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded hover:opacity-90 disabled:opacity-50"
                                                >
                                                    {bulkSending ? 'Sending...' : 'Send Bulk Invites'}
                                                </button>
                                                {bulkResult && (
                                                    <p className="text-xs text-green-600 font-medium">{bulkResult}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Course assignment panel */}
                                    {courseOrgId === org.id && (
                                        <div className="mt-3 p-3 bg-[var(--comment-secondary-bg)] rounded-lg text-left">
                                            <p className="text-xs font-semibold text-[var(--brand-foreground)] mb-2">Assigned Courses</p>
                                            {orgCourses.length > 0 ? (
                                                <ul className="space-y-1 mb-3">
                                                    {orgCourses.map((c) => (
                                                        <li key={c.id} className="flex items-center justify-between text-xs">
                                                            <span className="text-[var(--brand-foreground)]">{c.title}</span>
                                                            <button
                                                                onClick={() => handleRemoveCourse(org.id, c.id)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                Remove
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-[var(--brand-muted)] mb-3">No courses assigned.</p>
                                            )}
                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedCourseId ?? ''}
                                                    onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
                                                    className="flex-1 px-2 py-1 border border-[var(--input-border)] rounded text-xs"
                                                >
                                                    <option value="">Select a course...</option>
                                                    {courses
                                                        .filter((c) => !orgCourses.some((oc) => oc.id === c.id))
                                                        .map((c) => (
                                                            <option key={c.id} value={c.id}>{c.title}</option>
                                                        ))}
                                                </select>
                                                <button
                                                    onClick={() => handleAssignCourse(org.id)}
                                                    disabled={!selectedCourseId}
                                                    className="px-3 py-1 text-xs font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded hover:opacity-90 disabled:opacity-50"
                                                >
                                                    Assign
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {organizations.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--brand-muted)]">No organizations yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
