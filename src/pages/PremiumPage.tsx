import { useCallback, useEffect, useState } from 'react';
import { Crown, Check, Copy, Upload, FileImage, X, Clock, CheckCircle2, XCircle, AlertCircle, Banknote } from 'lucide-react';
import { Card, Button, Badge, Input } from '@/components/ui';
import { PremiumBadge } from '@/components/PremiumLock';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { navigate } from '@/hooks/useRouter';
import { supabase } from '@/lib/supabase';
import type { Payment, PaymentStatus, PremiumPlan } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const PLANS: { id: PremiumPlan; label: string; price: number; duration: string }[] = [
  { id: 'weekly', label: 'Weekly', price: 2500, duration: '7 days' },
  { id: 'monthly', label: 'Monthly', price: 7000, duration: '30 days' },
  { id: 'yearly', label: 'Yearly', price: 50000, duration: '365 days' },
];

export function PremiumPage() {
  const { user, isPremium, refreshProfile } = useAuth();
  const { config } = useAppConfig();
  const [copied, setCopied] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [, setLoadingPay] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [resumePayment, setResumePayment] = useState<Payment | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan>('weekly');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const selectedPlanDetails = PLANS.find((plan) => plan.id === selectedPlan) ?? PLANS[0];
  const price = selectedPlanDetails.price;

  const loadPayments = useCallback(async () => {
    if (!user) { setLoadingPay(false); return; }
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const loadedPayments = (data as Payment[]) ?? [];
    setPayments(loadedPayments);
    if (error) {
      setResumePayment(null);
    } else {
      const pendingIds = loadedPayments.filter((payment) => payment.status === 'pending').map((payment) => payment.id);
      if (pendingIds.length) {
        const { data: receipts } = await supabase
          .from('payment_receipts')
          .select('payment_id')
          .in('payment_id', pendingIds);
        const receiptIds = new Set((receipts ?? []).map((receipt) => receipt.payment_id));
        setResumePayment(loadedPayments.find((payment) => payment.status === 'pending' && !receiptIds.has(payment.id)) ?? null);
      } else {
        setResumePayment(null);
      }
    }
    setLoadingPay(false);
  }, [user]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  useEffect(() => {
    if (!user || !isPremium) { setExpiryDate(null); return; }
    supabase.rpc('get_my_premium_status').maybeSingle().then(({ data }) => {
      setExpiryDate((data as { expiry_date?: string | null } | null)?.expiry_date ?? null);
    });
  }, [isPremium, user]);

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(config.opay_account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be unavailable; ignore
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Crown size={48} className="mx-auto text-amber-500" />
        <h1 className="mt-4 font-display text-3xl font-bold text-neutral-900">Unlock Premium</h1>
        <p className="mt-2 text-neutral-500">Log in or create an account to upgrade to Premium.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => navigate('login')}>Log in</Button>
          <Button variant="outline" onClick={() => navigate('signup')}>Create account</Button>
        </div>
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <Card className="p-8 text-center bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/30">
            <Crown size={32} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">You're Premium</h1>
          <p className="mt-2 text-neutral-600">All premium features are unlocked. Enjoy the pro engine.</p>
          {expiryDate && <p className="mt-2 text-sm text-neutral-500">Access through {new Date(expiryDate).toLocaleDateString()}.</p>}
          <div className="mt-5 flex justify-center">
            <PremiumBadge>PREMIUM ACTIVE</PremiumBadge>
          </div>
          <Button className="mt-6" onClick={() => navigate('sensitivity')}>Generate pro sensitivity</Button>
        </Card>
      </div>
    );
  }

  const pendingPayment = payments.find((payment) => payment.status === 'under_review')
    ?? payments.find((payment) => payment.status === 'pending' && payment.id !== resumePayment?.id);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <header className="text-center mb-8 animate-fade-up">
        <Badge color="amber"><Crown size={12} /> Premium</Badge>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-neutral-900">
          Unlock <span className="text-gradient-orange">Premium</span>
        </h1>
        <p className="mt-2 text-neutral-500 text-sm">Choose a plan to unlock the full pro engine.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-5" role="radiogroup" aria-label="Premium subscription plan">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={selectedPlan === plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`rounded-xl border p-4 text-left transition ${selectedPlan === plan.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-neutral-200 bg-white hover:border-orange-300'}`}
          >
            <span className="block font-semibold text-neutral-900">{plan.label}</span>
            <span className="mt-1 block text-xl font-display font-bold text-orange-700">₦{plan.price.toLocaleString()}</span>
            <span className="mt-1 block text-xs text-neutral-500">{plan.duration} of access</span>
          </button>
        ))}
      </div>

      {/* Features */}
      <Card className="p-6 mb-5 animate-fade-up">
        <h2 className="font-display font-bold text-neutral-900 mb-4">What you get</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            'Pro Headshot, Pro Drag Shot, Sniper & 5 more presets',
            'Advanced device-specific sensitivity engine',
            'Drag-shot and headshot sub-tuning',
            'Custom sensitivity tuning',
            'High-quality PNG sensitivity poster',
            'Advanced confidence scoring',
            'Unlimited saved sensitivity profiles',
            'Priority receipt verification',
          ].map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-sm text-neutral-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0 mt-0.5">
                <Check size={12} strokeWidth={3} />
              </span>
              {f}
            </div>
          ))}
        </div>
      </Card>

      {/* Payment status */}
      {payments.length > 0 && (
        <Card className="p-5 mb-5 animate-fade-up">
          <h2 className="font-display font-bold text-neutral-900 mb-3">Your payment history</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <PaymentStatusCard key={p.id} payment={p} />
            ))}
          </div>
        </Card>
      )}

      {resumePayment ? (
        <Card className="p-6 animate-fade-up border-amber-200">
          <h2 className="font-display font-bold text-neutral-900">Finish your receipt submission</h2>
          <p className="mt-1 text-sm text-neutral-500">Your payment record was saved, but the receipt upload did not finish.</p>
          <PaymentForm
            key={resumePayment.id}
            plan={resumePayment.plan ?? selectedPlan}
            price={Number(resumePayment.amount)}
            config={config}
            copied={copied}
            onCopy={copyAccount}
            paymentId={resumePayment.id}
            initialReference={resumePayment.transaction_reference}
            onSubmitted={() => { setShowPayForm(false); loadPayments(); refreshProfile(); }}
            onCancel={() => setResumePayment(null)}
          />
        </Card>
      ) : pendingPayment ? (
        <Card className="p-6 animate-fade-up border-amber-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock size={24} />
            </span>
            <div>
              <h2 className="font-display font-bold text-neutral-900">Payment under review</h2>
              <p className="text-sm text-neutral-500">Your receipt is being verified. You'll get Premium once approved.</p>
            </div>
          </div>
          <Button className="mt-4" variant="outline" onClick={() => navigate('dashboard')}>Go to dashboard</Button>
        </Card>
      ) : !showPayForm ? (
        <Card className="p-6 animate-fade-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-neutral-900 text-lg">{selectedPlanDetails.label} Premium</h2>
              <p className="text-sm text-neutral-500">Activated after your payment is verified.</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-extrabold text-gradient-orange">₦{price.toLocaleString()}</div>
              <div className="text-xs text-neutral-500">{selectedPlanDetails.duration}</div>
            </div>
          </div>
          <Button full size="lg" className="mt-5" variant="premium" onClick={() => setShowPayForm(true)}>
            <Crown size={18} /> Pay ₦{price.toLocaleString()}
          </Button>
        </Card>
      ) : (
        <PaymentForm
          plan={selectedPlan}
          price={price}
          config={config}
          copied={copied}
          onCopy={copyAccount}
          onSubmitted={() => { setShowPayForm(false); loadPayments(); refreshProfile(); }}
          onCancel={() => setShowPayForm(false)}
        />
      )}
    </div>
  );
}

function PaymentForm({
  plan, price, config, copied, onCopy, paymentId, initialReference, onSubmitted, onCancel,
}: {
  plan: PremiumPlan;
  price: number;
  config: { opay_bank: string; opay_account_name: string; opay_account_number: string };
  copied: boolean;
  onCopy: () => void;
  paymentId?: string;
  initialReference?: string;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(paymentId ? 2 : 1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ref, setRef] = useState(initialReference ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onFile = (f: File | null) => {
    setError('');
    if (!f) { setFile(null); setPreview(null); return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Only JPG, PNG, WEBP, or PDF files are allowed.');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File is too large. Max 5MB.');
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const submit = async () => {
    setError('');
    if (!file) { setError('Please upload your payment receipt.'); return; }
    if (ref.trim().length < 4) { setError('Enter a valid transaction/reference number.'); return; }
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Please log in again before submitting your receipt.');
      let targetPaymentId = paymentId;
      if (!targetPaymentId) {
        const { data: payData, error: payErr } = await supabase
          .from('payments')
          .insert({ amount: price, plan, transaction_reference: ref.trim() })
          .select('id')
          .single();
        if (payErr) throw payErr;
        targetPaymentId = (payData as { id: string }).id;
      }

      const ext = file.name.split('.').pop();
      const path = `${authData.user.id}/${targetPaymentId}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: recErr } = await supabase.from('payment_receipts').insert({
        payment_id: targetPaymentId,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        ocr_text: '',
        ocr_confidence: 0,
        fraud_risk_score: 0,
        fraud_flags: ['scan_pending'],
      });
      if (recErr) throw recErr;

      await supabase.functions.invoke('receipt-review', { body: { paymentId: targetPaymentId } });

      onSubmitted();
    } catch (err) {
      setError((err as Error).message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 animate-scale-in">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5 text-xs font-semibold">
        <span className={`px-2.5 py-1 rounded-full ${step === 1 ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-500'}`}>1. Pay</span>
        <span className="text-neutral-300">—</span>
        <span className={`px-2.5 py-1 rounded-full ${step === 2 ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-500'}`}>2. Upload receipt</span>
      </div>

      {step === 1 ? (
        <div>
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-5">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-orange-800">
              <Banknote size={16} /> Payment details
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Bank</dt><dd className="font-semibold text-neutral-900">{config.opay_bank}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Account name</dt><dd className="font-semibold text-neutral-900">{config.opay_account_name}</dd></div>
              <div className="flex justify-between items-center"><dt className="text-neutral-500">Account number</dt>
                <dd className="font-semibold text-neutral-900 inline-flex items-center gap-2">
                  <span className="font-mono">{config.opay_account_number}</span>
                  <button onClick={onCopy} className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline">
                    {copied ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-orange-100"><dt className="text-neutral-500">Amount</dt><dd className="font-bold text-orange-700">₦{price.toLocaleString()}</dd></div>
            </dl>
          </div>
          <ol className="mt-4 space-y-2 text-sm text-neutral-600 list-decimal list-inside">
            <li>Open your Opay or banking app.</li>
            <li>Send <strong>₦{price.toLocaleString()}</strong> to the account above.</li>
            <li>Save the receipt screenshot or PDF.</li>
            <li>Return here and upload it in step 2.</li>
          </ol>
          <div className="mt-5 flex gap-2">
            <Button full onClick={() => setStep(2)}>I've paid — upload receipt</Button>
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div>
          <label className="block">
            <span className="block text-sm font-medium text-neutral-700 mb-1.5">Transaction / reference number</span>
            <Input value={ref} onChange={setRef} placeholder="e.g. OPP123456789" disabled={Boolean(paymentId)} />
          </label>

          <div className="mt-4">
            <span className="block text-sm font-medium text-neutral-700 mb-1.5">Receipt (JPG/PNG/WEBP/PDF, max 5MB)</span>
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center hover:border-orange-400 transition">
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onFile(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : file ? (
                  <div className="flex items-center justify-center gap-2 text-neutral-600">
                    <FileImage size={24} /> <span className="text-sm">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <Upload size={32} />
                    <span className="text-sm">Tap to upload your receipt</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Button full onClick={submit} loading={submitting} disabled={!file || !ref}>
              {submitting ? 'Submitting...' : 'Submit for verification'}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Premium is activated only after the admin verifies your payment. Uploading a receipt does not unlock anything.
          </p>
        </div>
      )}
    </Card>
  );
}

function PaymentStatusCard({ payment }: { payment: Payment }) {
  const map: Record<PaymentStatus, { label: string; color: 'amber' | 'green' | 'red' | 'neutral' | 'blue'; icon: typeof Clock; desc: string }> = {
    pending: { label: 'Pending', color: 'amber', icon: Clock, desc: 'Your receipt has been submitted and is being verified.' },
    under_review: { label: 'Under Review', color: 'amber', icon: Clock, desc: 'Admin is reviewing your payment.' },
    verified: { label: 'Verified', color: 'green', icon: CheckCircle2, desc: 'Your Premium access has been activated.' },
    rejected: { label: 'Rejected', color: 'red', icon: XCircle, desc: 'We could not verify this payment. Contact support if this is an error.' },
    refunded: { label: 'Refunded', color: 'blue', icon: Banknote, desc: 'Payment was refunded.' },
    expired: { label: 'Expired', color: 'neutral', icon: Clock, desc: 'This payment session expired.' },
  };
  const m = map[payment.status];
  const Icon = m.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3.5">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
        m.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
        m.color === 'red' ? 'bg-red-100 text-red-700' :
        m.color === 'amber' ? 'bg-amber-100 text-amber-700' :
        m.color === 'blue' ? 'bg-blue-100 text-blue-700' :
        'bg-neutral-100 text-neutral-700'
      }`}>
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-neutral-900 text-sm">{m.label}</span>
          <span className="text-xs text-neutral-400">{new Date(payment.created_at).toLocaleDateString()}</span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">{m.desc}</p>
        <div className="mt-1.5 text-xs text-neutral-400">
          {payment.plan && <span className="capitalize">{payment.plan} plan · </span>}
          Ref: <span className="font-mono">{payment.transaction_reference}</span> • ₦{Number(payment.amount).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
