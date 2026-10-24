(() => {
  const root = document.documentElement;
  const preference = matchMedia('(prefers-color-scheme: light)');
  let saved;
  try { saved = localStorage.getItem('diretor-theme'); } catch {}
  const apply = theme => {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f8f7' : '#10181e');
    const button = document.querySelector('#theme-toggle');
    if (button) {
      button.textContent = theme === 'dark' ? '☀' : '☾';
      button.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    }
  };
  apply(saved === 'light' || saved === 'dark' ? saved : preference.matches ? 'light' : 'dark');
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelector('#theme-toggle')?.addEventListener('click', () => {
      saved = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(saved);
      try { localStorage.setItem('diretor-theme', saved); } catch {}
    });
  });
  preference.addEventListener('change', event => { if (!saved) apply(event.matches ? 'light' : 'dark'); });
})();
