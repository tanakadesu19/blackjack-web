const { randomInt, randomUUID } = require('node:crypto');

function createDeck() {
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = ['♠', '♥', '♦', '♣'].flatMap(suit => ranks.map(rank => ({ rank, suit })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function score(hand) {
  let total = 0;
  let aces = 0;
  for (const { rank } of hand) {
    if (rank === 'A') aces++;
    else total += ['J', 'Q', 'K'].includes(rank) ? 10 : Number(rank);
  }
  total += aces;
  return aces && total + 10 <= 21 ? total + 10 : total;
}

function finish(game, outcome, message) {
  game.result = { outcome, message };
}

function start(deck = createDeck()) {
  const game = { deck, player: [], dealer: [], actions: [], dealerDrawScores: [], revision: randomUUID(), result: null };
  for (let i = 0; i < 2; i++) {
    game.player.push(deck.pop());
    game.dealer.push(deck.pop());
  }
  const playerNatural = score(game.player) === 21;
  const dealerNatural = score(game.dealer) === 21;
  if (playerNatural && dealerNatural) finish(game, 'draw', '双方ブラックジャック。引き分けです。');
  else if (playerNatural) finish(game, 'win', 'ブラックジャック！あなたの勝ちです。');
  else if (dealerNatural) finish(game, 'loss', 'ディーラーがブラックジャック。あなたの負けです。');
  return game;
}

function play(game, action) {
  game.revision = randomUUID();
  if (action === 'hit') {
    game.player.push(game.deck.pop());
    const playerScore = score(game.player);
    game.actions.push({ action, score: playerScore });
    if (playerScore > 21) finish(game, 'loss', 'バースト。あなたの負けです。');
    return;
  }

  const player = score(game.player);
  game.actions.push({ action, score: player });
  let dealer = score(game.dealer);
  while (dealer < 17) {
    game.dealer.push(game.deck.pop());
    dealer = score(game.dealer);
    game.dealerDrawScores.push(dealer);
  }
  if (dealer > 21) finish(game, 'win', 'ディーラーがバースト。あなたの勝ちです。');
  else if (player > dealer) finish(game, 'win', 'あなたの勝ちです。');
  else if (player < dealer) finish(game, 'loss', 'あなたの負けです。');
  else finish(game, 'draw', '引き分けです。');
}

function view({ game, stats }) {
  const dealer = game.result ? game.dealer : game.dealer.slice(0, 1);
  return {
    revision: game.revision,
    player: { cards: game.player, score: score(game.player) },
    dealer: { cards: game.result ? dealer : [...dealer, null], score: score(dealer) },
    result: game.result,
    ...(game.result && { replay: { actions: game.actions, dealerDrawScores: game.dealerDrawScores } }),
    stats
  };
}

module.exports = { start, play, view };
