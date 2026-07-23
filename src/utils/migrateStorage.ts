export function migrateWinampStorageKeys(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  const keyMigrations: [string, string][] = [
    ['winamp_eq_bands', 'spinamp_eq_bands'],
    ['winamp_eq_custom_presets', 'spinamp_eq_custom_presets'],
    ['winamp_eq_is_on', 'spinamp_eq_is_on'],
    ['winamp_eq_preamp', 'spinamp_eq_preamp'],
    ['winamp_eq_selected_preset', 'spinamp_eq_selected_preset'],
    ['winamp_retro_stats', 'spinamp_retro_stats'],
    ['winamp_screen_appearance', 'spinamp_screen_appearance'],
    ['winamp_screen_font', 'spinamp_screen_font'],
    ['winamp_skin_transition', 'spinamp_skin_transition'],
    ['winamp_vis_sensitivity', 'spinamp_vis_sensitivity'],
    ['winamp_vis_theme', 'spinamp_vis_theme'],
  ];

  for (const [oldKey, newKey] of keyMigrations) {
    try {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldValue);
        localStorage.removeItem(oldKey);
      }
    } catch (e) {
      console.warn(`Failed to migrate localStorage key from ${oldKey} to ${newKey}:`, e);
    }
  }
}
