/** Global preset themes (ids stable for localStorage). */
export type ThemePreset = { id: string; label: string };

export const DEFAULT_THEME_PRESETS: ThemePreset[] = [
  { id: 'theme-daily', label: 'Daily life' },
  { id: 'theme-travel', label: 'Travel' },
  { id: 'theme-food', label: 'Food' },
  { id: 'theme-work', label: 'Work / school' },
  { id: 'theme-hobbies', label: 'Hobbies' },
  { id: 'theme-family', label: 'Family & people' },
];
