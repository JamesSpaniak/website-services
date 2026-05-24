'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/app/ui/components/admin-guard';
import { ArticleFull } from '@/app/lib/types/article';
import { CourseData } from '@/app/lib/types/course';
import { getAllArticlesAdmin, getCourses, getCourseById, deleteArticle, deleteCourse, getOrganizations, createOrganization, updateOrganization, deleteOrganization, generateInviteCode, bulkGenerateInviteCodes, assignOrgCourses, removeOrgCourse, getOrgCourses, getAnalyticsOverview, getAnalyticsDaily } from '@/app/lib/api-client';
import ArticleEditor from '@/app/ui/components/article-editor';
import CourseEditor from '@/app/ui/components/course-editor';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { PlusIcon, PencilSquareIcon, TrashIcon, EyeIcon, EyeSlashIcon, BuildingOfficeIcon } from '@heroicons/react/24/solid';
import type { Organization, OrgCourse } from '@/app/lib/types/organization';
import type { OverviewStats, DailyMetric } from '@/app/lib/types/audit';
import PageShell from '@/app/ui/components/page-shell';
import { mergeCourseImages } from '@/app/lib/course-images';
import QuestionBankEditor from '@/app/ui/components/question-bank-editor';

type EditorState =
    | { type: 'none' }
    | { type: 'article'; article?: ArticleFull }
    | { type: 'course'; course?: CourseData; loading?: boolean };

export default function AdminPage() {
    return (
        <AdminGuard>
            <AdminDashboard />
        </AdminGuard>
    );
}

function AdminDashboard() {
    const [tab, setTab] = useState<'articles' | 'courses' | 'organizations' | 'analytics' | 'questions'>('articles');
    const [articles, setArticles] = useState<ArticleFull[]>([]);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editor, setEditor] = useState<EditorState>({ type: 'none' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [articlesData, coursesData, orgsData] = await Promise.all([
                getAllArticlesAdmin(),
                getCourses(),
                getOrganizations(),
            ]);
            setArticles(articlesData);
            setCourses(coursesData);
            setOrganizations(orgsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteArticle = async (id: number) => {
        if (!confirm('Are you sure you want to delete this article?')) return;
        try {
            await deleteArticle(id);
            setArticles(articles.filter(a => a.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete article');
        }
    };

    const handleDeleteCourse = async (id: number) => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        try {
            await deleteCourse(id);
            setCourses(courses.filter(c => c.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete course');
        }
    };

    const handleArticleSaved = (saved: ArticleFull) => {
        setArticles(prev => {
            const idx = prev.findIndex(a => a.id === saved.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
            }
            return [saved, ...prev];
        });
        setEditor({ type: 'none' });
    };

    const handleCourseSaved = (saved: CourseData) => {
        setCourses(prev => {
            const idx = prev.findIndex(c => c.id === saved.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = saved;
                return updated;
            }
            return [saved, ...prev];
        });
        setEditor({ type: 'none' });
    };

    /** List endpoint strips `sub_units` for each unit; load full payload for editing. */
    const openCourseEditor = async (courseListRow?: CourseData) => {
        if (!courseListRow?.id) {
            setEditor({ type: 'course', course: undefined, loading: false });
            return;
        }
        setEditor({ type: 'course', course: undefined, loading: true });
        setError(null);
        try {
            const full = await getCourseById(courseListRow.id);
            setEditor({ type: 'course', course: full, loading: false });
        } catch (err) {
            setEditor({ type: 'none' });
            setError(err instanceof Error ? err.message : 'Failed to load course');
        }
    };

    if (loading) return <LoadingComponent />;

    if (editor.type === 'article') {
        return (
            <PageShell maxWidthClass="max-w-7xl">
                <ArticleEditor
                    article={editor.article}
                    onSave={handleArticleSaved}
                    onCancel={() => setEditor({ type: 'none' })}
                />
            </PageShell>
        );
    }

    if (editor.type === 'course') {
        if (editor.loading) {
            return (
                <PageShell maxWidthClass="max-w-7xl">
                    <LoadingComponent />
                </PageShell>
            );
        }
        return (
            <PageShell maxWidthClass="max-w-7xl">
                <CourseEditor
                    course={editor.course}
                    onSave={handleCourseSaved}
                    onCancel={() => setEditor({ type: 'none' })}
                />
            </PageShell>
        );
    }

    return (
        <PageShell
            title="Admin Dashboard"
            subtitle="Manage articles, courses, organizations, and analytics."
            maxWidthClass="max-w-7xl"
        >
            {error && <ErrorComponent message={error} />}

            <div className="mb-6">
                <div className="border-b border-[var(--surface-border)]">
                    <nav className="-mb-px flex gap-6 flex-wrap">
                        <button onClick={() => setTab('articles')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === 'articles'
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] hover:border-[var(--surface-border)]'
                            }`}>
                            Articles ({articles.length})
                        </button>
                        <button onClick={() => setTab('courses')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === 'courses'
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] hover:border-[var(--surface-border)]'
                            }`}>
                            Courses ({courses.length})
                        </button>
                        <button onClick={() => setTab('organizations')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === 'organizations'
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] hover:border-[var(--surface-border)]'
                            }`}>
                            Organizations ({organizations.length})
                        </button>
                        <button onClick={() => setTab('analytics')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === 'analytics'
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] hover:border-[var(--surface-border)]'
                            }`}>
                            Analytics
                        </button>
                        <button onClick={() => setTab('questions')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === 'questions'
                                    ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                    : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] hover:border-[var(--surface-border)]'
                            }`}>
                            Question Bank
                        </button>
                    </nav>
                </div>
            </div>

            {tab === 'articles' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Articles</h2>
                        <button onClick={() => setEditor({ type: 'article' })}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90">
                            <PlusIcon className="h-4 w-4" /> New Article
                        </button>
                    </div>

                    <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--surface-border)]">
                            <thead className="bg-[var(--comment-secondary-bg)]">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Title</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Status</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Media</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Date</th>
                                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--surface-border)]">
                                {articles.map((article) => (
                                    <tr key={article.id} className="hover:bg-[var(--comment-secondary-bg)]">
                                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-[var(--brand-foreground)] max-w-[200px] truncate">{article.title}</td>
                                        <td className="px-4 sm:px-6 py-4 text-sm whitespace-nowrap">
                                            {article.hidden ? (
                                                <span className="inline-flex items-center gap-1 text-yellow-600"><EyeSlashIcon className="h-4 w-4" /> Hidden</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-green-600"><EyeIcon className="h-4 w-4" /> Published</span>
                                            )}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                            {article.image_url ? 'Has image' : ''}
                                            {article.content_blocks?.length ? ` | ${article.content_blocks.length} blocks` : ''}
                                        </td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] whitespace-nowrap">
                                            {new Date(article.submitted_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setEditor({ type: 'article', article })}
                                                    className="p-1.5 text-[var(--brand-primary)] hover:opacity-90 rounded hover:bg-[var(--comment-secondary-bg)]"
                                                    aria-label={`Edit ${article.title}`}>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteArticle(article.id)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                    aria-label={`Delete ${article.title}`}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {articles.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--brand-muted)]">No articles yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'courses' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Courses</h2>
                        <button onClick={() => openCourseEditor()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90">
                            <PlusIcon className="h-4 w-4" /> New Course
                        </button>
                    </div>

                    <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--surface-border)]">
                            <thead className="bg-[var(--comment-secondary-bg)]">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Title</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Price</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Units</th>
                                    <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Media</th>
                                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--surface-border)]">
                                {courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-[var(--comment-secondary-bg)]">
                                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-[var(--brand-foreground)] max-w-[200px] truncate">{course.title}</td>
                                        <td className="px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] whitespace-nowrap">{course.price > 0 ? `$${course.price}` : 'Free'}</td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">{course.units?.length || 0}</td>
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                            {mergeCourseImages(course).length ? 'Image' : ''}
                                            {course.video_url ? ' Video' : ''}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openCourseEditor(course)}
                                                    className="p-1.5 text-[var(--brand-primary)] hover:opacity-90 rounded hover:bg-[var(--comment-secondary-bg)]"
                                                    aria-label={`Edit ${course.title}`}>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteCourse(course.id)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                    aria-label={`Delete ${course.title}`}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {courses.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--brand-muted)]">No courses yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'organizations' && (
                <OrganizationsTab
                    organizations={organizations}
                    setOrganizations={setOrganizations}
                    courses={courses}
                    onError={setError}
                />
            )}

            {tab === 'analytics' && <AnalyticsTab />}

            {tab === 'questions' && (
                <div>
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Question Bank</h2>
                        <p className="text-sm text-[var(--brand-muted)] mt-1">
                            Manage questions for each course. Questions are drawn from this bank when generating practice exams.
                        </p>
                    </div>
                    {courses.length === 0 ? (
                        <p className="text-sm text-[var(--brand-muted)]">No courses available. Create a course first.</p>
                    ) : (
                        <QuestionBankEditor courses={courses} />
                    )}
                </div>
            )}
        </PageShell>
    );
}

// ── Organizations Tab (Admin) ──

function OrganizationsTab({
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
                <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Organizations</h2>
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

// ── Analytics Tab ──

const CHART_ACTIONS = ['LOGIN', 'REGISTER', 'COURSE_STARTED', 'COURSE_COMPLETED', 'EXAM_SUBMITTED', 'COURSE_PURCHASED'] as const;
const ACTION_COLORS: Record<string, string> = {
    LOGIN: '#6366f1',
    REGISTER: '#10b981',
    COURSE_STARTED: '#3b82f6',
    COURSE_COMPLETED: '#059669',
    EXAM_SUBMITTED: '#8b5cf6',
    COURSE_PURCHASED: '#f59e0b',
};

function AnalyticsTab() {
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [daily, setDaily] = useState<DailyMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [o, d] = await Promise.all([getAnalyticsOverview(), getAnalyticsDaily(days)]);
                setOverview(o);
                setDaily(d);
            } catch { /* empty */ }
            finally { setLoading(false); }
        })();
    }, [days]);

    if (loading) return <LoadingComponent />;
    if (!overview) return <ErrorComponent message="Failed to load analytics." />;

    const statCards: { label: string; value: number | string; sub?: string }[] = [
        { label: 'Total Signups', value: overview.total_signups, sub: `${overview.signups_7d} this week` },
        { label: 'Daily Active Users', value: overview.dau },
        { label: 'Weekly Active Users', value: overview.wau },
        { label: 'Monthly Active Users', value: overview.mau },
        { label: 'Courses Started', value: overview.total_course_starts },
        { label: 'Courses Completed', value: overview.total_course_completions },
        { label: 'Exams Submitted', value: overview.total_exams_submitted },
        { label: 'Purchases', value: overview.total_purchases },
    ];

    const dateSet = new Set<string>();
    for (const d of daily) dateSet.add(d.date);
    const dates = Array.from(dateSet).sort();

    const dailyByAction = new Map<string, Map<string, number>>();
    for (const d of daily) {
        if (!dailyByAction.has(d.action)) dailyByAction.set(d.action, new Map());
        dailyByAction.get(d.action)!.set(d.date, d.count);
    }

    const maxCount = Math.max(1, ...daily.map((d) => d.count));

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {statCards.map((s) => (
                    <div key={s.label} className="bg-[var(--surface)] rounded-xl shadow-sm p-4 sm:p-5">
                        <p className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">{s.label}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--brand-foreground)]">{s.value}</p>
                        {s.sub && <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{s.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="bg-[var(--surface)] rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--brand-foreground)]">Daily Activity</h3>
                    <select
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="text-xs border border-[var(--input-border)] rounded-md px-2 py-1"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>

                {dates.length === 0 ? (
                    <p className="text-sm text-[var(--brand-muted)] text-center py-8">No activity data for this period.</p>
                ) : (
                    <div>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {CHART_ACTIONS.map((a) => (
                                <span key={a} className="flex items-center gap-1.5 text-xs text-[var(--brand-muted)]">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACTION_COLORS[a] }} />
                                    {a.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>

                        <div className="overflow-x-auto">
                            <div className="flex items-end gap-px" style={{ minWidth: dates.length * 24, height: 200 }}>
                                {dates.map((date) => {
                                    const segments = CHART_ACTIONS.map((action) => ({
                                        action,
                                        count: dailyByAction.get(action)?.get(date) || 0,
                                    })).filter((s) => s.count > 0);

                                    const total = segments.reduce((s, seg) => s + seg.count, 0);
                                    const barHeight = Math.max(2, (total / maxCount) * 180);

                                    return (
                                        <div key={date} className="flex-1 flex flex-col items-center min-w-[20px] group relative">
                                            <div className="w-full flex flex-col justify-end" style={{ height: 180 }}>
                                                <div className="w-full rounded-t" style={{ height: barHeight }}>
                                                    {segments.map((seg, i) => {
                                                        const segHeight = (seg.count / total) * barHeight;
                                                        return (
                                                            <div
                                                                key={seg.action}
                                                                style={{
                                                                    height: segHeight,
                                                                    backgroundColor: ACTION_COLORS[seg.action],
                                                                    borderRadius: i === 0 ? '4px 4px 0 0' : undefined,
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <span className="text-[9px] text-[var(--brand-muted)] mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                                                {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>

                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--brand-foreground)] text-[var(--background)] text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
                                                <p className="font-semibold mb-1">{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                {segments.map((seg) => (
                                                    <p key={seg.action}>{seg.action.replace(/_/g, ' ')}: {seg.count}</p>
                                                ))}
                                                {segments.length === 0 && <p>No activity</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
