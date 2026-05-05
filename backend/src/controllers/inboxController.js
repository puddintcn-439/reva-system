const db = require('../config/database');

const MANAGE_ROLES = new Set(['superadmin', 'admin', 'manager']);

// ─── Threads ──────────────────────────────────────────────────────────────────

/** GET /inbox/threads — list all threads with last-message preview */
const getThreads = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        t.id,
        t.title,
        t.status,
        t.created_at,
        t.updated_at,
        u.full_name  AS created_by_name,
        u.username   AS created_by_username,
        lm.body      AS last_message_body,
        lm.created_at AS last_message_at,
        lu.full_name  AS last_message_sender,
        (SELECT COUNT(*) FROM inbox_messages WHERE thread_id = t.id)::int AS message_count
      FROM inbox_threads t
      LEFT JOIN users u  ON u.id = t.created_by
      LEFT JOIN LATERAL (
        SELECT m.body, m.created_at, m.sender_id
        FROM   inbox_messages m
        WHERE  m.thread_id = t.id
        ORDER  BY m.created_at DESC
        LIMIT  1
      ) lm ON TRUE
      LEFT JOIN users lu ON lu.id = lm.sender_id
      ORDER BY COALESCE(lm.created_at, t.created_at) DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

/** POST /inbox/threads — create a new thread */
const createThread = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống' });
    }
    const result = await db.query(
      `INSERT INTO inbox_threads (title, created_by) VALUES ($1, $2) RETURNING *`,
      [title.trim().slice(0, 200), req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

/** PATCH /inbox/threads/:id/close — close a thread (inbox:manage) */
const closeThread = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE inbox_threads SET status='closed', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hội thoại' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

/** PATCH /inbox/threads/:id/reopen — reopen a closed thread (inbox:manage) */
const reopenThread = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE inbox_threads SET status='open', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hội thoại' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

/** DELETE /inbox/threads/:id — delete thread + all messages (inbox:manage) */
const deleteThread = async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM inbox_threads WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy hội thoại' });
    res.json({ success: true, message: 'Đã xóa hội thoại' });
  } catch (err) { next(err); }
};

// ─── Messages ─────────────────────────────────────────────────────────────────

/** GET /inbox/threads/:id/messages — paginated messages (cursor: after) */
const getMessages = async (req, res, next) => {
  try {
    const { after } = req.query; // ISO timestamp — for polling: only fetch newer messages

    // Verify thread exists
    const threadRes = await db.query(
      `SELECT id, title, status FROM inbox_threads WHERE id=$1`,
      [req.params.id]
    );
    if (!threadRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hội thoại' });
    }

    let msgQuery;
    let msgParams;
    if (after) {
      msgQuery = `
        SELECT m.id, m.body, m.created_at,
               u.id AS sender_id, u.full_name AS sender_name, u.username AS sender_username, u.role AS sender_role
        FROM   inbox_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE  m.thread_id = $1 AND m.created_at > $2
        ORDER  BY m.created_at ASC
      `;
      msgParams = [req.params.id, after];
    } else {
      msgQuery = `
        SELECT m.id, m.body, m.created_at,
               u.id AS sender_id, u.full_name AS sender_name, u.username AS sender_username, u.role AS sender_role
        FROM   inbox_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE  m.thread_id = $1
        ORDER  BY m.created_at ASC
        LIMIT  200
      `;
      msgParams = [req.params.id];
    }

    const msgRes = await db.query(msgQuery, msgParams);
    res.json({ success: true, thread: threadRes.rows[0], data: msgRes.rows });
  } catch (err) { next(err); }
};

/** POST /inbox/threads/:id/messages — post a message (thread must be open) */
const postMessage = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
    }

    // Check thread exists and is open
    const threadRes = await db.query(
      `SELECT id, status FROM inbox_threads WHERE id=$1`,
      [req.params.id]
    );
    if (!threadRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hội thoại' });
    }
    if (threadRes.rows[0].status === 'closed') {
      return res.status(409).json({ success: false, message: 'Hội thoại đã đóng, không thể gửi tin nhắn' });
    }

    const result = await db.query(
      `INSERT INTO inbox_messages (thread_id, sender_id, body) VALUES ($1, $2, $3)
       RETURNING id, body, created_at, sender_id`,
      [req.params.id, req.user.id, body.trim().slice(0, 4000)]
    );

    // Update thread updated_at for sort order
    await db.query(`UPDATE inbox_threads SET updated_at=NOW() WHERE id=$1`, [req.params.id]);

    const msg = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        ...msg,
        sender_name:     req.user.full_name,
        sender_username: req.user.username,
        sender_role:     req.user.role,
      },
    });
  } catch (err) { next(err); }
};

/** DELETE /inbox/messages/:id — delete own message or any (inbox:manage) */
const deleteMessage = async (req, res, next) => {
  try {
    const msgRes = await db.query(`SELECT id, sender_id FROM inbox_messages WHERE id=$1`, [req.params.id]);
    if (!msgRes.rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn' });

    const msg = msgRes.rows[0];
    const canManage = MANAGE_ROLES.has(req.user.role);
    const isOwn = msg.sender_id === req.user.id;

    if (!canManage && !isOwn) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa tin nhắn này' });
    }

    await db.query(`DELETE FROM inbox_messages WHERE id=$1`, [req.params.id]);
    res.json({ success: true, message: 'Đã xóa tin nhắn' });
  } catch (err) { next(err); }
};

module.exports = { getThreads, createThread, closeThread, reopenThread, deleteThread, getMessages, postMessage, deleteMessage };
