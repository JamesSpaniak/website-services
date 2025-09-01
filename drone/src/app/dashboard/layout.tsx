import HeaderComponent from '@/app/ui/components/header';
import { AuthProvider } from '@/app/lib/auth-context';
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex flex-col">
        <div>
          <HeaderComponent />
        </div>
        <div className="flex-grow p-6 md:overflow-y-auto md:p-12">{children}</div>
      </div>
    </AuthProvider>
  );
}
