import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
    return (
        <div>
            <h1>Settings</h1>
            <p>Will have settings here in future to manage things about the account.</p>
        </div>
    )
}