const statusLine = document.querySelector('#status');
const retry = document.querySelector('#retry');
const buttons = ['hit', 'stand', 'new'].map(id => document.getElementById(id));
const hands = {
  dealer: document.querySelector('#dealer-cards'),
  player: document.querySelector('#player-cards')
};
let game;
let pending = false;

function renderHand(name, hand) {
  const list = hands[name];
  document.querySelector('#' + name + '-score').textContent = hand.score;
  while (list.children.length > hand.cards.length) list.lastElementChild.remove();
  hand.cards.forEach((card, index) => {
    const key = card ? card.rank + card.suit : 'hidden';
    const previous = list.children[index];
    if (previous?.dataset.card === key) return;

    const item = document.createElement('li');
    item.className = 'card';
    item.dataset.card = key;
    const face = document.createElement('span');
    face.setAttribute('aria-hidden', 'true');
    item.append(face);
    if (card) {
      item.setAttribute('aria-label', card.suit + ' ' + card.rank);
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.setAttribute('aria-hidden', 'true');
      rank.textContent = card.rank;
      item.append(rank);
      face.textContent = card.suit;
      item.classList.toggle('red', ['♥', '♦'].includes(card.suit));
    } else {
      item.classList.add('back');
      item.setAttribute('aria-label', '非公開カード');
      face.textContent = '◆';
    }
    if (previous) previous.replaceWith(item);
    else list.append(item);
  });
}

function render() {
  renderHand('dealer', game.dealer);
  renderHand('player', game.player);
  for (const [name, count] of Object.entries(game.stats)) {
    document.getElementById(name).textContent = count;
  }
  statusLine.textContent = game.result?.message || 'Hitでカードを引くか、Standで勝負してください。';
}

async function request(action) {
  if (pending) return;
  pending = true;
  retry.hidden = true;
  buttons.forEach(button => { button.disabled = true; });
  try {
    const options = action ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, revision: game.revision })
    } : {};
    let response = await fetch('/api/game', options);
    if (response.status === 409) response = await fetch('/api/game');
    if (!response.ok) throw new Error('Game request failed');
    const next = await response.json();
    if (action === 'new' && next.revision !== game.revision) {
      Object.values(hands).forEach(hand => hand.replaceChildren());
    }
    game = next;
    render();
    buttons.forEach(button => {
      button.disabled = (button.id === 'new') !== Boolean(game.result);
    });
  } catch {
    statusLine.textContent = 'ゲームに接続できませんでした。再読み込みしてください。';
    retry.hidden = false;
  } finally {
    pending = false;
  }
}

buttons.forEach(button => button.addEventListener('click', () => request(button.id)));
retry.addEventListener('click', () => request());
request();
