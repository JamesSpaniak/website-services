import { Metadata } from 'next';
import ContactFormComponent from "../ui/components/contact-form";

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Drone Training Pro. Send us a message and we\'ll get back to you as soon as possible.',
  openGraph: {
    title: 'Contact — Drone Training Pro',
    description: 'Get in touch with Drone Training Pro. We\'d love to hear from you.',
  },
};

export default function ContactPage() {
  return (
    <div>
      <ContactFormComponent />
    </div>
  );
}
