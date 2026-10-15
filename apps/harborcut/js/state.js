const HarborState = (() => {
  const EMPTY = () => ({
    version: 1,
    media: [],
    tracks: [
      { id: 'v1', kind: 'video', name: 'V1', clips: [] },
      { id: 'a1', kind: 'audio', name: 'A1', clips: [] },
    ],
    duration: 0,
  });

  let state = EMPTY();
  let undoStack = [];
  let redoStack = [];
  const listeners = [];

  function notify() {
    listeners.forEach((cb) => cb());
  }

  function serialize() {
    return JSON.stringify(state);
  }

  function pushUndo() {
    undoStack.push(serialize());
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
  }

  return {
    get state() { return state; },
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },
    onChange(cb) { listeners.push(cb); },
    notify,

    mutate(fn, { undoable = true } = {}) {
      if (undoable) pushUndo();
      fn(state);
      this.recomputeDuration();
      notify();
    },

    undo() {
      if (!undoStack.length) return false;
      redoStack.push(serialize());
      state = JSON.parse(undoStack.pop());
      this.recomputeDuration();
      notify();
      return true;
    },

    redo() {
      if (!redoStack.length) return false;
      undoStack.push(serialize());
      state = JSON.parse(redoStack.pop());
      this.recomputeDuration();
      notify();
      return true;
    },

    recomputeDuration() {
      let end = 0;
      for (const t of state.tracks) {
        for (const c of t.clips) end = Math.max(end, c.start + c.duration);
      }
      state.duration = end;
    },

    loadProject(data) {
      pushUndo();
      state = data;
      if (!Array.isArray(state.tracks) || !Array.isArray(state.media)) throw new Error('Invalid project');
      this.recomputeDuration();
      notify();
    },

    newProject() {
      pushUndo();
      state = EMPTY();
      notify();
    },
  };
})();
window.HarborState = HarborState;
