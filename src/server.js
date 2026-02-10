const express = require('express');
const multer = require('multer');
const { evaluateJob } = require('../engine/evaluateJob');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// MVP: evaluation endpoint wired to engine stub
app.post('/evaluate', upload.single('submission'), async (req, res) => {
  const { challengeId } = req.body || {};

  if (!challengeId || !req.file) {
    return res.status(400).json({
      error: 'Missing challengeId or submission file',
    });
  }

  try {
    const result = await evaluateJob({
      challengeId,
      submissionBuffer: req.file.buffer,
      filename: req.file.originalname,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Evaluation error:', err);
    return res.status(500).json({
      error: 'Internal evaluation error',
    });
  }
});

module.exports = app;
