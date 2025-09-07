'use client';

import { useState } from 'react';
import { z } from 'zod';
import { sendContactMessage } from '@/app/lib/api-client';

const contactSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  contact: z.string().email({ message: 'Please enter a valid email address.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

export default function ContactFormComponent() {
  const [formData, setFormData] = useState({ name: '', contact: '', message: '' });
  const [errors, setErrors] = useState<z.ZodFormattedError<typeof formData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiMessage(null);

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error.format());
      return;
    }

    setErrors(null);
    setLoading(true);

    try {
      const response = await sendContactMessage(formData);
      setApiMessage({ text: response.message, type: 'success' });
      setFormData({ name: '', contact: '', message: '' }); // Clear form on success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setApiMessage({ text: `Failed to send message: ${message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="isolate bg-white px-6 py-12 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Contact Us</h2>
        <p className="mt-2 text-lg leading-8 text-gray-600">
          We'd love to hear from you. Send us a message and we'll get back to you as soon as possible.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="mx-auto mt-16 max-w-xl sm:mt-20">
        {apiMessage && (
          <div className={`mb-4 p-3 rounded-md text-white ${apiMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {apiMessage.text}
          </div>
        )}
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-semibold leading-6 text-gray-900">Full name</label>
            <div className="mt-2.5">
              <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className={`block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ${errors?.name ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`} />
              {errors?.name && <p className="text-xs text-red-500 mt-1">{errors.name._errors[0]}</p>}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="contact" className="block text-sm font-semibold leading-6 text-gray-900">Email</label>
            <div className="mt-2.5">
              <input type="email" name="contact" id="contact" value={formData.contact} onChange={handleChange} className={`block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ${errors?.contact ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`} />
              {errors?.contact && <p className="text-xs text-red-500 mt-1">{errors.contact._errors[0]}</p>}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="message" className="block text-sm font-semibold leading-6 text-gray-900">Message</label>
            <div className="mt-2.5">
              <textarea name="message" id="message" rows={4} value={formData.message} onChange={handleChange} className={`block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ${errors?.message ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`} />
              {errors?.message && <p className="text-xs text-red-500 mt-1">{errors.message._errors[0]}</p>}
            </div>
          </div>
        </div>
        <div className="mt-10">
          <button type="submit" disabled={loading} className="block w-full rounded-md bg-blue-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-400">
            {loading ? 'Sending...' : 'Let\'s talk'}
          </button>
        </div>
      </form>
    </div>
  );
}