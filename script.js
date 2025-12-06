class MarathonCountdown {
  constructor() {
    // 7色の虹色スペクトラム
    this.colors = [
      { hex: '#FF0000', name: '赤 (スタート)', textColor: '#FFFFFF' },
      { hex: '#FF7F00', name: 'オレンジ', textColor: '#000000' },
      { hex: '#FFFF00', name: '黄', textColor: '#000000' },
      { hex: '#00FF00', name: '緑 (ハーフ達成)', textColor: '#000000' },
      { hex: '#0000FF', name: '青', textColor: '#FFFFFF' },
      { hex: '#4B0082', name: '藍', textColor: '#FFFFFF' },
      { hex: '#8B00FF', name: '紫 (ゴール間近)', textColor: '#FFFFFF' }
    ];

    this.TOTAL_DISTANCE = 42.195;
    this.editingRecordDate = null;

    this.init();
  }

  init() {
    this.loadData();
    this.setupEventListeners();

    // 初回アクセスチェック
    if (this.isFirstVisit()) {
      this.showWelcomeModal();
    } else {
      this.updateDisplay();
    }

    this.updateCurrentDate();
    this.fetchWeather();

    // 1分ごとに日付を更新
    setInterval(() => this.updateCurrentDate(), 60000);
  }

  // 初回訪問かチェック
  isFirstVisit() {
    return !localStorage.getItem('marathonData');
  }

  // データ管理
  loadData() {
    const saved = localStorage.getItem('marathonData');
    if (saved) {
      this.data = JSON.parse(saved);
    } else {
      // デフォルトデータ（初期化用）
      this.data = {
        raceDate: '',
        raceName: '',
        runHistory: [],
        totalRun: 0
      };
    }
  }

  saveData() {
    localStorage.setItem('marathonData', JSON.stringify(this.data));
  }

  // データ初期化
  resetAllData() {
    if (confirm('すべてのデータを削除しますか？\n\n・大会設定\n・走行履歴\n\nこの操作は取り消せません。')) {
      localStorage.removeItem('marathonData');
      this.loadData();
      this.closeSettingsModal();
      this.showWelcomeModal();
    }
  }

  // 日本時間で今日の日付を取得
  getTodayJST() {
    const now = new Date();
    // UTC時間に9時間を加算して日本時間に
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + jstOffset);
    return jstTime.toISOString().split('T')[0];
  }

  // 日本時間で現在時刻を取得
  getNowJST() {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    return new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + jstOffset);
  }

  // 日付計算（日本時間ベース）
  getDaysUntilRace() {
    if (!this.data.raceDate) return 0;

    const raceDate = new Date(this.data.raceDate + 'T00:00:00+09:00');
    const today = this.getNowJST();
    today.setHours(0, 0, 0, 0);
    const diffTime = raceDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // 進捗率と色の計算
  getProgressInfo() {
    const progressRate = Math.min((this.data.totalRun / this.TOTAL_DISTANCE) * 100, 100);
    const colorIndex = Math.min(Math.floor(progressRate / 14.285714), 6);
    return {
      rate: progressRate,
      colorIndex: colorIndex,
      color: this.colors[colorIndex]
    };
  }

  // 距離記録追加
  addRunRecord(distance) {
    const today = this.getTodayJST();

    // 同じ日の記録があれば加算
    const existingIndex = this.data.runHistory.findIndex(
      record => record.date === today
    );

    if (existingIndex >= 0) {
      this.data.runHistory[existingIndex].distance += parseFloat(distance);
    } else {
      this.data.runHistory.push({
        date: today,
        distance: parseFloat(distance),
        timestamp: new Date().toISOString()
      });
    }

    this.recalculateTotalDistance();
    this.saveData();
    this.updateDisplay();
    this.showSuccessAnimation();
  }

  // 履歴を編集
  updateRunRecord(date, newDistance) {
    const index = this.data.runHistory.findIndex(record => record.date === date);
    if (index >= 0) {
      this.data.runHistory[index].distance = parseFloat(newDistance);
      this.data.runHistory[index].updatedAt = new Date().toISOString();
    }
    this.recalculateTotalDistance();
    this.saveData();
    this.updateDisplay();
  }

  // 履歴を削除
  deleteRunRecord(date) {
    this.data.runHistory = this.data.runHistory.filter(record => record.date !== date);
    this.recalculateTotalDistance();
    this.saveData();
    this.updateDisplay();
  }

  // 総距離を再計算
  recalculateTotalDistance() {
    this.data.totalRun = this.data.runHistory.reduce(
      (sum, record) => sum + record.distance, 0
    );
  }

  // 表示更新
  updateDisplay() {
    const progress = this.getProgressInfo();
    const remainingDistance = Math.max(0, this.TOTAL_DISTANCE - this.data.totalRun);
    const daysLeft = this.getDaysUntilRace();

    // DOM更新
    document.getElementById('daysLeft').textContent = Math.max(0, daysLeft);
    document.getElementById('progressPercent').textContent =
      `${progress.rate.toFixed(1)}%`;
    document.getElementById('totalDistance').textContent =
      this.data.totalRun.toFixed(1);
    document.getElementById('remainingDistance').textContent =
      remainingDistance.toFixed(1);
    document.getElementById('raceName').textContent = this.data.raceName || 'マラソン大会';
    document.getElementById('currentColorName').textContent = progress.color.name;

    // 背景色更新
    document.documentElement.style.setProperty('--current-color', progress.color.hex);
    document.documentElement.style.setProperty('--text-color', progress.color.textColor);
    document.body.style.background =
      `linear-gradient(135deg, ${progress.color.hex}, rgba(0,0,0,0.3))`;
    document.body.style.color = progress.color.textColor;

    // 履歴表示更新
    this.updateHistoryDisplay();
  }

  updateCurrentDate() {
    const now = this.getNowJST();
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: 'Asia/Tokyo'
    };
    document.getElementById('currentDate').textContent =
      now.toLocaleDateString('ja-JP', options);
  }

  updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');

    if (this.data.runHistory.length === 0) {
      historyList.innerHTML = '<div class="history-empty">まだ記録がありません<br>走行距離を入力して記録を始めましょう</div>';
      historyCount.textContent = '';
      return;
    }

    historyCount.textContent = `(${this.data.runHistory.length}件)`;

    // 日付の新しい順にソート
    const sortedHistory = [...this.data.runHistory].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    historyList.innerHTML = sortedHistory.slice(0, 10).map(record => {
      const date = new Date(record.date + 'T00:00:00+09:00');
      const dateStr = date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        timeZone: 'Asia/Tokyo'
      });
      return `
        <div class="history-item" data-date="${record.date}">
          <span class="date">${dateStr}</span>
          <span class="distance">${record.distance.toFixed(1)} km</span>
        </div>
      `;
    }).join('');

    // 履歴アイテムにクリックイベントを追加
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const date = item.dataset.date;
        this.openEditHistoryModal(date);
      });
    });
  }

  // 天気取得
  async fetchWeather() {
    try {
      const response = await fetch('/api/weather');
      if (!response.ok) throw new Error('Weather API Error');

      const data = await response.json();
      this.updateWeatherDisplay(data);
    } catch (error) {
      console.log('天気情報の取得をスキップ:', error.message);
      document.getElementById('weatherDescription').textContent = '天気情報を取得できません';
      document.getElementById('runningCondition').textContent = '';
    }
  }

  updateWeatherDisplay(data) {
    const iconMap = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Snow': '❄️',
      'Thunderstorm': '⛈️'
    };

    const conditionMap = {
      'Clear': { text: '最適！', color: '#27ae60' },
      'Clouds': { text: 'まずまず', color: '#f39c12' },
      'Rain': { text: '室内推奨', color: '#95a5a6' },
      'Drizzle': { text: '室内推奨', color: '#95a5a6' },
      'Snow': { text: '注意', color: '#3498db' },
      'Thunderstorm': { text: '危険', color: '#e74c3c' }
    };

    const weatherMain = data.weather?.[0]?.main || 'Unknown';
    const description = data.weather?.[0]?.description || '不明';
    const temp = data.main?.temp ? Math.round(data.main.temp) : '--';
    const condition = conditionMap[weatherMain] || { text: '確認中', color: '#7f8c8d' };

    document.getElementById('weatherIcon').textContent = iconMap[weatherMain] || '🌤️';
    document.getElementById('weatherDescription').textContent = `${description} ${temp}°C`;

    const conditionEl = document.getElementById('runningCondition');
    conditionEl.textContent = condition.text;
    conditionEl.style.backgroundColor = condition.color;
    conditionEl.style.color = '#fff';
  }

  // イベントリスナー設定
  setupEventListeners() {
    // 距離入力フォーム
    document.getElementById('distanceForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('distanceInput');
      const distance = parseFloat(input.value);

      if (distance > 0 && distance <= 50) {
        this.addRunRecord(distance);
        input.value = '';
      } else {
        alert('0.1〜50kmの間で入力してください');
      }
    });

    // ウェルカムモーダル
    document.getElementById('welcomeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveWelcomeSettings();
    });

    // 設定モーダル
    document.getElementById('openSettings').addEventListener('click', () => {
      this.openSettingsModal();
    });

    document.getElementById('cancelSettings').addEventListener('click', () => {
      this.closeSettingsModal();
    });

    document.getElementById('settingsModal').addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') {
        this.closeSettingsModal();
      }
    });

    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // データ初期化ボタン
    document.getElementById('resetDataBtn').addEventListener('click', () => {
      this.resetAllData();
    });

    // 履歴編集モーダル
    document.getElementById('cancelEditHistory').addEventListener('click', () => {
      this.closeEditHistoryModal();
    });

    document.getElementById('editHistoryModal').addEventListener('click', (e) => {
      if (e.target.id === 'editHistoryModal') {
        this.closeEditHistoryModal();
      }
    });

    document.getElementById('editHistoryForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEditHistory();
    });

    document.getElementById('deleteHistoryBtn').addEventListener('click', () => {
      this.deleteCurrentHistory();
    });
  }

  // ウェルカムモーダル
  showWelcomeModal() {
    // デフォルトで3ヶ月後の日曜日を設定
    const defaultDate = this.getDefaultRaceDate();
    document.getElementById('welcomeRaceDate').value = defaultDate;
    document.getElementById('welcomeModal').classList.add('active');
  }

  getDefaultRaceDate() {
    const date = this.getNowJST();
    date.setMonth(date.getMonth() + 3);
    while (date.getDay() !== 0) {
      date.setDate(date.getDate() + 1);
    }
    return date.toISOString().split('T')[0];
  }

  saveWelcomeSettings() {
    const raceName = document.getElementById('welcomeRaceName').value.trim();
    const raceDate = document.getElementById('welcomeRaceDate').value;

    if (!raceName || !raceDate) {
      alert('大会名と大会日を入力してください');
      return;
    }

    this.data.raceName = raceName;
    this.data.raceDate = raceDate;
    this.data.runHistory = [];
    this.data.totalRun = 0;

    this.saveData();
    document.getElementById('welcomeModal').classList.remove('active');
    this.updateDisplay();
  }

  // 設定モーダル
  openSettingsModal() {
    document.getElementById('raceNameInput').value = this.data.raceName || '';
    document.getElementById('raceDateInput').value = this.data.raceDate || '';
    document.getElementById('settingsModal').classList.add('active');
  }

  closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
  }

  saveSettings() {
    const raceName = document.getElementById('raceNameInput').value.trim();
    const raceDate = document.getElementById('raceDateInput').value;

    if (raceName) {
      this.data.raceName = raceName;
    }
    if (raceDate) {
      this.data.raceDate = raceDate;
    }

    this.saveData();
    this.updateDisplay();
    this.closeSettingsModal();
  }

  // 履歴編集モーダル
  openEditHistoryModal(date) {
    const record = this.data.runHistory.find(r => r.date === date);
    if (!record) return;

    this.editingRecordDate = date;
    document.getElementById('editDate').value = date;
    document.getElementById('editDistance').value = record.distance;
    document.getElementById('editHistoryModal').classList.add('active');
  }

  closeEditHistoryModal() {
    this.editingRecordDate = null;
    document.getElementById('editHistoryModal').classList.remove('active');
  }

  saveEditHistory() {
    const newDistance = parseFloat(document.getElementById('editDistance').value);

    if (newDistance <= 0 || newDistance > 100) {
      alert('0.1〜100kmの間で入力してください');
      return;
    }

    this.updateRunRecord(this.editingRecordDate, newDistance);
    this.closeEditHistoryModal();
  }

  deleteCurrentHistory() {
    const date = this.editingRecordDate;
    const record = this.data.runHistory.find(r => r.date === date);

    if (record && confirm(`${date} の記録 (${record.distance.toFixed(1)}km) を削除しますか？`)) {
      this.deleteRunRecord(date);
      this.closeEditHistoryModal();
    }
  }

  // 成功アニメーション
  showSuccessAnimation() {
    const circle = document.querySelector('.progress-circle');
    circle.classList.add('pulse');
    setTimeout(() => {
      circle.classList.remove('pulse');
    }, 300);
  }
}

// アプリ初期化
document.addEventListener('DOMContentLoaded', () => {
  new MarathonCountdown();
});
