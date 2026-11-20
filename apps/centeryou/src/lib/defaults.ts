import type { Settings } from '../types';

export const defaultSettings: Settings = {
  prenom: '',
  dayStart: 8,
  sounds: true,
  voice: true,
  theme: 'clair',
  onboarded: false,
  briefShownDate: '',
  welcomeSequence: 'daily',
  welcomeShownDate: '',
  launchFilm: 'daily',
  launchFilmShownDate: '',
  launchFilmVoice: true,
  darkMode: false,
  animations: true,
  reminders: true,
  reminderDefaultMinutes: 10,
  tasksReminder: true,
  tasksReminderTime: '09:00',
};
