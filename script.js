(() => {
  'use strict';
  const TZ = 'Asia/Kolkata';
  const $ = (id) => document.getElementById(id);
  const state = { code: '', n: 4, maxAttempts: 8, guesses: [], input: '', finished: false, won: false, challengeDate: '', seed: '' };

  // A challenge day begins at 12:00 PM IST. Before noon, yesterday's challenge remains active.
  function getChallengeDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).reduce((o, p) => (o[p.type] = p.value, o), {});
    let date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    if (Number(parts.hour) < 12) date.setUTCDate(date.getUTCDate() - 1);
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  }
  function hashString(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function makeRng(seed) { let x = seed >>> 0; return () => { x += 0x6D2B79F5; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function generateDailyChallenge(dateKey) {
    const rng = makeRng(hashString(`MCC-CODEBREAKER-${dateKey}-v1`));
    const n = 4 + Math.floor(rng() * 7); // inclusive range 4–10
    const digits = Array.from({ length: 10 }, (_, i) => String(i));
    for (let i = digits.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [digits[i], digits[j]] = [digits[j], digits[i]]; }
    return { n, code: digits.slice(0, n).join('') };
  }
  function formatChallengeDate(key) { return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(+key.slice(0,4), +key.slice(4,6)-1, +key.slice(6,8), 12))); }
  function evaluateGuess(guess, secret) {
    // Return feedback for each exact guess position, not just aggregate counts.
    // Digits are unique in both sequences, so membership is unambiguous.
    const positions = guess.split('').map((digit, index) => {
      if (digit === secret[index]) return 'green';
      if (secret.includes(digit)) return 'yellow';
      return 'absent';
    });
    const green = positions.filter(status => status === 'green').length;
    const yellow = positions.filter(status => status === 'yellow').length;
    return { positions, green, yellow, absent: secret.length - green - yellow };
  }
  function storageKey() { return `mcc-codebreaker-${state.challengeDate}`; }
  function saveProgress() {
    try { localStorage.setItem(storageKey(), JSON.stringify({ guesses: state.guesses, finished: state.finished, won: state.won })); } catch (_) { /* Private browsing may disable storage; gameplay still works. */ }
  }
  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()) || 'null');
      if (saved && Array.isArray(saved.guesses)) {
        state.guesses = saved.guesses.filter(g => typeof g.value === 'string' && g.value.length === state.n && new Set(g.value).size === state.n).slice(0, state.maxAttempts);
        state.finished = !!saved.finished; state.won = !!saved.won;
      }
    } catch (_) { /* Ignore malformed local progress. */ }
  }
  function setMessage(text, type = '') { const el = $('message'); el.textContent = text; el.className = `message ${type}`; }
  function renderSlots() {
    const root = $('guessSlots'); root.innerHTML = '';
    for (let i = 0; i < state.n; i++) {
      const slot = document.createElement('div'); slot.className = `digit-slot ${state.input[i] ? 'filled' : ''} ${i === state.input.length && !state.finished ? 'active' : ''}`;
      slot.textContent = state.input[i] || '·'; root.appendChild(slot);
    }
    $('keypad').querySelectorAll('button[data-digit]').forEach(btn => { btn.disabled = state.finished || state.input.includes(btn.dataset.digit) || state.input.length >= state.n; });
    $('submitBtn').disabled = state.finished || state.input.length !== state.n;
    $('clearBtn').disabled = state.finished || !state.input.length;
  }
  function renderHistory() {
    const root = $('history'); root.innerHTML = '';
    $('historyCount').textContent = `${state.guesses.length} GUESS${state.guesses.length === 1 ? '' : 'ES'}`;
    if (!state.guesses.length) { root.innerHTML = '<div class="empty-log">Your attempts will appear here.<br><span>Awaiting first input…</span></div>'; return; }
    state.guesses.forEach((entry, index) => {
      const row = document.createElement('div'); row.className = 'history-row';
      const turn = document.createElement('span'); turn.className = 'turn'; turn.textContent = `#${String(index + 1).padStart(2, '0')}`;
      const digits = document.createElement('div'); digits.className = 'history-digits';
      const positions = entry.result.positions || evaluateGuess(entry.value, state.code).positions;
      entry.value.split('').forEach((d, digitIndex) => {
        const status = positions[digitIndex] || 'absent';
        const cell = document.createElement('span');
        cell.className = `history-digit ${status}`;
        cell.textContent = d;
        cell.title = status === 'green' ? 'Correct digit, correct position' : status === 'yellow' ? 'Correct digit, wrong position' : 'Digit not in the code';
        digits.appendChild(cell);
      });
      const feedback = document.createElement('div'); feedback.className = 'feedback';
      const count = document.createElement('span'); count.className = 'feedback-count'; count.textContent = `${entry.result.green}G · ${entry.result.yellow}Y`; feedback.appendChild(count);
      row.append(turn, digits, feedback); root.appendChild(row);
    });
    root.scrollTop = root.scrollHeight;
  }
  function updateStats() {
    $('codeLength').textContent = state.n;
    $('attemptsLeft').textContent = Math.max(0, state.maxAttempts - state.guesses.length);
    $('maxAttempts').textContent = state.maxAttempts;
    $('difficulty').textContent = state.n <= 5 ? 'STANDARD' : state.n <= 8 ? 'ADVANCED' : 'EXPERT';
  }
  function render() { renderSlots(); renderHistory(); updateStats(); }
  function buildKeypad() {
    const root = $('keypad'); root.innerHTML = '';
    for (let d = 0; d <= 9; d++) { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'key'; btn.dataset.digit = String(d); btn.textContent = d; btn.addEventListener('click', () => addDigit(String(d))); root.appendChild(btn); }
  }
  function addDigit(digit) {
    if (state.finished || state.input.length >= state.n) return;
    if (state.input.includes(digit)) { setMessage(`Digit ${digit} is already in your guess. Repeated digits aren't allowed.`, 'error'); return; }
    state.input += digit; setMessage('Sequence updated. Submit when you are ready.'); renderSlots();
  }
  function submitGuess() {
    if (state.finished || state.input.length !== state.n) return;
    const result = evaluateGuess(state.input, state.code);
    state.guesses.push({ value: state.input, result }); state.input = '';
    if (result.green === state.n) { state.finished = true; state.won = true; setMessage('Sequence decrypted. Excellent work!', 'success'); }
    else if (state.guesses.length >= state.maxAttempts) { state.finished = true; state.won = false; setMessage('No attempts remaining. The code has been revealed.', 'error'); }
    else setMessage(`${result.green} green · ${result.yellow} yellow · ${result.absent} absent. Keep deducing.`);
    saveProgress(); render();
    if (state.finished) showResult();
  }
  function showResult() {
    $('resultIcon').textContent = state.won ? '✓' : '×'; $('resultIcon').style.color = state.won ? 'var(--green)' : 'var(--yellow)';
    $('resultEyebrow').textContent = state.won ? 'CODE DECRYPTED' : 'MISSION ENDED';
    $('resultTitle').textContent = state.won ? 'Excellent work.' : 'Out of attempts.';
    $('resultText').textContent = state.won ? `You cracked today's code in ${state.guesses.length} of ${state.maxAttempts} attempts.` : 'The sequence remained encrypted. Come back for the next daily challenge.';
    $('revealedCode').textContent = state.code.split('').join('  '); $('resultModal').hidden = false;
  }
  function init() {
    state.challengeDate = getChallengeDate(); state.seed = `MCC-${state.challengeDate}`;
    const daily = generateDailyChallenge(state.challengeDate); state.n = daily.n; state.code = daily.code; state.maxAttempts = state.n + 4;
    $('challengeDate').textContent = formatChallengeDate(state.challengeDate); $('challengeId').textContent = state.seed;
    buildKeypad(); loadProgress(); render();
    if (state.finished) { setMessage(state.won ? "Today's code has already been decrypted on this browser." : "Today's attempts are complete on this browser.", state.won ? 'success' : 'error'); showResult(); }
    $('submitBtn').addEventListener('click', submitGuess);
    $('clearBtn').addEventListener('click', () => { state.input = ''; setMessage('Current guess cleared.'); renderSlots(); });
    $('closeModal').addEventListener('click', () => { $('resultModal').hidden = true; });
    document.addEventListener('keydown', e => {
      if (e.key >= '0' && e.key <= '9') addDigit(e.key);
      else if (e.key === 'Backspace' && !state.finished) { state.input = state.input.slice(0, -1); renderSlots(); }
      else if (e.key === 'Enter') submitGuess();
      else if (e.key === 'Escape') $('resultModal').hidden = true;
    });
    // Keep an already-open tab aligned with the noon IST challenge boundary.
    let activeDate = state.challengeDate;
    setInterval(() => { const next = getChallengeDate(); if (next !== activeDate) location.reload(); }, 30_000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && getChallengeDate() !== activeDate) location.reload(); });
  }
  init();
})();
