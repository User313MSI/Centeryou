'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bell, Download, Moon, Sparkles, Trash2, Upload, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { AccountSection } from '../../components/account/account-section';
import { AgendasCard } from '../../components/settings/agendas-card';
import { Button } from '../../components/ui/button';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { Field, Input } from '../../components/ui/input';
import { Toggle } from '../../components/ui/toggle';
import { BackupError, downloadBackup, parseBackup, readBackupFile, serializeBackup, type BackupPayload } from '../../lib/backup';
import { useStore } from '../../lib/store';
import { getSupabase } from '../../lib/supabase';
import { REMINDER_LEADS, REMINDER_LEAD_LABELS } from '../../lib/rappel-leads';

import { useUiStore } from '../../lib/ui-store';
import { SubscriptionCard } from '../../components/settings/subscription-card';
import type { LaunchFilmMode, ReminderLead, WelcomeSequenceMode } from '../../types';

const selectClass =
  'w-full min-h-11 rounded-card border border-line bg-surface px-4 text-base text-ink transition-colors duration-fast ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function ReglagesPage() {
  const settings = useStore((s) => s.settings);
  // Diapason (M-16) : volume des sons, borné 0–1 (défaut bas garanti par sanitizeSettings)
  const volumeSons = Math.min(1, Math.max(0, typeof settings.soundVolume === 'number' ? settings.soundVolume : 0.35));
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const restoreBackup = useStore((s) => s.restoreBackup);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const pushToast = useUiStore((s) => s.pushToast);
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<BackupPayload | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const s = useStore.getState();
    downloadBackup(serializeBackup({ events: s.events, tasks: s.tasks, settings: s.settings }));
    pushToast({ message: 'Sauvegarde exportée : fichier JSON téléchargé.' });
  };

  const onFilePicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let json: string;
    try {
      json = await readBackupFile(file);
    } catch {
      pushToast({ message: 'Impossible de lire ce fichier — choisis le fichier .json téléchargé depuis Centeryou (« Sauvegarder mes données »). Rien n’a été modifié.' });
      return;
    }
    try {
      const payload = parseBackup(json);
      setPendingRestore(payload);
      setConfirmRestore(true);
      window.setTimeout(() => {
        setConfirmRestore(false);
        setPendingRestore(null);
      }, 8000);
    } catch (err) {
      pushToast({ message: err instanceof BackupError ? err.message : 'Ce fichier ne ressemble pas à une sauvegarde Centeryou — rien n’a été modifié. Choisis le fichier .json téléchargé depuis Centeryou.' });
    }
  };

  const applyRestore = () => {
    if (!pendingRestore) return;
    restoreBackup(pendingRestore);
    setPendingRestore(null);
    setConfirmRestore(false);
    pushToast({ message: 'Sauvegarde restaurée : tes données ont été remplacées par celles du fichier.' });
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // rappels (M-04) : état de la permission navigateur, relu au focus de la fenêtre
  type PermRappels = 'unsupported' | 'default' | 'granted' | 'denied';
  const [permRappels, setPermRappels] = useState<PermRappels>('unsupported');
  useEffect(() => {
    const lire = () =>
      setPermRappels(typeof Notification === 'undefined' ? 'unsupported' : (Notification.permission as PermRappels));
    lire();
    window.addEventListener('focus', lire);
    return () => window.removeEventListener('focus', lire);
  }, []);
  const activerRappels = () => {
    // import dynamique : le domaine des rappels (Notification API, tampon) ne pèse pas au premier chargement
    void import('../../lib/rappels').then(async (m) => {
      const res = await m.requestRappelPermission();
      setPermRappels(res);
      if (res === 'granted') pushToast({ message: 'Notifications autorisées : tes rappels pourront arriver au bon moment.' });
      else if (res === 'denied')
        pushToast({
          message: 'Notifications refusées : tu peux les réactiver à tout moment dans les réglages du site de ton navigateur.',
          duration: 9000,
        });
    });
  };

  const onDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 8000);
      return;
    }
    setDeleting(true);
    try {
      // session courante (jeton Bearer) pour que le serveur vérifie que le compte
      // supprimé est bien celui de la session authentifiée (M-08)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const sb = await getSupabase();
        const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch {
        // sans session : appel anonyme, le serveur refuse proprement si configuré
      }
      await fetch('/api/compte/suppression', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
    } catch {
      pushToast({ message: 'Suppression serveur indisponible — tes données locales, elles, ont bien été supprimées.' });
    }
    deleteAccount();
    setConfirmDelete(false);
    pushToast({ message: 'Ton compte et tes données ont été supprimés.' });
    router.push('/');
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-ink md:text-4xl">Réglages</h1>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Profil</h2>
        </CardHeader>
        <CardBody>
          <Field label="Ton prénom" htmlFor="reglage-prenom">
            <Input
              id="reglage-prenom"
              value={settings.prenom}
              onChange={(e) => updateSettings({ prenom: e.target.value })}
              placeholder="Ex. : Camille"
              maxLength={30}
            />
          </Field>
          <p className="mt-2 text-xs text-muted">
            Utilisé pour te saluer et personnaliser ton brief du matin.
          </p>
        </CardBody>
      </Card>

      <AccountSection />

      <SubscriptionCard />

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Apparence</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Moon size={16} aria-hidden className="text-primarydark" /> Mode sombre
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Un thème sombre reposant pour les yeux, mémorisé sur cet appareil.
              </p>
            </div>
            <Toggle
              checked={settings.theme === 'sombre'}
              onChange={(v) => updateSettings({ theme: v ? 'sombre' : 'clair' })}
              label="Mode sombre"
              id="toggle-theme"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Animations &amp; célébrations</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles size={16} aria-hidden className="text-primarydark" /> Animations &amp; célébrations
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Apparitions douces, micro-confettis et petits feux d’artifice lors des moments forts. Si tu désactives
                cette option — ou si ton système demande « réduire les animations » — tout redevient statique
                instantanément.
              </p>
            </div>
            <Toggle
              checked={settings.animations}
              onChange={(v) => updateSettings({ animations: v })}
              label="Animations & célébrations"
              id="toggle-animations"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Ma journée</h2>
        </CardHeader>
        <CardBody>
          <Field label="Début de la journée (grille du planning)" htmlFor="reglage-daystart">
            <select
              id="reglage-daystart"
              value={settings.dayStart}
              onChange={(e) => updateSettings({ dayStart: Number(e.target.value) })}
              className={selectClass}
            >
              {[6, 7, 8, 9, 10].map((h) => (
                <option key={h} value={h}>
                  {h}h00
                </option>
              ))}
            </select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Séquence d’accueil</h2>
        </CardHeader>
        <CardBody>
          <Field label="Séquence d’accueil (page Aujourd’hui)" htmlFor="reglage-welcome">
            <select
              id="reglage-welcome"
              value={settings.welcomeSequence ?? 'daily'}
              onChange={(e) => {
                const v = e.target.value as WelcomeSequenceMode;
                // le réglage historique reste synchronisé avec le film de lancement (même fréquence)
                updateSettings({ welcomeSequence: v, launchFilm: v as LaunchFilmMode });
              }}
              className={selectClass}
            >
              <option value="always">À chaque ouverture</option>
              <option value="daily">Une fois par jour (défaut)</option>
              <option value="off">Jamais</option>
            </select>
          </Field>
          <p className="mt-2 text-xs text-muted">
            La séquence d’accueil est devenue le film de lancement (carte ci-dessous) : les deux réglages restent
            synchronisés, choisis l’un ou l’autre. La voix se règle avec la bascule « Voix du film ».
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Sparkles size={16} aria-hidden className="text-primarydark" /> Film de lancement
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Field label="Film de lancement (page Aujourd’hui)" htmlFor="reglage-film-lancement">
            <select
              id="reglage-film-lancement"
              value={settings.launchFilm ?? 'daily'}
              onChange={(e) => {
                const v = e.target.value as LaunchFilmMode;
                // la fréquence historique de la séquence d'accueil suit le même réglage
                updateSettings({ launchFilm: v, welcomeSequence: v });
              }}
              className={selectClass}
            >
              <option value="always">À chaque ouverture</option>
              <option value="daily">Une fois par jour (défaut)</option>
              <option value="off">Jamais</option>
            </select>
          </Field>
          <p className="text-xs text-muted">
            Le film cinématique d’arrivée sur la page Aujourd’hui : tes vrais chiffres du jour, ta prochaine étape, ta
            progression et la voix qui raconte ton brief du matin. « Jamais » coupe aussi la séquence d’accueil. Le film
            n’est jamais bloquant : « Passer », Échap ou un clic à côté suffisent.
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Volume2 size={16} aria-hidden className="text-voice" /> Voix du film
              </p>
              <p className="mt-0.5 text-xs text-muted">
                La narration du film lit ton brief du matin (texte déjà calculé, aucun coût supplémentaire). Voix de ton
                navigateur par défaut ; voix premium si ton offre y donne droit et si le quota le permet, sinon bascule
                silencieuse. Le film démarre tout seul ; un petit bouton « Activer le son » débloque la narration au
                premier passage.
              </p>
            </div>
            <Toggle
              checked={settings.launchFilmVoice}
              onChange={(v) => updateSettings({ launchFilmVoice: v })}
              label="Voix du film"
              id="toggle-film-voix"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Volume2 size={18} aria-hidden className="text-primarydark" /> Sons
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Effets sonores</p>
              <p className="text-xs text-muted">
                Des sons doux et synthétisés sur place : « ding » à la coche d’une tâche, « pop » à la création d’un
                événement, carillon discret aux rappels. Aucun son ne joue sans ton premier geste dans l’onglet.
              </p>
            </div>
            <Toggle checked={settings.sounds} onChange={(v) => updateSettings({ sounds: v })} label="Effets sonores" id="toggle-sons" />
          </div>
          <Field label={`Volume des sons — ${Math.round(volumeSons * 100)} %`} htmlFor="reglage-volume-sons">
            <input
              id="reglage-volume-sons"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(volumeSons * 100)}
              disabled={!settings.sounds}
              onChange={(e) => updateSettings({ soundVolume: Number(e.target.value) / 100 })}
              className="min-h-11 w-full accent-primary disabled:opacity-50"
              style={{ accentColor: 'rgb(var(--c-primary))' }}
              aria-valuetext={`${Math.round(volumeSons * 100)} pour cent`}
            />
          </Field>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Nappe du film</p>
              <p className="text-xs text-muted">
                Une nappe très douce (quelques accords lents) pendant le film de lancement. Désactivée par défaut :
                elle ne s’impose jamais, tu la découvres en l’activant ici.
              </p>
            </div>
            <Toggle
              checked={settings.filmPad}
              onChange={(v) => updateSettings({ filmPad: v })}
              label="Nappe du film"
              id="toggle-nappe-film"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Assistant vocal</p>
              <p className="text-xs text-muted">
                Si désactivé, aucune voix ne sera prononcée (commandes toujours utilisables par texte).
              </p>
            </div>
            <Toggle checked={settings.voice} onChange={(v) => updateSettings({ voice: v })} label="Assistant vocal" id="toggle-voix" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Bell size={18} aria-hidden className="text-primarydark" /> Rappels
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            Les rappels sont des notifications locales envoyées par ton navigateur : ils fonctionnent quand Centeryou
            est ouvert ou en arrière-plan — pas quand l’application est complètement fermée.
          </p>
          {permRappels === 'unsupported' && (
            <p className="text-xs text-muted">Ce navigateur ne permet pas les notifications : aucun rappel ne sera envoyé.</p>
          )}
          {permRappels === 'granted' && (
            <p className="text-xs font-semibold text-primarydark">Notifications autorisées : tes rappels arriveront au bon moment.</p>
          )}
          {permRappels === 'denied' && (
            <div className="rounded-card border border-warning/40 bg-warning/10 px-4 py-3">
              <p className="text-sm font-semibold text-ink">Notifications bloquées par ton navigateur.</p>
              <p className="mt-1 text-xs text-muted">
                Pour les réactiver : clique sur l’icône cadenas (ou « Informations du site ») à gauche de l’adresse,
                ouvre « Notifications » et choisis « Autoriser ». Sur Safari : menu Safari → Réglages de ce site web →
                Notifications → Autoriser.
              </p>
            </div>
          )}
          {permRappels === 'default' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" id="btn-activer-rappels" onClick={activerRappels}>
                <Bell size={16} aria-hidden /> Activer les rappels
              </Button>
              <p className="text-xs text-muted">
                On ne te demande la permission qu’à ce moment — ou à la première création d’événement avec un rappel.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Tous les rappels</p>
              <p className="text-xs text-muted">Active ou coupe tous les rappels (événements et tâches du jour).</p>
            </div>
            <Toggle checked={settings.reminders} onChange={(v) => updateSettings({ reminders: v })} label="Tous les rappels" id="toggle-rappels" />
          </div>
          <Field label="Rappel par défaut des nouveaux événements" htmlFor="reglage-rappel-defaut">
            <select
              id="reglage-rappel-defaut"
              value={String(settings.reminderDefaultMinutes)}
              onChange={(e) => updateSettings({ reminderDefaultMinutes: Number(e.target.value) as ReminderLead })}
              className={selectClass}
            >
              {REMINDER_LEADS.map((l) => (
                <option key={l} value={l}>
                  {REMINDER_LEAD_LABELS[l]}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Rappel des tâches du jour</p>
              <p className="text-xs text-muted">Une notification récapitulative si des tâches du jour ne sont pas terminées.</p>
            </div>
            <Toggle
              checked={settings.tasksReminder}
              onChange={(v) => updateSettings({ tasksReminder: v })}
              label="Rappel des tâches du jour"
              id="toggle-rappel-taches"
            />
          </div>
          <Field label="Heure du rappel des tâches" htmlFor="reglage-rappel-taches-heure">
            <Input
              id="reglage-rappel-taches-heure"
              type="time"
              value={settings.tasksReminderTime}
              disabled={!settings.tasksReminder}
              onChange={(e) => updateSettings({ tasksReminderTime: e.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <AlertTriangle size={18} aria-hidden className="text-danger" /> Données locales
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Par défaut, toutes tes données restent sur cet appareil. Si tu crées un compte (carte ci-dessus),
            une copie est enregistrée en ligne ; la synchronisation multi-appareils de l’offre Premium (voir
            Abonnement ci-dessus) envoie aussi une copie sur le serveur.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onExport}>
              <Download size={16} aria-hidden /> Sauvegarder mes données
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} aria-hidden /> Restaurer une sauvegarde…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Choisir un fichier de sauvegarde"
              onChange={onFilePicked}
            />
          </div>
          {confirmRestore && pendingRestore && (
            <div className="flex flex-col gap-2 rounded-card border border-warning/40 bg-warning/10 px-4 py-3">
              <p className="text-sm text-ink">
                <strong>Attention :</strong> tes événements, tâches et réglages actuels seront{' '}
                <strong>remplacés</strong> par ceux du fichier ({pendingRestore.events.length} événement
                {pendingRestore.events.length > 1 ? 's' : ''}, {pendingRestore.tasks.length} tâche
                {pendingRestore.tasks.length > 1 ? 's' : ''}).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="danger" size="sm" onClick={applyRestore}>
                  Confirmer la restauration
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirmRestore(false);
                    setPendingRestore(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
          <div>
            <Button
              variant={confirmReset ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  window.setTimeout(() => setConfirmReset(false), 4000);
                  return;
                }
                resetAll();
                setConfirmReset(false);
                pushToast({ message: 'Toutes les données ont été effacées.' });
              }}
            >
              {confirmReset ? 'Cliquer encore pour confirmer la suppression' : 'Effacer toutes mes données'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <AgendasCard />

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Trash2 size={18} aria-hidden className="text-danger" /> Supprimer mon compte et mes données
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Suppression définitive et irréversible : ton prénom, tes événements et tes tâches sont effacés
            de ce navigateur (stockage local), et une demande d’effacement est envoyée au serveur. Voir la{' '}
            <Link href="/confidentialite" className="font-semibold text-primarydark underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
              politique de confidentialité
            </Link>
            .
          </p>
          {confirmDelete ? (
            <div className="flex flex-col gap-2 rounded-card border border-danger/40 bg-danger/5 px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                Es-tu sûr de vouloir continuer ? Cette action est définitive et ne peut pas être annulée.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={onDeleteAccount} disabled={deleting}>
                  {deleting ? 'Suppression en cours…' : 'Oui, supprimer définitivement'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button variant="secondary" size="sm" onClick={onDeleteAccount} disabled={deleting}>
                Supprimer mon compte et mes données
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
