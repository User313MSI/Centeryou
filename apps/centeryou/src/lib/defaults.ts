import type { Settings } from '../types';

export const defaultSettings: Settings = {
  prenom: '',
  dayStart: 8,
  sounds: true,
  soundVolume: 0.6, // M-20 Accord : volume par défaut audible (défini aussi dans src/lib/sons.ts VOLUME_DEFAUT_SONS)
  voice: true,
  theme: 'clair',
  onboarded: false,
  briefShownDate: '',
  welcomeSequence: 'daily',
  welcomeShownDate: '',
  launchFilm: 'daily',
  launchFilmShownDate: '',
  launchFilmVoice: true,
  filmPad: false,
  darkMode: false,
  animations: true,
  reminders: true,
  reminderDefaultMinutes: 10,
  tasksReminder: true,
  tasksReminderTime: '09:00',
};
