export {};
const storageKey = 'cedhu-accessibility';
const settings = { textSize: 'large', contrast: 'high', links: 'underlined', motion: 'reduced' } as const;
type Preference = keyof typeof settings;
const controls = document.querySelectorAll<HTMLInputElement>('[data-preference]');
const status = document.querySelector<HTMLElement>('[data-preference-status]');
const apply = () => {
  const preferences: Partial<Record<Preference, boolean>> = {};
  controls.forEach(control => {
    const key = control.dataset.preference as Preference;
    preferences[key] = control.checked;
    if (control.checked) document.documentElement.dataset[key] = settings[key];
    else delete document.documentElement.dataset[key];
  });
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Preferences still work without browser storage. */ }
};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  controls.forEach(control => { control.checked = saved?.[control.dataset.preference!] === true; });
} catch { /* Ignore invalid or unavailable local storage. */ }
apply();
controls.forEach(control => control.addEventListener('change', () => {
  apply();
  if (status) status.textContent = 'Preferencias actualizadas.';
}));
document.querySelector('[data-reset-preferences]')?.addEventListener('click', () => {
  controls.forEach(control => { control.checked = false; });
  apply();
  if (status) status.textContent = 'Se restablecieron las preferencias.';
});
