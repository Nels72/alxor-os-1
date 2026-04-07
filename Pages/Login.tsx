import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyCredentials } from '../services/airtableService';
import Logo from '../components/Logo';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [dossierId, setDossierId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let search = location.search;
    if (!search && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const q = hash.indexOf('?');
      if (q !== -1) {
        search = hash.slice(q);
      }
    }
    const params = new URLSearchParams(search);
    const prefilledEmail = params.get('email');
    const prefilledId = params.get('id');

    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
    if (prefilledId) {
      setDossierId(prefilledId);
    }
  }, [location.search, location.pathname]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedId = dossierId.trim();

    console.log('Login attempt:', normalizedEmail, normalizedId);

    if (!normalizedEmail || !normalizedId) {
      setError('Veuillez renseigner votre e-mail et votre numero de dossier.');
      return;
    }

    try {
      setIsLoading(true);
      const { session, error: verifyError } = await verifyCredentials(
        normalizedEmail,
        normalizedId
      );

      if (verifyError || !session) {
        setError(verifyError || 'Identifiants invalides.');
        return;
      }

      localStorage.setItem('userSession', JSON.stringify(session));
      navigate('/client');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex justify-center">
          <Logo className="h-10 w-auto" />
        </div>

        <h1 className="mb-2 text-center text-2xl font-black tracking-tight text-slate-900">
          Accès dossier 
        </h1>
        <p className="mb-8 text-center text-sm font-medium text-slate-500">
          Connectez-vous avec votre e-mail et numero de dossier.
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#4F7CFF] focus:ring-2 focus:ring-[#4F7CFF]/20"
              placeholder="exemple@domaine.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
              Numero de Dossier
            </label>
            <input
              type="text"
              value={dossierId}
              onChange={(event) => setDossierId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#4F7CFF] focus:ring-2 focus:ring-[#4F7CFF]/20"
              placeholder="recXXXXXXXXXXXXXX"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#4F7CFF] px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#3f6fff] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Chargement...' : 'Acceder'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
