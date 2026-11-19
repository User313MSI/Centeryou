/**
 * Script anti-flash exécuté avant le premier rendu (utilisé par `src/app/layout.tsx`) :
 * applique la classe `.dark` sur <html> si le thème sombre est mémorisé dans le
 * localStorage (même clé `centeryou-v1` que le store Zustand).
 *
 * Constante partagée avec `src/middleware.ts` : la CSP `script-src` autorise ce
 * script inline par son **hash SHA-256** (pas de 'unsafe-inline'), calculé à
 * partir de cette chaîne exacte.
 */
export const themeInitScript = `(function(){try{var d=localStorage.getItem('centeryou-v1');if(!d)return;var s=JSON.parse(d);var t=s&&s.state&&s.state.settings&&s.state.settings.theme;if(t==='sombre'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
