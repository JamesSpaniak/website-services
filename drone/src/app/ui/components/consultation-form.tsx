'use client';

import { useState } from 'react';
import { z } from 'zod';
import { sendConsultationRequest } from '@/app/lib/api-client';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  organization: z.string().min(2, 'School or organization name is required.'),
  role: z.string().min(1, 'Please select your role.'),
  preferred_time: z.string().min(1, 'Please select a preferred time.'),
  topics: z.string().min(10, 'Please tell us a bit about what you\'d like to discuss.'),
});

type FormData = {
  name: string;
  email: string;
  organization: string;
  role: string;
  student_count: string;
  preferred_time: string;
  topics: string;
};

export default function ConsultationForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    organization: '',
    role: '',
    student_count: '',
    preferred_time: '',
    topics: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const result = schema.safeParse(formData);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) errs[err.path[0] as string] = err.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await sendConsultationRequest({
        name: formData.name,
        email: formData.email,
        organization: formData.organization,
        role: formData.role,
        student_count: formData.student_count || undefined,
        preferred_time: formData.preferred_time,
        topics: formData.topics,
      });
      setSuccess(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `block w-full border px-3 py-2.5 text-[#171717] bg-white placeholder:text-[#9ca3af] text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6b2f] ${
      errors[field] ? 'border-red-400' : 'border-[#d4d4d4]'
    }`;

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#4a6b2f]/10 mb-6">
          <svg className="h-7 w-7 text-[#4a6b2f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-display font-semibold text-[#171717] mb-3">
          Request received!
        </h3>
        <p className="text-sm text-[#525252] max-w-sm mx-auto leading-relaxed">
          We&apos;ll reach out within one business day to confirm a time. Check your inbox for a
          confirmation email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {apiError && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200" style={{ borderRadius: '2px' }}>
          {apiError}
        </div>
      )}

      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold tracking-wide text-[#525252] mb-1.5">
            Name
          </label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange}
            className={inputCls('name')} style={{ borderRadius: '2px' }} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold tracking-wide text-[#525252] mb-1.5">
            Email
          </label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange}
            className={inputCls('email')} style={{ borderRadius: '2px' }} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
      </div>

      {/* School + Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="organization" className="block text-xs font-semibold tracking-wide text-[#525252] mb-1.5">
            School / Organization
          </label>
          <input type="text" name="organization" id="organization" value={formData.organization}
            onChange={handleChange} className={inputCls('organization')} style={{ borderRadius: '2px' }} />
          {errors.organization && <p className="text-xs text-red-500 mt-1">{errors.organization}</p>}
        </div>
        <div>
          <label htmlFor="role" className="block text-xs font-semibold tracking-wide text-[#525252] mb-1.5">
            Your role
          </label>
          <select name="role" id="role" value={formData.role} onChange={handleChange}
            className={inputCls('role')} style={{ borderRadius: '2px' }}>
            <option value="">Select…</option>
            <option>Teacher</option>
            <option>Department Head</option>
            <option>CTE Director</option>
            <option>School Administrator</option>
            <option>District Coordinator</option>
            <option>Career Counselor</option>
            <option>Other</option>
          </select>
          {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
        </div>
      </div>

      {/* Students + Preferred time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="student_count" className="block text-xs font-semibold tracking-wide text-[#525252] mb-1.5">
            Estimated students <span className="font-normal text-[#9ca3af]">(optional)</span>
          </label>
          <select name="student_count" id="student_count" value={formData.student_count}
            onChange={handleChange} className={inputCls('student_count')} style={{ borderRadius: '2px' }}>
            <option value="">Select…</option>
            <option>1–15</option>
            <option>16–30</option>
            <option>31–60</option>
            <option>61–100</option>
            <option>100+</option>
          </select>
        </div>
        <div>
          <label htmlFor="preferred_time" className="block text-xs font-semibold tracking-wide text-[#525252] mb-1.5">
            Preferred call time
          </label>
          <select name="preferred_time" id="preferred_time" value={formData.preferred_time}
            onChange={handleChange} className={inputCls('preferred_time')} style={{ borderRadius: '2px' }}>
            <option value="">Select…</option>
            <option>Morning (9 am – 12 pm ET)</option>
            <option>Afternoon (12 pm – 5 pm ET)</option>
            <option>Evening (5 pm – 7 pm ET)</option>
            <option>Flexible — any time works</option>
          </select>
          {errors.preferred_time && <p className="text-xs text-red-500 mt-1">{errors.preferred_time}</p>}
        </div>
      </div>

      {/* Topics */}
      <div>
        <label htmlFor="topics" className="block text-xs font-semibold tracking-wide text-[#525252] mb-1.5">
          What would you like to discuss?
        </label>
        <textarea name="topics" id="topics" rows={5} value={formData.topics} onChange={handleChange}
          placeholder="Tell us about your program, what you're hoping to achieve, any questions you have…"
          className={inputCls('topics')} style={{ borderRadius: '2px' }} />
        {errors.topics && <p className="text-xs text-red-500 mt-1">{errors.topics}</p>}
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-[#4a6b2f] text-white text-sm font-semibold tracking-wide hover:bg-[#3b5526] disabled:opacity-50 transition-colors"
        style={{ borderRadius: '2px' }}>
        {loading ? 'Submitting…' : 'Request a Free Consultation'}
      </button>

      <p className="text-xs text-[#9ca3af] text-center">
        We&apos;ll confirm a specific time via email within one business day.
      </p>
    </form>
  );
}
