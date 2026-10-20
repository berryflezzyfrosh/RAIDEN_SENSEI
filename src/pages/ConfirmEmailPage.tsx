
import { useEffect, useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, LoaderCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { navigate } from '@/hooks/useRouter';
import { supabase } from '@/lib/supabase';

export function ConfirmEmailPage() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Verifying your email confirmation...');

  useEffect(() => {
    let active = true;

    async function verifyEmail() {
      try {
        // Supabase normally processes the confirmation link
        // and establishes a session automatically.
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!active) return;

        if (data.session) {
          setStatus('success');
          setMessage('Your email has been confirmed successfully. You can now continue to your account.');
          return;
        }

        // Supabase may return an error in the URL fragment.
        const hashParams = new URLSearchParams(
          window.location.hash.split('?')[1] || ''
        );

        const errorDescription =
          hashParams.get('error_description') ||
          hashParams.get('error');

        if (errorDescription) {
          throw new Error(errorDescription.replace(/\+/g, ' '));
        }

        setStatus('error');
        setMessage(
          'We could not verify your confirmation yet. The link may have expired, or Supabase may not be configured to redirect here.'
        );
      } catch (err) {
        if (!active) return;
        setStatus('error');
        setMessage(
          err instanceof Error
            ? err.message
            : 'Email confirmation could not be completed. Please try again.'
        );
      }
    }

    void verifyEmail();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-orange-50/60 to-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size={44} withText />
        </div>

        <Card className="p-7 animate-scale-in text-center">
          <div className="flex justify-center mb-4">
            {status === 'checking' ? (
              <LoaderCircle size={48} className="text-orange-500 animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle2 size={48} className="text-emerald-600" />
            ) : (
              <AlertCircle size={48} className="text-red-500" />
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-neutral-900">
            {status === 'checking'
              ? 'Confirming your email'
              : status === 'success'
              ? 'Email confirmed!'
              : 'Confirmation needs attention'}
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {message}
          </p>

          <div className="mt-6">
            {status === 'success' ? (
              <Button
                type="button"
                full
                size="lg"
                onClick={() => navigate('login')}
              >
                Continue to login
              </Button>
            ) : status === 'error' ? (
              <Button
                type="button"
                full
                size="lg"
                onClick={() => navigate('login')}
              >
                Return to login
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
