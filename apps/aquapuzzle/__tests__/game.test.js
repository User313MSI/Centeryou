import {
  newBoard,
  findMatches,
  trySwap,
  resolveBoard,
  hasPossibleMove,
  shuffleBoard,
  coinsEarned,
  ROWS,
  COLS,
  GEM_TYPES,
} from '../src/game';

const seq = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('match-3 engine', () => {
  test('new board has no initial matches', () => {
    const board = newBoard();
    expect(findMatches(board)).toHaveLength(0);
    expect(hasPossibleMove(board)).toBe(true);
  });

  test('findMatches detects horizontal match', () => {
    const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    b[0][0] = 1; b[0][1] = 1; b[0][2] = 1;
    const m = findMatches(b);
    expect(m.length).toBeGreaterThanOrEqual(3);
  });

  test('findMatches detects vertical match', () => {
    const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    b[0][3] = 2; b[1][3] = 2; b[2][3] = 2;
    expect(findMatches(b).length).toBeGreaterThanOrEqual(3);
  });

  test('trySwap rejects non-adjacent cells', () => {
    const b = newBoard(seq([0.1]));
    expect(trySwap(b, 0, 0, 2, 2).ok).toBe(false);
  });

  test('trySwap rejects swap without match', () => {
    const b = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (r * COLS + c) % GEM_TYPES.length)
    );
    const res = trySwap(b, 0, 0, 0, 1);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('No match');
  });

  test('trySwap performs valid swap and original board untouched', () => {
    const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    b[0][0] = 1; b[0][1] = 2; b[0][2] = 2;
    b[1][0] = 2; b[1][1] = 1; b[1][2] = 1;
    const before = JSON.stringify(b);
    const res = trySwap(b, 0, 0, 0, 1);
    expect(res.ok).toBe(true);
    expect(JSON.stringify(b)).toBe(before);
  });

  test('resolveBoard clears matches and refills', () => {
    const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    b[0][0] = 1; b[0][1] = 1; b[0][2] = 1;
    const res = resolveBoard(b, seq([0.3, 0.6, 0.9]));
    expect(res.totalCleared).toBeGreaterThanOrEqual(3);
    expect(res.cascades).toBeGreaterThanOrEqual(1);
    for (const row of res.board) for (const v of row) expect(v).toBeGreaterThanOrEqual(0);
  });

  test('resolveBoard handles cascades', () => {
    const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    b[4][0] = 1; b[4][1] = 1; b[4][2] = 1; b[4][3] = 1;
    b[3][0] = 1; b[2][0] = 1; b[1][0] = 1;
    const res = resolveBoard(b, seq([0.5]));
    expect(res.totalCleared).toBeGreaterThanOrEqual(4);
  });

  test('shuffleBoard produces playable board', () => {
    const b = newBoard();
    const s = shuffleBoard(b);
    expect(findMatches(s)).toHaveLength(0);
    expect(hasPossibleMove(s)).toBe(true);
  });

  test('coinsEarned rewards cascades', () => {
    expect(coinsEarned(3, 1)).toBe(30);
    expect(coinsEarned(3, 2)).toBe(55);
  });
});
