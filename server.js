const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイル配信
app.use(express.static(path.join(__dirname)));

// API エンドポイント
app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from Railway!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// 環境変数テスト用エンドポイント
app.get('/api/env-test', (req, res) => {
  res.json({
    testKey: process.env.TEST_KEY || 'not set',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
