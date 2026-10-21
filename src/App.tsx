import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useRouter, navigate } from '@/hooks/useRouter';
import { Layout } from '@/layouts/Layout';
import { HomePage } from '@/pages/HomePage';
import { AuthPage } from '@/pages/AuthPage';
import { ConfirmEmailPage } from '@/pages/ConfirmEmailPage';
import { DevicePage } from '@/pages/DevicePage';
import { SensitivityPage } from '@/pages/SensitivityPage';
import { FacePage } from '@/pages/FacePage';
import { PremiumPage } from '@/pages/PremiumPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { MessagesPage } from '@/pages/MessagesPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AdminPage } from '@/pages/AdminPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { Spinner } from '@/components/ui';
import { useEffect } from 'react';

function Router() {
  const route = useRouter();
  const { user, loading, isAdmin } = useAuth();

  // Redirect logged-in users away from login/signup
  useEffect(() => {
    if (!loading && user && (route.name === 'login' || route.name === 'signup')) {
      navigate('dashboard');
    }
  }, [user, loading, route.name]);

  // Admin route guard
  useEffect(() => {
    if (!loading && route.name === 'admin' && !isAdmin) {
      navigate('admin-login');
    }
  }, [route.name, isAdmin, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={32} label="Loading..." />
      </div>
    );
  }

  // Admin pages use their own chrome (no public nav)
  if (route.name === 'admin-login') return <AdminLoginPage />;

  const render = () => {
    switch (route.name) {
      case 'home': return <HomePage />;
      case 'sensitivity': return <SensitivityPage />;
      case 'device': return <DevicePage />;
      case 'face': return <FacePage />;
      case 'premium': return <PremiumPage />;
      case 'marketplace': return <MarketplacePage />;
      case 'messages': return user ? <MessagesPage /> : <AuthPage mode="login" />;
      case 'dashboard': return user ? <DashboardPage /> : <AuthPage mode="login" />;
      case 'profile': return user ? <ProfilePage /> : <AuthPage mode="login" />;
      case 'login': return <AuthPage mode="login" />;
      case 'signup': return <AuthPage mode="signup" />;
      case 'confirm-email': return <ConfirmEmailPage />;
      case 'admin': return isAdmin ? <AdminPage /> : <AdminLoginPage />;
      default: return <HomePage />;
    }
  };

  return <Layout current={route.name}>{render()}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
