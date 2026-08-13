'use client';

import { useEffect, useMemo, useState } from 'react';
import { CourseData } from '@/app/lib/types/course';
import type {
    AdminUserRow,
    AdminUserCourse,
    SignupLinkRow,
    CourseAccessSource,
} from '@/app/lib/types/admin-users';
import {
    getCourses,
    getUsersAdmin,
    grantUserCourse,
    revokeUserCourse,
    deleteUserAdmin,
    adminSendPasswordReset,
    adminResendVerification,
    getSignupLinks,
    createSignupLink,
    deleteSignupLink,
} from '@/app/lib/api-client';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import {
    PlusIcon,
    TrashIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ClipboardDocumentIcon,
    EnvelopeIcon,
    KeyIcon,
    LinkIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/solid';

const SOURCE_LABELS: Record<CourseAccessSource, { label: string; className: string }> = {
    purchase: { label: 'Purchased', className: 'bg-emerald-500/15 text-emerald-600' },
    admin_grant: { label: 'Gift', className: 'bg-violet-500/15 text-violet-600' },
    signup_link: { label: 'Promo link', className: 'bg-sky-500/15 text-sky-600' },
};

function SourceBadge({ source }: { source: CourseAccessSource }) {
    const meta = SOURCE_LABELS[source] ?? SOURCE_LABELS.purchase;
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.className}`}>
            {meta.label}
        </span>
    );
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [links, setLinks] = useState<SignupLinkRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [usersData, coursesData, linksData] = await Promise.all([
                    getUsersAdmin(),
                    getCourses(),
                    getSignupLinks(),
                ]);
                setUsers(usersData);
                setCourses(coursesData);
                setLinks(linksData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load users');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const refreshUsers = async () => setUsers(await getUsersAdmin());

    if (loading) return <LoadingComponent />;

    return (
        <div className="space-y-10">
            {error && <ErrorComponent message={error} />}
            {notice && (
                <div className="flex items-center gap-2 p-3 rounded-md border border-[var(--surface-border)] bg-[var(--comment-secondary-bg)] text-sm text-[var(--brand-foreground)]">
                    <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                    {notice}
                </div>
            )}
            <UsersPanel
                users={users}
                courses={courses}
                onError={setError}
                onNotice={setNotice}
                refreshUsers={refreshUsers}
            />
            <SignupLinksPanel
                links={links}
                setLinks={setLinks}
                courses={courses}
                onError={setError}
                onNotice={setNotice}
            />
        </div>
    );
}

// ── Users table ──────────────────────────────────────────────────────────────

function UsersPanel({
    users,
    courses,
    onError,
    onNotice,
    refreshUsers,
}: {
    users: AdminUserRow[];
    courses: CourseData[];
    onError: (msg: string | null) => void;
    onNotice: (msg: string | null) => void;
    refreshUsers: () => Promise<void>;
}) {
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) =>
                u.username.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(q) ||
                (u.organization?.name.toLowerCase().includes(q) ?? false),
        );
    }, [users, search]);

    const run = async (action: () => Promise<void>, successMessage: string) => {
        setBusy(true);
        onError(null);
        onNotice(null);
        try {
            await action();
            onNotice(successMessage);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Users ({users.length})</h2>
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search username, email, name, org..."
                    className="w-72 max-w-full px-3 py-2 text-sm rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--surface-border)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-[var(--brand-muted)] border-b border-[var(--surface-border)] bg-[var(--surface)]">
                            <th className="px-4 py-3 w-8" />
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Organization</th>
                            <th className="px-4 py-3">Courses</th>
                            <th className="px-4 py-3">Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((u) => (
                            <UserRow
                                key={u.id}
                                user={u}
                                courses={courses}
                                expanded={expandedId === u.id}
                                onToggle={() => setExpandedId(expandedId === u.id ? null : u.id)}
                                busy={busy}
                                run={run}
                                refreshUsers={refreshUsers}
                            />
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-[var(--brand-muted)]">
                                    No users match your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function UserRow({
    user,
    courses,
    expanded,
    onToggle,
    busy,
    run,
    refreshUsers,
}: {
    user: AdminUserRow;
    courses: CourseData[];
    expanded: boolean;
    onToggle: () => void;
    busy: boolean;
    run: (action: () => Promise<void>, successMessage: string) => Promise<void>;
    refreshUsers: () => Promise<void>;
}) {
    const [grantCourseId, setGrantCourseId] = useState<number | ''>('');

    const grantableCourses = courses.filter((c) => !user.courses.some((uc) => uc.id === c.id));
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');

    const handleGrant = () => {
        if (grantCourseId === '') return;
        const course = courses.find((c) => c.id === grantCourseId);
        run(async () => {
            await grantUserCourse(user.id, grantCourseId as number);
            await refreshUsers();
            setGrantCourseId('');
        }, `Granted "${course?.title ?? 'course'}" to ${user.username}.`);
    };

    const handleRevoke = (course: AdminUserCourse) => {
        if (!confirm(`Revoke "${course.title}" from ${user.username}?`)) return;
        run(async () => {
            await revokeUserCourse(user.id, course.id);
            await refreshUsers();
        }, `Revoked "${course.title}" from ${user.username}.`);
    };

    const handleDelete = () => {
        if (
            !confirm(
                `Delete account "${user.username}" (${user.email})? This permanently removes their progress, exam attempts, and comments.`,
            )
        )
            return;
        run(async () => {
            await deleteUserAdmin(user.id);
            await refreshUsers();
        }, `Deleted account "${user.username}".`);
    };

    return (
        <>
            <tr
                className="border-b border-[var(--surface-border)] hover:bg-[var(--surface)] cursor-pointer"
                onClick={onToggle}
            >
                <td className="px-4 py-3 text-[var(--brand-muted)]">
                    {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                </td>
                <td className="px-4 py-3">
                    <div className="font-medium text-[var(--brand-foreground)]">{user.username}</div>
                    {name && <div className="text-xs text-[var(--brand-muted)]">{name}</div>}
                </td>
                <td className="px-4 py-3">
                    <span className="text-[var(--brand-foreground)]">{user.email}</span>
                    {!user.is_email_verified && (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600">
                            Unverified
                        </span>
                    )}
                </td>
                <td className="px-4 py-3 capitalize text-[var(--brand-foreground)]">{user.role}</td>
                <td className="px-4 py-3 text-[var(--brand-muted)]">{user.organization?.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--brand-foreground)]">{user.courses.length}</td>
                <td className="px-4 py-3 text-[var(--brand-muted)]">
                    {user.submitted_at ? new Date(user.submitted_at).toLocaleDateString() : '—'}
                </td>
            </tr>
            {expanded && (
                <tr className="border-b border-[var(--surface-border)] bg-[var(--surface)]/60">
                    <td colSpan={7} className="px-6 py-4">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--brand-foreground)] mb-2">
                                    Course access
                                </h4>
                                {user.courses.length === 0 ? (
                                    <p className="text-sm text-[var(--brand-muted)]">No course access.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {user.courses.map((c) => (
                                            <li key={c.id} className="flex items-center gap-3 text-sm">
                                                <span className="text-[var(--brand-foreground)]">{c.title}</span>
                                                <SourceBadge source={c.source} />
                                                {c.granted_by_username && (
                                                    <span className="text-xs text-[var(--brand-muted)]">
                                                        by {c.granted_by_username}
                                                    </span>
                                                )}
                                                {c.granted_at && (
                                                    <span className="text-xs text-[var(--brand-muted)]">
                                                        {new Date(c.granted_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleRevoke(c)}
                                                    disabled={busy}
                                                    className="ml-auto text-red-500 hover:text-red-600 disabled:opacity-40"
                                                    title="Revoke access"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {grantableCourses.length > 0 && (
                                    <div className="flex items-center gap-2 mt-3">
                                        <select
                                            value={grantCourseId}
                                            onChange={(e) =>
                                                setGrantCourseId(e.target.value === '' ? '' : Number(e.target.value))
                                            }
                                            className="px-2 py-1.5 text-sm rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)]"
                                        >
                                            <option value="">Gift a course…</option>
                                            {grantableCourses.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.title}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleGrant}
                                            disabled={busy || grantCourseId === ''}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-md bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90 disabled:opacity-40"
                                        >
                                            <PlusIcon className="h-4 w-4" /> Grant
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-[var(--brand-foreground)] mb-2">Account actions</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() =>
                                            run(async () => {
                                                await adminSendPasswordReset(user.id);
                                            }, `Password reset link sent to ${user.email}.`)
                                        }
                                        disabled={busy}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)] disabled:opacity-40"
                                    >
                                        <KeyIcon className="h-4 w-4" /> Send password reset
                                    </button>
                                    {!user.is_email_verified && (
                                        <button
                                            onClick={() =>
                                                run(async () => {
                                                    await adminResendVerification(user.id);
                                                }, `Verification email resent to ${user.email}.`)
                                            }
                                            disabled={busy}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--surface)] disabled:opacity-40"
                                        >
                                            <EnvelopeIcon className="h-4 w-4" /> Resend verification
                                        </button>
                                    )}
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={handleDelete}
                                            disabled={busy}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                                        >
                                            <TrashIcon className="h-4 w-4" /> Delete account
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ── Signup links ─────────────────────────────────────────────────────────────

function SignupLinksPanel({
    links,
    setLinks,
    courses,
    onError,
    onNotice,
}: {
    links: SignupLinkRow[];
    setLinks: React.Dispatch<React.SetStateAction<SignupLinkRow[]>>;
    courses: CourseData[];
    onError: (msg: string | null) => void;
    onNotice: (msg: string | null) => void;
}) {
    const [showForm, setShowForm] = useState(false);
    const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
    const [email, setEmail] = useState('');
    const [note, setNote] = useState('');
    const [expiresInDays, setExpiresInDays] = useState(30);
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const registerUrl = (code: string) =>
        `${typeof window !== 'undefined' ? window.location.origin : ''}/register?signup=${code}`;

    const toggleCourse = (id: number) =>
        setSelectedCourseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const handleCreate = async () => {
        if (selectedCourseIds.length === 0) return;
        setCreating(true);
        onError(null);
        onNotice(null);
        try {
            const link = await createSignupLink({
                course_ids: selectedCourseIds,
                email: email.trim() || undefined,
                note: note.trim() || undefined,
                expires_in_days: expiresInDays,
            });
            setLinks((prev) => [link, ...prev]);
            setSelectedCourseIds([]);
            setEmail('');
            setNote('');
            setExpiresInDays(30);
            setShowForm(false);
            onNotice(
                link.email
                    ? `Signup link created and emailed to ${link.email}.`
                    : 'Signup link created — copy it from the table below.',
            );
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to create signup link');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (link: SignupLinkRow) => {
        if (!confirm(`Delete signup link ${link.code}? Anyone holding the link will no longer be able to use it.`)) return;
        onError(null);
        try {
            await deleteSignupLink(link.id);
            setLinks((prev) => prev.filter((l) => l.id !== link.id));
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to delete signup link');
        }
    };

    const handleCopy = async (link: SignupLinkRow) => {
        await navigator.clipboard.writeText(registerUrl(link.code));
        setCopiedId(link.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const statusBadge = (status: SignupLinkRow['status']) => {
        const map = {
            active: 'bg-emerald-500/15 text-emerald-600',
            used: 'bg-sky-500/15 text-sky-600',
            expired: 'bg-zinc-500/15 text-zinc-500',
        } as const;
        return (
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${map[status]}`}>
                {status}
            </span>
        );
    };

    return (
        <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <h2 className="text-lg font-bold text-[var(--brand-foreground)]">Signup links ({links.length})</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-md bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90"
                >
                    <PlusIcon className="h-4 w-4" /> New signup link
                </button>
            </div>
            <p className="text-sm text-[var(--brand-muted)] mb-4">
                One-time links that grant course access on registration — for promos, gifts, and partners. Recipients
                register through the link and access is applied automatically.
            </p>

            {showForm && (
                <div className="mb-6 p-4 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--brand-foreground)] mb-2">
                            Courses included
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {courses.map((c) => (
                                <label key={c.id} className="flex items-center gap-2 text-sm text-[var(--brand-foreground)]">
                                    <input
                                        type="checkbox"
                                        checked={selectedCourseIds.includes(c.id)}
                                        onChange={() => toggleCourse(c.id)}
                                    />
                                    {c.title}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)] mb-1">
                                Email (optional)
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Lock to an email & send it"
                                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)] mb-1">
                                Note (optional)
                            </label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder='e.g. "Instagram June promo"'
                                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)] mb-1">
                                Expires in (days)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={365}
                                value={expiresInDays}
                                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)]"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={creating || selectedCourseIds.length === 0}
                        className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--brand-primary)] text-[var(--background)] hover:opacity-90 disabled:opacity-40"
                    >
                        {creating ? 'Creating…' : 'Create link'}
                    </button>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-[var(--surface-border)]">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-[var(--brand-muted)] border-b border-[var(--surface-border)] bg-[var(--surface)]">
                            <th className="px-4 py-3">Link</th>
                            <th className="px-4 py-3">Courses</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Note</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Redeemed by</th>
                            <th className="px-4 py-3">Expires</th>
                            <th className="px-4 py-3 w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {links.map((link) => (
                            <tr key={link.id} className="border-b border-[var(--surface-border)]">
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleCopy(link)}
                                        className="flex items-center gap-1.5 text-[var(--brand-primary)] hover:opacity-90 font-mono text-xs"
                                        title="Copy registration link"
                                    >
                                        {copiedId === link.id ? (
                                            <>
                                                <CheckCircleIcon className="h-4 w-4" /> Copied!
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardDocumentIcon className="h-4 w-4" /> {link.code}
                                            </>
                                        )}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-[var(--brand-foreground)]">
                                    {link.courses.map((c) => c.title).join(', ') || '—'}
                                </td>
                                <td className="px-4 py-3 text-[var(--brand-muted)]">{link.email ?? '—'}</td>
                                <td className="px-4 py-3 text-[var(--brand-muted)]">{link.note ?? '—'}</td>
                                <td className="px-4 py-3">{statusBadge(link.status)}</td>
                                <td className="px-4 py-3 text-[var(--brand-muted)]">
                                    {link.used_by_username
                                        ? `${link.used_by_username}${link.used_at ? ` · ${new Date(link.used_at).toLocaleDateString()}` : ''}`
                                        : '—'}
                                </td>
                                <td className="px-4 py-3 text-[var(--brand-muted)]">
                                    {new Date(link.expires_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    {link.use_count === 0 && (
                                        <button
                                            onClick={() => handleDelete(link)}
                                            className="text-red-500 hover:text-red-600"
                                            title="Delete link"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {links.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-[var(--brand-muted)]">
                                    <LinkIcon className="h-5 w-5 mx-auto mb-2 opacity-50" />
                                    No signup links yet — create one to gift course access.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
