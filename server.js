const express = require('express');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { start, play, view } = require('./game');

const app = express();
const sessions = new Map();
const sessionLifetime = 2 * 60 * 60 * 1000;
const secureCookie = process.env.NODE_ENV === 'production';
const cookieName = secureCookie ? '__Host-blackjack' : 'blackjack';

function getSession(req) {
  const cookie = (req.get('cookie') || '').split(';').map(value => value.trim())
    .find(value => value.startsWith(cookieName + '='));
  const session = sessions.get(cookie?.slice(cookieName.length + 1));
  return session?.expires > Date.now() ? session : undefined;
}

function recordResult(session) {
  const result = session.game.result;
  if (result) session.stats[result.outcome]++;
}

setInterval(() => {
  for (const [id, session] of sessions) {
    if (session.expires <= Date.now()) sessions.delete(id);
  }
}, 60_000).unref();

app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/game', (req, res) => {
  let session = getSession(req);
  if (!session) {
    const id = randomBytes(32).toString('hex');
    session = {
      game: start(),
      stats: { win: 0, loss: 0, draw: 0 },
      expires: Date.now() + sessionLifetime
    };
    recordResult(session);
    sessions.set(id, session);
    res.cookie(cookieName, id, {
      httpOnly: true, sameSite: 'strict', secure: secureCookie, path: '/', maxAge: sessionLifetime
    });
  }
  res.json(view(session));
});

app.post('/api/game', (req, res, next) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'JSON 形式で操作を送信してください。' });
  }
  next();
}, express.json({ limit: '1kb' }), (req, res) => {
  const { action, revision } = req.body ?? {};
  if (!['hit', 'stand', 'new'].includes(action) || typeof revision !== 'string') {
    return res.status(400).json({ error: '操作の内容が無効です。' });
  }

  const session = getSession(req);
  if (!session) return res.status(409).json({ error: 'セッションが終了しました。' });
  const { game } = session;
  if (revision !== game.revision || (action === 'new') !== Boolean(game.result)) {
    return res.status(409).json({ error: '現在のゲームではこの操作を実行できません。' });
  }

  if (action === 'new') session.game = start();
  else play(game, action);
  recordResult(session);
  res.json(view(session));
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API が見つかりません。' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status < 500 ? '送信内容を確認してください。' : 'サーバーでエラーが発生しました。' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => console.log(`Blackjack: http://localhost:${port}`));
