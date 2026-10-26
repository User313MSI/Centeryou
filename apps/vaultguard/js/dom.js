const Dom = (() => {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'class') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const child of [].concat(children)) {
      if (child === null || child === undefined) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function replaceChildren(node, children) {
    clear(node);
    for (const child of children) {
      if (child === null || child === undefined) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function emptyState(text) {
    return el('div', { class: 'empty', text });
  }

  function pill(text, kind) {
    return el('span', { class: `pill ${kind}`, text });
  }

  function chip(path, onRemove) {
    return el('span', { class: 'chip' }, [
      el('span', { class: 'chip-path', title: path, text: path }),
      el('button', { title: 'Remove', text: '✕', onclick: onRemove }),
    ]);
  }

  function scoreBar(score) {
    return el('div', { class: 'score-bar' }, [
      el('div', { style: { width: Math.min(100, Math.max(0, score)) + '%' } }),
    ]);
  }

  return { escapeHtml, el, clear, replaceChildren, emptyState, pill, chip, scoreBar };
})();
if (typeof window !== 'undefined') window.Dom = Dom;
if (typeof module !== 'undefined' && module.exports) module.exports = Dom;
