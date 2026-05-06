import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import Logo from '../components/Logo';
import { useStore } from '../store';

const ADMIN_EMAIL = 'admin@alxor-os.fr';
const ADMIN_PASSWORD = 'Alxor2026!';

const inputFocusClass =
  'outline-none transition-all focus-visible:border-[#4F7CFF] focus-visible:ring-2 focus-visible:ring-[#4F7CFF]/25 focus-visible:ring-offset-0';

const controlFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]/25 focus-visible:ring-offset-2';

const LoginAdmin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const redirectParam = useMemo(() => {
    let search = location.search;
    if (!search && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const q = hash.indexOf('?');
      if (q !== -1) {
        search = hash.slice(q);
      }
    }
    return new URLSearchParams(search).get('redirect')?.trim() || '';
  }, [location.search]);

  const getRedirectTarget = (): string => {
    if (!redirectParam) return '/dashboard';
    if (redirectParam.startsWith('/')) return redirectParam;
    return `/prospects/${redirectParam}`;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const isValid =
      email.trim().toLowerCase() === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD;

    if (!isValid) {
      setIsLoading(false);
      setError('Identifiants administrateur invalides.');
      return;
    }

    login();
    navigate(getRedirectTarget());
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex justify-center">
          <Logo className="h-10 w-auto" />
        </div>

        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Accès administrateur
        </h1>
        <p className="mb-8 text-center text-sm font-medium text-slate-500">
          Connectez-vous pour accéder à ALXOR OS.
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-xs font-medium uppercase tracking-widest text-slate-500"
            >
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 ${inputFocusClass}`}
              placeholder="admin@alxor-os.fr"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-xs font-medium uppercase tracking-widest text-slate-500"
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm font-medium text-slate-700 ${inputFocusClass}`}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 ${controlFocusRing}`}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
              </button>
            </div>
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className={`text-xs font-normal text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-[#4F7CFF] hover:decoration-[#4F7CFF]/50 rounded-sm ${controlFocusRing}`}
              >
                Mot de passe oublié ?
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${controlFocusRing}`}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>

      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-dialog-title"
          onClick={() => setForgotOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className={`absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 ${controlFocusRing}`}
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
            <h2 id="forgot-dialog-title" className="pr-8 text-lg font-semibold text-slate-900">
              Réinitialisation
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
              Pour réinitialiser votre accès, veuillez contacter l&apos;administrateur système ALXOR-OS.
            </p>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className={`mt-6 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 ${controlFocusRing}`}
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginAdmin;
