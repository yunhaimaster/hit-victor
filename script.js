let score = 0;
const scoreElement = document.getElementById('score');
const victor = document.getElementById('victor');
const speechBubble = document.getElementById('speech-bubble');
const speechText = speechBubble.querySelector('p');
const resetBtn = document.getElementById('resetBtn');

// 表情元素
const expressions = {
    normal: document.querySelector('.expression.normal'),
    surprised: document.querySelector('.expression.surprised'),
    hurt: document.querySelector('.expression.hurt'),
    sad: document.querySelector('.expression.sad'),
    angry: document.querySelector('.expression.angry')
};

// 音效
let sounds = {
    ouch: null,  // 哎也
    pain: null,  // 好痛
    isLoaded: {
        ouch: false,
        pain: false
    }
};

// Victor 的挑釁語句
const taunts = [
    "打我呀,哈哈!",
    "EasyPack, Take Easy!",
    "你打唔到我~",
    "就咁咋?",
    "太慢啦!",
    "叫你着後生啲架啦!",
    "EVA諗住打我邊度呀?"
];

let lastTauntIndex = -1;
let currentExpression = 'normal';
let idleTimer = null;

// Create an audio pool for better sound management
const audioPool = {
    sounds: {
        ouch: [],
        pain: []
    },
    currentIndex: {
        ouch: 0,
        pain: 0
    },
    poolSize: 3,
    
    initialize() {
        // Create multiple audio objects for each sound type
        for (let i = 0; i < this.poolSize; i++) {
            const ouchSound = new Audio('sounds/哎也.mp3');
            const painSound = new Audio('sounds/好痛.mp3');
            
            ouchSound.preload = 'auto';
            painSound.preload = 'auto';
            
            this.sounds.ouch.push(ouchSound);
            this.sounds.pain.push(painSound);
        }
    },
    
    play(isAngry = false) {
        const type = Math.random() < 0.5 ? 'ouch' : 'pain';
        const audio = this.sounds[type][this.currentIndex[type]];
        
        // Reset and configure audio
        audio.currentTime = 0;
        audio.volume = isAngry ? 1.5 : 1.0;
        audio.playbackRate = isAngry ? 0.8 : 1.0;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Audio play error:", error);
            });
        }
        
        // Move to next audio object in pool
        this.currentIndex[type] = (this.currentIndex[type] + 1) % this.poolSize;
    }
};

// Replace the loadSounds function
function loadSounds() {
    try {
        audioPool.initialize();
        isAudioInitialized = true;
        console.log('Sounds loaded successfully');
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// 音效初始化狀態
let isAudioInitialized = false;

// 切換表情
function changeExpression(newExpression) {
    if (currentExpression === newExpression) return;
    
    // 隱藏當前表情
    expressions[currentExpression].classList.add('hidden');
    
    // 顯示新表情
    expressions[newExpression].classList.remove('hidden');
    
    currentExpression = newExpression;
}

// 隨機表情
function getRandomExpression() {
    const options = ['surprised', 'hurt', 'sad'];
    return options[Math.floor(Math.random() * options.length)];
}

// 顯示挑釁語句
function showTaunt() {
    if (currentExpression !== 'angry') {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * taunts.length);
        } while (newIndex === lastTauntIndex);
        
        lastTauntIndex = newIndex;
        speechText.textContent = taunts[newIndex];
        speechBubble.classList.remove('hidden');
        
        idleTimer = setTimeout(showTaunt, 2000);
    }
}

// 重置閒置計時器
function resetIdleTimer() {
    clearTimeout(idleTimer);
    speechBubble.classList.add('hidden');
    idleTimer = setTimeout(showTaunt, 1000);
}

// Add new state variables
let moodLevel = 100; // 100 = happy, 0 = very unhappy
let damageLevel = 0; // 0 = normal, 100 = very bruised

function updateVictorState() {
    // Update mood over time
    if (!isHit && score % 10 !== 0) {  // 唔係憤怒模式先至會改變表情
        moodLevel = Math.max(0, moodLevel - 0.1);
        
        // 根據心情值改變表情
        if (moodLevel > 75) {
            changeExpression('normal');
        } else if (moodLevel > 50) {
            changeExpression('sad');
        } else if (moodLevel > 25) {
            changeExpression('hurt');
        } else {
            changeExpression('angry');
        }
        
        // 套用傷害效果
        const victor = document.getElementById('victor');
        victor.style.filter = `hue-rotate(${damageLevel * 0.5}deg) brightness(${100 - damageLevel * 0.3}%)`;
    }
}

// 改返時間相關變量
let timeLeft = 20;  // 改做20秒
let timerInterval = null;
let isGameActive = false;

// 加入最高分變量
let highScore = localStorage.getItem('highScore') || 0;
let highScorePlayer = localStorage.getItem('highScorePlayer') || '無人';

// 更新 resetGame 函數
function resetGame() {
    score = 0;
    moodLevel = 100;
    damageLevel = 0;
    timeLeft = 20;
    
    // 更新顯示
    document.getElementById('score').textContent = '0';
    document.getElementById('timer').textContent = '20';
    document.getElementById('timer').classList.remove('timer-urgent');
    
    // 重置遊戲狀態
    if (timerInterval) clearInterval(timerInterval);
    isGameActive = true;
    startTimer();
    
    // 更新按鈕文字
    resetBtn.textContent = '重新開始';
    
    // 添加開始動畫
    document.getElementById('timer').classList.add('game-started');
    document.querySelector('.score-board').classList.add('game-started');
    
    updateExpression();
}

// 改返 startTimer 函數入面嘅時間
function startTimer() {
    timerInterval = setInterval(() => {
        if (timeLeft > 0 && isGameActive) {
            timeLeft--;
            const timerElement = document.getElementById('timer');
            timerElement.textContent = timeLeft;
            
            // 時間少於5秒時顯示緊急動畫
            if (timeLeft <= 5) {
                timerElement.classList.add('timer-urgent');
            }
            
            // 最後7秒 Victor 會更加激動
            if (timeLeft <= 7) {
                victor.style.animation = 'shake 0.3s infinite';
            }
        } else {
            endGame();
        }
    }, 1000);
}

// 更新 endGame 函數
function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);
    
    // 檢查是否破紀錄
    if (score > highScore) {
        const playerName = prompt('恭喜破紀錄！請輸入你嘅名：', '');
        if (playerName) {
            highScore = score;
            highScorePlayer = playerName;
            localStorage.setItem('highScore', highScore);
            localStorage.setItem('highScorePlayer', highScorePlayer);
            document.getElementById('highScore').textContent = highScore;
            document.getElementById('highScorePlayer').textContent = highScorePlayer;
        }
    }
    
    // 顯示結果
    alert(`時間到！\n你嘅分數係：${score}\n最高分：${highScore} (${highScorePlayer})\n平均每秒打中 ${(score/20).toFixed(2)} 下！`);
    
    // 停止所有動畫
    victor.style.animation = '';
    victor.classList.remove('angry');
    document.querySelector('.character-container').classList.remove('angry');
    
    // 改返做「開始」
    resetBtn.textContent = '開始';
}

// 修改 handleHit 函數
function handleHit(event) {
    if (!isGameActive) return;
    
    // 獲取點擊或觸摸位置
    let x, y;
    if (event.type.startsWith('touch')) {
        const touch = event.touches[0];
        const container = document.querySelector('.character-container');
        const rect = container.getBoundingClientRect();
        x = touch.clientX - rect.left;
        y = touch.clientY - rect.top;
    } else {
        const container = document.querySelector('.character-container');
        const rect = container.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    }
    
    // 檢查點擊是否在容器內
    const container = document.querySelector('.character-container');
    const rect = container.getBoundingClientRect();
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return;
    }
    
    // 計算點擊位置相對於容器中心的距離
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    // 如果點擊位置離中心太遠,不觸發效果
    if (distance > Math.min(rect.width, rect.height) / 2) {
        return;
    }
    
    resetIdleTimer();
    score += 1;
    scoreElement.textContent = score;
    
    // 播放音效
    if (isAudioInitialized) {
        audioPool.play(false);  // 移除暴走模式參數
    }
    
    // 添加打擊動畫
    victor.classList.remove('hit');
    void victor.offsetWidth;
    victor.classList.add('hit');
    
    // 隨機表情
    const newExpression = getRandomExpression();
    changeExpression(newExpression);
    
    // Decrease mood with each hit
    moodLevel = Math.max(0, moodLevel - 10);
    damageLevel = Math.min(100, damageLevel + 5);
    
    updateExpression();
    
    // 防止事件冒泡
    event.stopPropagation();
    
    // 打得快有額外時間獎勵
    if (timeLeft < 18) {
        const hitBonus = 0.2;
        timeLeft = Math.min(20, timeLeft + hitBonus);
        document.getElementById('timer').textContent = Math.ceil(timeLeft);
    }
}

// 事件監聽
const container = document.querySelector('.character-container');

// 處理第一次互動
async function handleFirstInteraction(event) {
    if (!isAudioInitialized) {
        await loadSounds();
    }
    handleHit(event);
}

container.addEventListener('mousedown', handleFirstInteraction);
container.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleFirstInteraction(e);
}, { passive: false });

// 添加觸摸反饋
container.addEventListener('mouseenter', () => {
    container.classList.add('hover');
});

container.addEventListener('mouseleave', () => {
    container.classList.remove('hover');
});

// 移除重複的觸摸事件監聽
container.addEventListener('touchend', () => {
    container.classList.remove('hover');
}, { passive: true });

resetBtn.addEventListener('click', resetGame);

// 防止拖動和選擇
victor.addEventListener('dragstart', (e) => e.preventDefault());
victor.addEventListener('selectstart', (e) => e.preventDefault());

// 移動端優化
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());

// 初始化
window.addEventListener('load', () => {
    loadSounds();
    // 立即顯示第一句挑釁語句
    let initialIndex = Math.floor(Math.random() * taunts.length);
    speechText.textContent = taunts[initialIndex];
    lastTauntIndex = initialIndex;
    speechBubble.classList.remove('hidden');
    // 設置定時器來更新挑釁語句
    idleTimer = setTimeout(showTaunt, 2000);
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('highScorePlayer').textContent = highScorePlayer;
});

// Add interval to update Victor's state
setInterval(updateVictorState, 100);  // 每 0.1 秒更新一次
