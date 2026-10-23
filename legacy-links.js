'use strict';
// Preserve links shared before the strategic application moved to /manager.
(() => {
  const legacyPages = new Set(['home', 'analysis', 'mapping', 'app', 'plans', 'login', 'register', 'account', 'adminLogin', 'admin']);
  const hash = location.hash.slice(1);
  const page = hash.split(':')[0];
  if (legacyPages.has(page) || hash.startsWith('section-')) {
    location.replace('/manager' + location.search + location.hash);
  }
})();
