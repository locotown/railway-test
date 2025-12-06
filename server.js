const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenWeatherMap API設定
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const DEFAULT_LAT = process.env.DEFAULT_LAT || '35.6812'; // 東京
const DEFAULT_LON = process.env.DEFAULT_LON || '139.7671';

// 天気データキャッシュ（30分）
let weatherCache = {
  data: null,
  timestamp: 0
};
const CACHE_DURATION = 30 * 60 * 1000; // 30分

// 静的ファイル配信
app.use(express.static(path.join(__dirname)));

// 天気APIプロキシ
app.get('/api/weather', async (req, res) => {
  // APIキーが設定されていない場合
  if (!OPENWEATHER_API_KEY) {
    return res.status(503).json({
      error: 'Weather API not configured',
      message: '天気APIが設定されていません'
    });
  }

  // キャッシュが有効な場合
  const now = Date.now();
  if (weatherCache.data && (now - weatherCache.timestamp) < CACHE_DURATION) {
    return res.json(weatherCache.data);
  }

  try {
    const lat = req.query.lat || DEFAULT_LAT;
    const lon = req.query.lon || DEFAULT_LON;

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ja`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    const data = await response.json();

    // キャッシュ更新
    weatherCache = {
      data: data,
      timestamp: now
    };

    res.json(data);
  } catch (error) {
    console.error('Weather API Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch weather',
      message: '天気情報の取得に失敗しました'
    });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    weatherApiConfigured: !!OPENWEATHER_API_KEY
  });
});

// SPA対応（存在しないルートはindex.htmlを返す）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Marathon Color Countdown server running on port ${PORT}`);
  console.log(`Weather API: ${OPENWEATHER_API_KEY ? 'Configured' : 'Not configured'}`);
});
