const historyKey = 'blackjack.history.v1';
const outcomeLabels = new Map([['win', '勝ち'], ['loss', '負け'], ['draw', '引き分け']]);
const historyMessage = document.querySelector('#history-message');
const clearHistoryButton = document.querySelector('#clear-history');
const dateFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'short' });
const timeFormat = new Intl.DateTimeFormat('ja-JP', { timeStyle: 'medium' });
let historyState = { rounds: [], clearedRevision: null };

function validScore(value) {
  return Number.isInteger(value) && value >= 2 && value <= 31;
}

function readHistory() {
  let raw;
  try {
    raw = localStorage.getItem(historyKey);
  } catch {
    historyMessage.textContent = 'このブラウザでは履歴を保存できません。';
    return;
  }

  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    saved = null;
  }
  const clearedRevision = typeof saved?.clearedRevision === 'string' ? saved.clearedRevision : null;
  const rounds = new Map();
  if (Array.isArray(saved?.rounds)) {
    for (const round of saved.rounds) {
      if (typeof round?.id !== 'string' || !round.id || round.id === clearedRevision ||
          !Number.isInteger(round.at) || round.at <= 0 || round.at > 8.64e15 ||
          !outcomeLabels.has(round.outcome) || !validScore(round.player) || !validScore(round.dealer)) continue;
      if (!rounds.has(round.id)) rounds.set(round.id, round);
    }
  }
  historyState = { rounds: [...rounds.values()].sort((a, b) => b.at - a.at), clearedRevision };
}

function saveHistory(next) {
  try {
    localStorage.setItem(historyKey, JSON.stringify(next));
    historyState = next;
    historyMessage.textContent = '';
    return true;
  } catch {
    historyMessage.textContent = '履歴を保存できませんでした。';
    return false;
  }
}

function renderHistory() {
  const { rounds } = historyState;
  const totals = { total: rounds.length, win: 0, loss: 0, draw: 0, current: 0, best: 0 };
  for (const round of rounds.slice().reverse()) {
    totals[round.outcome]++;
    totals.current = round.outcome === 'win' ? totals.current + 1 : 0;
    totals.best = Math.max(totals.best, totals.current);
  }
  totals.rate = new Intl.NumberFormat('ja-JP', {
    style: 'percent', maximumFractionDigits: 1
  }).format(totals.total ? totals.win / totals.total : 0);
  for (const [name, value] of Object.entries(totals)) {
    document.getElementById('record-' + name).textContent = value;
  }

  const table = document.querySelector('#history-table');
  const rows = document.createDocumentFragment();
  for (const round of rounds) {
    const row = document.createElement('tr');
    const time = document.createElement('time');
    time.dateTime = new Date(round.at).toISOString();
    const clock = document.createElement('span');
    clock.textContent = timeFormat.format(round.at);
    time.append(dateFormat.format(round.at) + ' ', clock);
    row.insertCell().append(time);
    row.insertCell().textContent = round.player;
    row.insertCell().textContent = round.dealer;
    row.insertCell().textContent = outcomeLabels.get(round.outcome);
    rows.append(row);
  }
  document.querySelector('#history-rows').replaceChildren(rows);
  table.hidden = rounds.length === 0;
  document.querySelector('#history-empty').hidden = !table.hidden;
  clearHistoryButton.disabled = table.hidden;
}

function recordRound(game) {
  if (!game.result) return;
  readHistory();
  const { revision, result, player, dealer } = game;
  if (revision !== historyState.clearedRevision && !historyState.rounds.some(round => round.id === revision)) {
    const round = {
      id: revision, at: Date.now(), outcome: result.outcome,
      player: player.score, dealer: dealer.score
    };
    saveHistory({ ...historyState, rounds: [round, ...historyState.rounds] });
  }
  renderHistory();
}

function clearRounds(game) {
  if (!window.confirm('対戦履歴をすべて削除しますか？')) return;
  readHistory();
  const clearedRevision = game?.result ? game.revision : historyState.rounds[0]?.id ?? historyState.clearedRevision;
  if (saveHistory({ rounds: [], clearedRevision })) historyMessage.textContent = '対戦履歴を削除しました。';
  renderHistory();
}

window.addEventListener('storage', event => {
  if (event.key !== historyKey && event.key !== null) return;
  readHistory();
  renderHistory();
});
readHistory();
renderHistory();
