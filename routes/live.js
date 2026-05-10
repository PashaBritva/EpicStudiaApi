const express = require('express');
const { db } = require('../bin/db');
const { authenticateToken, checkAdmin } = require('./users');
require('dotenv').config();

const router = express.Router();
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
router.use(express.json());

router.get('/', authenticateToken, (req, res) => {
    db.query(
        'SELECT id, title, description, streamer, status, viewerCount FROM livestreams ORDER BY createdAt DESC',
        (err, results) => {
            if (err) return res.status(500).send('Ошибка при получении трансляций');
            res.status(200).json(results);
        }
    );
});

router.get('/:id', authenticateToken, (req, res) => {
    db.query(
        'SELECT id, title, description, streamer, status, viewerCount FROM livestreams WHERE id = ?',
        [req.params.id],
        (err, results) => {
            if (err) return res.status(500).send('Ошибка при получении трансляции');
            if (results.length === 0) return res.status(404).send('Трансляция не найдена');
            res.status(200).json(results[0]);
        }
    );
});

router.post('/', authenticateToken, checkAdmin, (req, res) => {
    const { title, description, streamer } = req.body;
    if (!title) return res.status(400).send('Недостаточно данных');

    db.query(
        'INSERT INTO livestreams (title, description, streamer, status) VALUES (?, ?, ?, ?)',
        [title, description || '', streamer || 'Неизвестный', 'upcoming'],
        (err, results) => {
            if (err) return res.status(500).send('Ошибка при создании трансляции');
            res.status(201).json({ message: 'Трансляция создана', id: results.insertId });
        }
    );
});

router.patch('/:id/status', authenticateToken, checkAdmin, (req, res) => {
    const { status } = req.body;
    if (!status || !['live', 'upcoming', 'ended'].includes(status)) {
        return res.status(400).send('Некорректный статус');
    }

    db.query(
        'UPDATE livestreams SET status = ? WHERE id = ?',
        [status, req.params.id],
        (err) => {
            if (err) return res.status(500).send('Ошибка при обновлении статуса');
            res.status(200).send('Статус обновлён');
        }
    );
});

router.get('/:id/stream', authenticateToken, (req, res) => {
    db.query(
        'SELECT status FROM livestreams WHERE id = ?',
        [req.params.id],
        (err, results) => {
            if (err) return res.status(500).send('Ошибка при проверке трансляции');
            if (results.length === 0) return res.status(404).send('Трансляция не найдена');
            if (results[0].status !== 'live') {
                return res.status(403).send('Трансляция недоступна');
            }
            res.status(200).json({ url: `${process.env.STREAM_URL || 'rtmp://localhost/live'}/${req.params.id}` });
        }
    );
});

module.exports = router;
