/**
 * Authentication screens - animated split shell.
 *
 * One surface hosts both sign in and sign up. Switching modes slides the
 * photo panel and the form panel past each other with a smooth transition,
 * and the whole screen fits the viewport without scrolling.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap, Mail, Lock, User as UserIcon, Eye, EyeOff, AlertCircle,
  CheckCircle2, Loader2, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { signInWithGoogle, GOOGLE_CLIENT_ID } from '../../services/socialAuth';
import authHero from '../../assets/auth-hero.jpg';

const errorText = (e, fallback) =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

/* ============================================================
   SHELL
   ============================================================ */
function MediaPane({ mode }) {
  return (
    <div className="auth2-media" style={{ backgroundImage: `url(${authHero})` }}>
      <div className="auth2-media-overlay" />
      <div className="auth2-media-body">
        <div className="auth2-brand">
          <span className="auth2-brand-mark"><Zap size={18} strokeWidth={2.6} /></span>
          <span className="auth2-brand-text">MarkPro</span>
        </div>
        <div>
          <p className="auth2-eyebrow">MARKETING COMMAND</p>
          <h1 className="auth2-headline">
            {mode === 'register'
              ? 'Build the workspace your whole team runs on.'
              : 'The only marketing account you will ever need.'}
          </h1>
          <p className="auth2-copy">
            {mode === 'register'
              ? 'Set up your organization once, then run SEO, WhatsApp, social and AI content from a single command center.'
              : 'Live insights from 20+ sources, automated workflows and campaign execution in one calm, focused view.'}
          </p>
        </div>
        <p className="auth2-foot">© {new Date().getFullYear()} MarkPro Systems Inc.</p>
      </div>
    </div>
  );
}

function AuthShell({ mode, onModeChange, children, staticMode = false }) {
  return (
    <main className={`auth2 ${mode === 'register' ? 'is-register' : 'is-login'} ${staticMode ? 'is-static' : ''}`}>
      <MediaPane mode={mode} />
      <div className="auth2-form">
        <div className="auth2-form-inner">
          {!staticMode && (
            <div className="auth2-switch" role="tablist">
              <button
                type="button"
                className={`auth2-switch-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => onModeChange('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`auth2-switch-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => onModeChange('register')}
              >
                Sign up
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}

function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const Icon = kind === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div className={`auth2-alert ${kind}`} role="alert">
      <Icon size={15} />
      <span>{children}</span>
    </div>
  );
}

const GoogleMark = () => (
  <svg width="16" height="16" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.3z" />
    <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/**
 * Real Google sign-in. The button asks the provider for a signed
 * identity token in a popup, then hands it to the backend, which verifies it
 * before issuing our own session tokens.
 */
function OAuthRow({ disabled, onError, onBusyChange }) {
  const { socialLogin } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [pending, setPending] = useState('');
  const next = search.get('next') || '/dashboard';

  const run = async (provider) => {
    onError('');
    setPending(provider);
    onBusyChange?.(true);
    try {
      const credential = await signInWithGoogle();
      await socialLogin(provider, credential);
      navigate(next, { replace: true });
    } catch (err) {
      onError(errorText(err, `Could not sign you in with ${provider}.`));
    } finally {
      setPending('');
      onBusyChange?.(false);
    }
  };

  // Hide the whole row until at least one provider has been configured, so a
  // fresh install never shows buttons that cannot work.
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <div className="auth2-oauth auth2-oauth-single">
        <button type="button" className="auth2-oauth-btn" disabled={disabled || !!pending}
          onClick={() => run('google')}>
          {pending === 'google' ? <Loader2 size={16} className="auth2-spin" /> : <GoogleMark />} Continue with Google
        </button>
      </div>
      <div className="auth2-divider"><span>or continue with email</span></div>
    </>
  );
}

/* ============================================================
   FORMS
   ============================================================ */
function SignInForm({ onSwitch }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const next = search.get('next') || '/dashboard';

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) return setError('Please enter your email and password.');
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorText(err, 'Could not sign you in. Check your email and password.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth2-panel">
      <h2 className="auth2-title">Welcome back</h2>
      <p className="auth2-sub">Access your marketing command center to continue.</p>
      <Alert>{error}</Alert>
      <OAuthRow disabled={busy} onError={setError} onBusyChange={setBusy} />
      <form onSubmit={submit} noValidate>
        <div className="stitch-field">
          <label className="stitch-field-lbl">EMAIL ADDRESS</label>
          <div className="stitch-input-wrap">
            <div className="stitch-input-icon"><Mail size={16} /></div>
            <input type="email" placeholder="name@company.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="stitch-field">
          <div className="auth2-label-row">
            <label className="stitch-field-lbl" style={{ margin: 0 }}>PASSWORD</label>
            <Link to="/forgot-password" className="auth2-mini-link">FORGOT PASSWORD?</Link>
          </div>
          <div className="stitch-input-wrap">
            <div className="stitch-input-icon"><Lock size={16} /></div>
            <input type={reveal ? 'text' : 'password'} placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setReveal(v => !v)} className="auth2-reveal">
              {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" className="stitch-submit-btn" disabled={busy}>
          {busy ? (<><Loader2 size={17} className="auth2-spin" /> Signing in...</>) : (<>Sign in to dashboard <ArrowRight size={16} /></>)}
        </button>
      </form>
      <p className="auth2-alt">
        New to MarkPro?{' '}
        <button type="button" className="auth2-alt-link" onClick={() => onSwitch('register')}>Sign up for an account</button>
      </p>
    </div>
  );
}

function SignUpForm({ onSwitch }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) return setError('Please fill in all fields.');
    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorText(err, 'Could not create your account.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth2-panel">
      <h2 className="auth2-title">Create your account</h2>
      <p className="auth2-sub">Start your 14 day free trial of MarkPro.</p>
      <Alert>{error}</Alert>
      <OAuthRow disabled={busy} onError={setError} onBusyChange={setBusy} />
      <form onSubmit={submit} noValidate>
        <div className="stitch-field">
          <label className="stitch-field-lbl">FULL NAME</label>
          <div className="stitch-input-wrap">
            <div className="stitch-input-icon"><UserIcon size={16} /></div>
            <input type="text" placeholder="Jane Doe" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
        </div>
        <div className="stitch-field">
          <label className="stitch-field-lbl">WORK EMAIL</label>
          <div className="stitch-input-wrap">
            <div className="stitch-input-icon"><Mail size={16} /></div>
            <input type="email" placeholder="jane@company.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="stitch-field">
          <label className="stitch-field-lbl">PASSWORD</label>
          <div className="stitch-input-wrap">
            <div className="stitch-input-icon"><Lock size={16} /></div>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="stitch-submit-btn" disabled={busy}>
          {busy ? (<><Loader2 size={17} className="auth2-spin" /> Creating account...</>) : (<>Create account <ArrowRight size={16} /></>)}
        </button>
      </form>
      <p className="auth2-alt">
        Already registered?{' '}
        <button type="button" className="auth2-alt-link" onClick={() => onSwitch('login')}>Sign in to workspace</button>
      </p>
    </div>
  );
}

/* ============================================================
   PAGES
   ============================================================ */
function AuthSurface({ initial }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [mode, setMode] = useState(initial);

  const next = search.get('next') || '/dashboard';
  useEffect(() => { if (user) navigate(next, { replace: true }); }, [user, next, navigate]);
  useEffect(() => { setMode(initial); }, [initial]);

  const changeMode = useCallback(nextMode => {
    setMode(nextMode);
    window.history.replaceState(null, '', nextMode === 'register' ? '/register' : '/login');
  }, []);

  return (
    <AuthShell mode={mode} onModeChange={changeMode}>
      <div className="auth2-stack">
        <div className={`auth2-slot ${mode === 'login' ? 'is-on' : ''}`} aria-hidden={mode !== 'login'}>
          <SignInForm onSwitch={changeMode} />
        </div>
        <div className={`auth2-slot ${mode === 'register' ? 'is-on' : ''}`} aria-hidden={mode !== 'register'}>
          <SignUpForm onSwitch={changeMode} />
        </div>
      </div>
    </AuthShell>
  );
}

export function LoginPage() { return <AuthSurface initial="login" />; }
export function RegisterPage() { return <AuthSurface initial="register" />; }

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await authAPI.forgotPassword(email.trim()); setSent(true); }
    catch (err) { setError(errorText(err, 'Could not send reset link.')); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell mode="login" staticMode>
      <div className="auth2-panel">
        <h2 className="auth2-title">Reset password</h2>
        <p className="auth2-sub">Enter your work email to receive a password reset link.</p>
        {sent ? (
          <Alert kind="success">If an account exists for {email}, a reset link has been sent.</Alert>
        ) : (
          <form onSubmit={submit} noValidate>
            <Alert>{error}</Alert>
            <div className="stitch-field">
              <label className="stitch-field-lbl">WORK EMAIL</label>
              <div className="stitch-input-wrap">
                <div className="stitch-input-icon"><Mail size={16} /></div>
                <input type="email" placeholder="jane@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="stitch-submit-btn" disabled={busy}>
              {busy ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="auth2-alt">
          <Link to="/login" className="auth2-alt-link"><ArrowLeft size={13} /> Back to sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  return (
    <AuthShell mode="login" staticMode>
      <div className="auth2-panel">
        <h2 className="auth2-title">Reset password</h2>
        <p className="auth2-sub">Use the link in your email to continue.</p>
        <p className="auth2-alt"><Link to="/login" className="auth2-alt-link">Back to sign in</Link></p>
      </div>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  return (
    <AuthShell mode="login" staticMode>
      <div className="auth2-panel">
        <h2 className="auth2-title">Verify email</h2>
        <p className="auth2-sub">Confirm your address, then continue to your workspace.</p>
        <p className="auth2-alt"><Link to="/login" className="auth2-alt-link">Continue to sign in</Link></p>
      </div>
    </AuthShell>
  );
}

export default LoginPage;
