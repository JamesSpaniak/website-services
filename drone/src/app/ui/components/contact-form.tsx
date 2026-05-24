'use client';

import { useState } from 'react';
import { z } from 'zod';
import { sendContactMessage } from '@/app/lib/api-client';

type Role = 'individual' | 'educator' | 'organization';

const baseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  contact: z.string().email('Please enter a valid email address.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

function buildMessage(role: Role, extras: Record<string, string>, message: string): string {
  if (role === 'educator') {
    const parts = [`[Educator Inquiry]`];
    if (extras.school) parts.push(`School/Institution: ${extras.school}`);
    if (extras.eduRole) parts.push(`Role: ${extras.eduRole}`);
    parts.push('', message);
    return parts.join('\n');
  }
  if (role === 'organization') {
    const parts = [`[Organization Inquiry]`];
    if (extras.orgName) parts.push(`Organization: ${extras.orgName}`);
    if (extras.orgSize) parts.push(`Size: ${extras.orgSize}`);
    parts.push('', message);
    return parts.join('\n');
  }
  return message;
}

export default function ContactFormComponent() {
  const [role, setRole] = useState<Role>('individual');
  const [formData, setFormData] = useState({ name: '', contact: '', message: '' });
  const [extras, setExtras] = useState({ school: '', eduRole: '', orgName: '', orgSize: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleExtras = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setExtras({ ...extras, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiMessage(null);
    const newErrors: Record<string, string> = {};

    const result = baseSchema.safeParse(formData);
    if (!result.success) {
      result.error.issues.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
    }
    if (role === 'educator' && !extras.school.trim()) newErrors.school = 'School name is required.';
    if (role === 'organization' && !extras.orgName.trim()) newErrors.orgName = 'Organization name is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const composedMessage = buildMessage(role, extras, formData.message);
      const response = await sendContactMessage({ ...formData, message: composedMessage });
      setApiMessage({ text: response.message, type: 'success' });
      setFormData({ name: '', contact: '', message: '' });
      setExtras({ school: '', eduRole: '', orgName: '', orgSize: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setApiMessage({ text: `Failed to send message: ${message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `block w-full bg-[var(--surface)] border px-3 py-2 text-[var(--brand-foreground)] placeholder:text-[var(--brand-muted)] sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${errors[field] ? 'border-red-400' : 'border-[var(--surface-border)]'}`;

  const tabCls = (t: Role) =>
    `px-4 py-2 text-xs font-semibold tracking-wide border-b-2 transition-colors cursor-pointer ${
      role === t
        ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
        : 'border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]'
    }`;

  const roleLabels: Record<Role, string> = {
    individual: 'Individual',
    educator: 'Educator / School',
    organization: 'Organization',
  };

  return (
    <div>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
          Get in touch
        </h2>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          We read every message and respond within 48 hours.
        </p>
      </div>

      {/* Role tabs */}
      <div className="mt-8 flex border-b border-[var(--surface-border)] -mb-px">
        {(['individual', 'educator', 'organization'] as Role[]).map((t) => (
          <button key={t} type="button" onClick={() => { setRole(t); setErrors({}); setApiMessage(null); }}
            className={tabCls(t)}>
            {roleLabels[t]}
          </button>
        ))}
      </div>

      {/* Role context hint */}
      <p className="mt-4 text-xs text-[var(--brand-muted)]">
        {role === 'individual' && 'Questions about a course, your account, or the material.'}
        {role === 'educator' && 'Questions about bringing Drone Edge into your classroom or CTE program.'}
        {role === 'organization' && 'Questions about org accounts, bulk access, or enterprise use.'}
      </p>

      {apiMessage && (
        <div
          className={`mt-4 p-3 text-sm ${apiMessage.type === 'success' ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/40' : 'bg-red-400/10 text-red-400 border border-red-400/50'}`}
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {apiMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-5">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-xs font-medium tracking-wide text-[var(--brand-muted)] mb-1.5">
            Name
          </label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange}
            className={inputClass('name')} style={{ borderRadius: 'var(--radius-sm)' }} />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contact" className="block text-xs font-medium tracking-wide text-[var(--brand-muted)] mb-1.5">
            Email
          </label>
          <input type="email" name="contact" id="contact" value={formData.contact} onChange={handleChange}
            className={inputClass('contact')} style={{ borderRadius: 'var(--radius-sm)' }} />
          {errors.contact && <p className="text-xs text-red-400 mt-1">{errors.contact}</p>}
        </div>

        {/* Educator-specific fields */}
        {role === 'educator' && (
          <>
            <div>
              <label htmlFor="school" className="block text-xs font-medium tracking-wide text-[var(--brand-muted)] mb-1.5">
                School / Institution
              </label>
              <input type="text" name="school" id="school" value={extras.school} onChange={handleExtras}
                className={inputClass('school')} style={{ borderRadius: 'var(--radius-sm)' }} />
              {errors.school && <p className="text-xs text-red-400 mt-1">{errors.school}</p>}
            </div>
            <div>
              <label htmlFor="eduRole" className="block text-xs font-medium tracking-wide text-[var(--brand-muted)] mb-1.5">
                Your role <span className="text-[var(--brand-muted)] font-normal">(optional)</span>
              </label>
              <select name="eduRole" id="eduRole" value={extras.eduRole} onChange={handleExtras}
                className={inputClass('eduRole')} style={{ borderRadius: 'var(--radius-sm)' }}>
                <option value="">Select…</option>
                <option>Teacher</option>
                <option>Department Head</option>
                <option>CTE Director</option>
                <option>School Administrator</option>
                <option>District Coordinator</option>
                <option>Other</option>
              </select>
            </div>
          </>
        )}

        {/* Organization-specific fields */}
        {role === 'organization' && (
          <>
            <div>
              <label htmlFor="orgName" className="block text-xs font-medium tracking-wide text-[var(--brand-muted)] mb-1.5">
                Organization name
              </label>
              <input type="text" name="orgName" id="orgName" value={extras.orgName} onChange={handleExtras}
                className={inputClass('orgName')} style={{ borderRadius: 'var(--radius-sm)' }} />
              {errors.orgName && <p className="text-xs text-red-400 mt-1">{errors.orgName}</p>}
            </div>
            <div>
              <label htmlFor="orgSize" className="block text-xs font-medium tracking-wide text-[var(--brand-muted)] mb-1.5">
                Estimated users <span className="text-[var(--brand-muted)] font-normal">(optional)</span>
              </label>
              <select name="orgSize" id="orgSize" value={extras.orgSize} onChange={handleExtras}
                className={inputClass('orgSize')} style={{ borderRadius: 'var(--radius-sm)' }}>
                <option value="">Select…</option>
                <option>1–10</option>
                <option>11–30</option>
                <option>31–100</option>
                <option>100+</option>
              </select>
            </div>
          </>
        )}

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-xs font-medium tracking-wide text-[var(--brand-muted)] mb-1.5">
            Message
          </label>
          <textarea name="message" id="message" rows={5} value={formData.message} onChange={handleChange}
            placeholder={
              role === 'educator'
                ? 'Tell us about your program, class size, or timeline…'
                : role === 'organization'
                ? 'Tell us about your use case and what you need…'
                : 'What can we help you with?'
            }
            className={inputClass('message')} style={{ borderRadius: 'var(--radius-sm)' }} />
          {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message}</p>}
        </div>

        <div className="pt-2">
          <button type="submit" disabled={loading}
            className="block w-full bg-[var(--brand-primary)] text-[var(--brand-black)] font-medium text-sm tracking-wide py-2.5 hover:opacity-90 disabled:opacity-50 transition-opacity ring-focus"
            style={{ borderRadius: 'var(--radius-sm)' }}>
            {loading ? 'Sending…' : 'Send message'}
          </button>
        </div>

        {role === 'educator' && (
          <p className="text-xs text-[var(--brand-muted)] text-center -mt-1">
            Looking to book a call instead?{' '}
            <a href="/consultation" className="text-[var(--brand-primary)] hover:opacity-80">
              Free consultation →
            </a>
          </p>
        )}
      </form>
    </div>
  );
}
