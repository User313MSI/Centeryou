'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../lib/auth-store';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input } from '../ui/input';

export type AuthMode = 'login' | 'signup' | 'reset';

const TITLES: Record<AuthMode, string> = {
  login: 'Connexion',
  signup: 'Créer un compte',
  reset: 'Mot de passe oublié',
};

/** Fenêtre d'authentification 100 % française : connexion, inscription, mot de passe oublié. */
export function AuthDialog({
  open,
  mode,
  onClose,
  onSwitch,
}: {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onSwitch: (m: AuthMode) => void;
}) {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prenom, setPrenom] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setInfo('');
      setBusy(false);
    }
  }, [open, mode]);

  const submit = async () => {
    setError('');
    setInfo('');
    const mail = email.trim();
    if (!mail.includes('@') || mail.length < 3) {
      setError('Saisis une adresse e-mail valide.');
      return;
    }
    if (mode !== 'reset' && password.length < 6) {
      setError('Mot de passe trop faible : 6 caractères minimum.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await signIn(mail, password);
        if (res.error) setError(res.error);
        else onClose();
      } else if (mode === 'signup') {
        const res = await signUp(mail, password, prenom.trim());
        if (res.error) setError(res.error);
        else if (res.info) {
          onSwitch('login');
          setInfo(res.info);
        } else onClose();
      } else {
        const res = await resetPassword(mail);
        if (res.error) setError(res.error);
        else if (res.info) setInfo(res.info);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={TITLES[mode]}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button size="md" onClick={submit} disabled={busy}>
            {busy ? 'Patiente…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}
          </Button>
        </>
      }
    >
      {mode === 'signup' && (
        <Field label="Ton prénom" htmlFor="auth-prenom">
          <Input
            id="auth-prenom"
            data-autofocus
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Ex. : Camille"
            maxLength={30}
            autoComplete="given-name"
          />
          <p className="mt-1.5 text-xs text-muted">Utilisé pour te saluer et personnaliser ton brief vocal.</p>
        </Field>
      )}
      <Field label="Adresse e-mail" htmlFor="auth-email">
        <Input
          id="auth-email"
          data-autofocus={mode !== 'signup'}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.fr"
          autoComplete="email"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
      </Field>
      {mode !== 'reset' && (
        <Field label="Mot de passe" htmlFor="auth-password">
          <Input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? '6 caractères minimum' : 'Ton mot de passe'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
        </Field>
      )}
      {error && (
        <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="rounded-card border border-voice/40 bg-voice/10 px-4 py-2.5 text-sm font-semibold text-ink">
          {info}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {mode === 'login' && (
          <>
            <button type="button" className="font-semibold text-primarydark underline-offset-2 hover:underline" onClick={() => onSwitch('signup')}>
              Pas encore de compte ? Créer un compte
            </button>
            <button type="button" className="text-muted underline-offset-2 hover:underline" onClick={() => onSwitch('reset')}>
              Mot de passe oublié ?
            </button>
          </>
        )}
        {mode === 'signup' && (
          <button type="button" className="font-semibold text-primarydark underline-offset-2 hover:underline" onClick={() => onSwitch('login')}>
            Déjà un compte ? Se connecter
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className="font-semibold text-primarydark underline-offset-2 hover:underline" onClick={() => onSwitch('login')}>
            Retour à la connexion
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        Sans compte, Centeryou fonctionne exactement comme avant : tout reste dans ce navigateur.
      </p>
    </Dialog>
  );
}
