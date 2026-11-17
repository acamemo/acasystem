// Catalogo locale: fixture e interazioni dimostrative, nessuna API/backend.
const layers = (label) => `<span class="aca-m__outer"><span class="aca-m__face"><span class="aca-m__content"><span class="aca-m__label">${label}</span></span></span></span>`;
const button = (label, tone, click, disabled = false) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `aca-m aca-pill aca-md aca-m--press ${tone ? `aca-m--${tone}` : ''}`;
  el.disabled = disabled;
  el.innerHTML = layers(label);
  el.addEventListener('click', click);
  return el;
};
const result = document.querySelector('#kit-result');
document.querySelector('#account-actions').append(
  button('Salva', 'primary', () => { result.textContent = 'Modifica salvata nella dimostrazione'; }),
  button('Annulla', 'quiet', () => { result.textContent = 'Modifica annullata'; })
);
const dialog = document.querySelector('dialog');
document.querySelector('#control-actions').append(
  button('Dettagli', 'quiet', () => dialog.showModal()),
  button('Non disponibile', 'quiet', () => {}, true)
);
document.querySelector('#dialog-actions').append(button('Chiudi', 'primary', () => dialog.close()));
document.querySelector('[role="switch"]').addEventListener('click', (event) => {
  const el = event.currentTarget;
  el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true'));
});
document.querySelectorAll('.glass-kit__link').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.glass-kit__link').forEach((item) => item.removeAttribute('aria-current'));
  link.setAttribute('aria-current', 'location');
}));
const fixture = (mode) => {
  const worst = mode === 'worst';
  const person = worst ? 'Alessandra Maria Wiśniewska-Kowalczyk' : 'Mattia';
  document.querySelector('[data-person]').textContent = person;
  document.querySelector('[name="username"]').value = person;
  const list = document.querySelector('#activity-list');
  list.replaceChildren();
  const rows = mode === 'empty' ? [] : [
    [person, worst ? 'Ha aggiornato il profilo «Casa principale — soggiorno, cucina e zona notte»' : 'Ha aggiornato il profilo Principale'],
    ['Jo', 'HA ha accettato il comando della luce'],
    ['李明', worst ? 'Diagnostica: centrale-domestica-soggiorno-piano-superiore.local non raggiungibile' : 'Ha aperto Tavano'],
  ];
  if (!rows.length) list.textContent = 'Nessuna attività';
  for (const [name, action] of rows) {
    const row = document.createElement('div'); row.className = 'glass-kit__activity-row';
    const avatar = document.createElement('span'); avatar.className = 'glass-kit__avatar'; avatar.textContent = Array.from(name)[0]; avatar.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div'); content.className = 'glass-kit__activity-text';
    const title = document.createElement('strong'); title.textContent = name;
    const detail = document.createElement('p'); detail.textContent = action; content.append(title, detail);
    const time = document.createElement('time'); time.className = 'glass-kit__activity-time'; time.textContent = '14:32';
    row.append(avatar, content, time); list.append(row);
  }
  document.querySelectorAll('[data-data]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.data === mode)));
  const url = new URL(location.href); url.searchParams.set('data', mode); history.replaceState(null, '', url);
};
document.querySelectorAll('[data-data]').forEach((el) => el.addEventListener('click', () => fixture(el.dataset.data)));
fixture(new URL(location.href).searchParams.get('data') || 'demo');
