import PageShell from '../ui/components/page-shell';
import ForgotPasswordComponent from '../ui/components/forgot-password';

export default function ForgotPasswordPage() {
  return (
    <PageShell
      title="Forgot password"
      subtitle="Enter your email and we will send a reset link if an account exists."
      maxWidthClass="max-w-lg"
    >
      <ForgotPasswordComponent />
    </PageShell>
  );
}
