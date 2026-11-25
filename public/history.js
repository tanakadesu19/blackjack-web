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

function validHand(hand) {
  return Array.isArray(hand) && hand.length >= 2 && hand.length <= 52 && hand.every(card =>
    typeof card?.rank === 'string' && /^(A|[2-9]|10|J|Q|K)$/.test(card.rank) &&
    ['♠', '♥', '♦', '♣'].includes(card.suit)
  );
}

function getReplay(round) {
  const replay = round.replay;
  if (!validHand(replay?.player) || !validHand(replay.dealer)) return null;
  const { player, dealer, actions, dealerDrawScores } = replay;
  if (!Array.isArray(actions) || !Array.isArray(dealerDrawScores) ||
      dealerDrawScores.length !== dealer.length - 2 || !dealerDrawScores.every(validScore)) return null;
  const hits = player.length - 2;
  const stood = actions.at(-1)?.action === 'stand';
  if (actions.length !== hits + Number(stood) || (!stood && dealerDrawScores.length) ||
      !actions.every((step, index) => step?.action === (index < hits ? 'hit' : 'stand') &&
        validScore(step.score))) return null;
  return replay;
}

function cardLabels(cards) {
  const list = document.createElement('span');
  list.className = 'history-cards';
  for (const { rank, suit } of cards) {
    const label = document.createElement('span');
    label.textContent = rank + suit;
    label.classList.toggle('red', suit === '♥' || suit === '♦');
    list.append(label);
  }
  return list;
}

function appendHand(parent, label, cards) {
  const line = document.createElement('div');
  line.className = 'history-hand';
  line.append(label, cardLabels(cards.slice(0, 2)));
  if (cards.length > 2) line.append('追加', cardLabels(cards.slice(2)));
  parent.append(line);
}

function renderRoundDetails(cell, round, replay) {
  if (!replay) {
    cell.textContent = '詳細データなし';
    return;
  }

  appendHand(cell, 'あなたの初期手札', replay.player);
  appendHand(cell, 'ディーラーの初期手札', replay.dealer);
  const steps = document.createElement('ol');
  steps.className = 'history-steps';
  replay.actions.forEach(({ action, score }, index) => {
    const step = document.createElement('li');
    step.append(action === 'hit' ? 'あなた: Hit ' : 'あなた: Stand ');
    if (action === 'hit') step.append(cardLabels([replay.player[index + 2]]), ' ');
    step.append(score + '点');
    steps.append(step);
  });
  replay.dealerDrawScores.forEach((score, index) => {
    const step = document.createElement('li');
    step.append('ディーラーが追加 ', cardLabels([replay.dealer[index + 2]]), ' ' + score + '点');
    steps.append(step);
  });
  if (steps.children.length) cell.append(steps);
  const result = document.createElement('p');
  result.textContent = outcomeLabels.get(round.outcome) + '（あなた ' + round.player +
    '点、ディーラー ' + round.dealer + '点）';
  cell.append(result);
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
  for (const [index, round] of rounds.entries()) {
    const row = document.createElement('tr');
    row.className = 'history-summary';
    const replay = getReplay(round);
    const time = document.createElement('time');
    time.dateTime = new Date(round.at).toISOString();
    const clock = document.createElement('span');
    clock.textContent = timeFormat.format(round.at);
    time.append(dateFormat.format(round.at) + ' ', clock);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'history-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.append(time);
    row.insertCell().append(toggle);
    const hands = row.insertCell();
    if (replay) {
      appendHand(hands, 'あなた', replay.player.slice(0, 2));
      appendHand(hands, 'ディーラー', replay.dealer.slice(0, 2));
    } else {
      hands.textContent = '詳細データなし';
    }
    row.insertCell().textContent = round.player;
    row.insertCell().textContent = round.dealer;
    row.insertCell().textContent = outcomeLabels.get(round.outcome);
    const details = document.createElement('tr');
    details.id = 'history-detail-' + index;
    details.className = 'history-detail';
    details.hidden = true;
    const detailCell = details.insertCell();
    detailCell.colSpan = row.cells.length;
    toggle.setAttribute('aria-controls', details.id);
    row.addEventListener('click', () => {
      if (details.hidden && !detailCell.hasChildNodes()) renderRoundDetails(detailCell, round, replay);
      details.hidden = !details.hidden;
      toggle.setAttribute('aria-expanded', String(!details.hidden));
    });
    rows.append(row, details);
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
      player: player.score, dealer: dealer.score,
      replay: game.replay && { ...game.replay, player: player.cards, dealer: dealer.cards }
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
