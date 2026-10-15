export const FISH = {
  guppy:     { name: 'Guppy',       emoji: '🐠', price: 0,   color: '#ff9a3c' },
  tetra:     { name: 'Neon Tetra',  emoji: '🐟', price: 150, color: '#4fd6ff' },
  clownfish: { name: 'Clownfish',   emoji: '🐡', price: 400, color: '#ff7a3c' },
  angelfish: { name: 'Angelfish',   emoji: '🐠', price: 900, color: '#e8d44d' },
  lionfish:  { name: 'Lionfish',    emoji: '🐡', price: 1800, color: '#c04af0' },
  seahorse:  { name: 'Seahorse',    emoji: '🦄', price: 3500, color: '#7cffb2' },
  turtle:    { name: 'Sea Turtle',  emoji: '🐢', price: 6000, color: '#5ce07a' },
  octopus:   { name: 'Octopus',     emoji: '🐙', price: 10000, color: '#e05c8a' },
  shark:     { name: 'Shark',       emoji: '🦈', price: 18000, color: '#8aa7ff' },
  whale:     { name: 'Whale',        emoji: '🐳', price: 50000, color: '#6cc4ff' },
};

export const GEM_TYPES = ['🐟', '🐠', '🐡', '🦐', '🪸', '🐚'];

export const ROWS = 8;
export const COLS = 8;

export function newBoard(rng = Math.random) {
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(Math.floor(rng() * GEM_TYPES.length));
    board.push(row);
  }
  while (findMatches(board).length > 0) {
    for (const m of findMatches(board)) {
      board[m.r][m.c] = Math.floor(rng() * GEM_TYPES.length);
    }
  }
  return board;
}

export function findMatches(board) {
  const matches = [];
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && board[r][c] === board[r][c - 1] && board[r][c] !== null) run++;
      else {
        if (run >= 3) for (let k = c - run; k < c; k++) matches.push({ r, c: k });
        run = 1;
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && board[r][c] === board[r - 1][c] && board[r][c] !== null) run++;
      else {
        if (run >= 3) for (let k = r - run; k < r; k++) matches.push({ r: k, c });
        run = 1;
      }
    }
  }
  return matches;
}

export function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function trySwap(board, r1, c1, r2, c2) {
  if (!inBounds(r1, c1) || !inBounds(r2, c2)) return { ok: false, error: 'Out of bounds' };
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return { ok: false, error: 'Not adjacent' };
  const b = board.map((row) => [...row]);
  [b[r1][c1], b[r2][c2]] = [b[r2][c2], b[r1][c1]];
  const matches = findMatches(b);
  if (matches.length === 0) return { ok: false, error: 'No match' };
  return { ok: true, board: b };
}

export function resolveBoard(board, rng = Math.random) {
  const b = board.map((row) => [...row]);
  let totalCleared = 0;
  let cascades = 0;
  let matches = findMatches(b);
  while (matches.length > 0) {
    totalCleared += matches.length;
    cascades++;
    const cleared = new Set(matches.map((m) => `${m.r},${m.c}`));
    for (const key of cleared) {
      const [r, c] = key.split(',').map(Number);
      b[r][c] = null;
    }
    for (let c = 0; c < COLS; c++) {
      const col = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (b[r][c] !== null) col.push(b[r][c]);
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        const idx = ROWS - 1 - r;
        b[r][c] = idx < col.length ? col[idx] : Math.floor(rng() * GEM_TYPES.length);
      }
    }
    matches = findMatches(b);
  }
  return { board: b, totalCleared, cascades };
}

export function hasPossibleMove(board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) {
        const t = trySwap(board, r, c, r, c + 1);
        if (t.ok) return true;
      }
      if (r + 1 < ROWS) {
        const t = trySwap(board, r, c, r + 1, c);
        if (t.ok) return true;
      }
    }
  }
  return false;
}

export function shuffleBoard(board, rng = Math.random) {
  let b = board.map((row) => [...row]);
  let guard = 0;
  do {
    const flat = b.flat();
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    b = [];
    for (let r = 0; r < ROWS; r++) b.push(flat.slice(r * COLS, (r + 1) * COLS));
    guard++;
  } while (guard < 50 && (!hasPossibleMove(b) || findMatches(b).length > 0));
  return b;
}

export function coinsEarned(totalCleared, cascades) {
  return totalCleared * 10 + (cascades - 1) * 25;
}
