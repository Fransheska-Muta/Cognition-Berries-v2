// routes/settings.js
const express = require('express');
const router = express.Router();

module.exports = function (db) {
  const usersCol = () => db.collection('Users');
  const txCol = () => db.collection('transactions');
  const postsCol = () => db.collection('forum-posts');
  const repliesCol = () => db.collection('forum-replies');

  const base64 = require('base-64');

  // Basic Auth (reuse your server.js logic but scoped for routes)
  async function basicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Missing Authorization Header' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const decoded = base64.decode(base64Credentials);
    const [email, password] = decoded.split(':');

    try {
      const user = await usersCol().findOne({ email });
      if (!user || base64.decode(user.password) !== password) {
        return res.status(401).json({ error: 'Invalid Credentials' });
      }
      req.user = user; // attach user to req
      next();
    } catch (err) {
      res.status(500).json({ error: 'Authentication error' });
    }
  }

  // === Update password ===
  router.put('/password', basicAuth, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    await usersCol().updateOne(
      { _id: req.user._id },
      { $set: { password: base64.encode(newPassword), passwordChangedAt: new Date() } }
    );

    res.json({ ok: true });
  });

  // === Update notifications ===
  router.put('/notifications', basicAuth, async (req, res) => {
    const updates = req.body;
    await usersCol().updateOne({ _id: req.user._id }, { $set: updates });
    res.json({ ok: true, notifications: updates.notifications });
  });

  // === Export data (JSON) ===
  router.get('/export', basicAuth, async (req, res) => {
    const userId = req.user._id;

    const [txns, posts, replies] = await Promise.all([
      txCol().find({ userId }).toArray().catch(() => []),
      postsCol().find({ userId }).toArray().catch(() => []),
      repliesCol().find({ userId }).toArray().catch(() => []),
    ]);

    const exportBlob = {
      user: { ...req.user, password: undefined },
      transactions: txns,
      forumPosts: posts,
      forumReplies: replies,
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="cognition-berries-account-export.json"');
    res.status(200).send(JSON.stringify(exportBlob, null, 2));
  });

  // === Delete account (soft-delete) ===
  router.delete('/delete', basicAuth, async (req, res) => {
    const when = new Date();
    const anonymizedEmail = `deleted+${when.getTime()}@example.invalid`;

    await usersCol().updateOne(
      { _id: req.user._id },
      {
        $set: {
          deletedAt: when,
          isActive: false,
          email: anonymizedEmail,
          name: '[deleted]',
          phone: '',
        },
      }
    );

    res.json({ ok: true, deletedAt: when.toISOString() });
  });

  return router;
};
