let score = 0;
let highScore = parseInt(localStorage.getItem('highScore') || '0');
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
    "EVA諗住打我邊度呀?",
    "你好似冇瘦到喎"
];

let lastTauntIndex = -1;
let currentExpression = 'normal';
let idleTimer = null;

// Create an audio pool for better sound management
const audioPool = {
    sounds: {
        ouch: [],
        pain: [],
        no: []  // 新加入嘅 "唔好呀" 音效
    },
    currentIndex: {
        ouch: 0,
        pain: 0,
        no: 0
    },
    poolSize: 3,
    
    initialize() {
        // Create multiple audio objects for each sound type
        for (let i = 0; i < this.poolSize; i++) {
            const ouchSound = new Audio('sounds/ouch.mp3');
            const painSound = new Audio('sounds/pain.mp3');
            const noSound = new Audio('sounds/no.mp3');
            
            ouchSound.preload = 'auto';
            painSound.preload = 'auto';
            noSound.preload = 'auto';
            
            this.sounds.ouch.push(ouchSound);
            this.sounds.pain.push(painSound);
            this.sounds.no.push(noSound);
        }
    },
    
    play(isAngry = false) {
        // 隨機選擇一個音效 (現在有三種)
        const randomNum = Math.random();
        let type;
        if (randomNum < 0.33) {
            type = 'ouch';
        } else if (randomNum < 0.66) {
            type = 'pain';
        } else {
            type = 'no';
        }
        
        const audio = this.sounds[type][this.currentIndex[type]];
        
        // Reset and configure audio
        audio.currentTime = 0;
        audio.volume = isAngry ? 1.0 : 0.7;  // 將音量範圍改為 0-1 之間
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

// High score functions
async function updateHighScore(newScore) {
    try {
        // 更新本地儲存
        localStorage.setItem('highScore', newScore);
        
        // 更新記憶體入面嘅值
        highScore = newScore;
        updateHighScoreDisplay();
        
        // 更新 Firebase
        const highScoreRef = doc(db, 'highscores', 'global');
        const docSnap = await getDoc(highScoreRef);
        
        if (docSnap.exists()) {
            const currentHighScore = docSnap.data().score;
            if (newScore > currentHighScore) {
                await setDoc(highScoreRef, {
                    score: newScore,
                    updatedAt: new Date()
                }, { merge: true });
            }
        } else {
            await setDoc(highScoreRef, {
                score: newScore,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        
        // 顯示提示信息
        alert(`新記錄!\n分數: ${newScore}`);
    } catch (error) {
        console.error('Error updating high score:', error);
        // 如果 Firebase 更新失敗，至少本地記錄還在
    }
}

async function loadHighScore() {
    try {
        // 先讀取本地儲存的分數
        const localHighScore = parseInt(localStorage.getItem('highScore') || '0');
        
        // 立即更新顯示本地分數
        highScore = localHighScore;
        updateHighScoreDisplay();
        
        // 再嘗試從 Firebase 讀取
        const highScoreRef = doc(db, 'highscores', 'global');
        const docSnap = await getDoc(highScoreRef);
        
        if (docSnap.exists()) {
            const globalHighScore = docSnap.data().score;
            // 使用較高的分數
            if (globalHighScore > highScore) {
                highScore = globalHighScore;
                // 更新本地儲存和顯示
                localStorage.setItem('highScore', highScore);
                updateHighScoreDisplay();
            }
        } else if (localHighScore > 0) {
            // 如果 Firebase 中沒有記錄，創建一個
            await setDoc(highScoreRef, {
                score: localHighScore,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        
        // 添加實時監聽，以獲取其他玩家的新高分
        onSnapshot(highScoreRef, (docSnap) => {
            if (docSnap.exists()) {
                const globalHighScore = docSnap.data().score;
                if (globalHighScore > highScore) {
                    highScore = globalHighScore;
                    localStorage.setItem('highScore', highScore);
                    updateHighScoreDisplay();
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading high score:', error);
        // 如果讀取失敗，使用本地分數
        highScore = parseInt(localStorage.getItem('highScore') || '0');
        updateHighScoreDisplay();
    }
}

function updateHighScoreDisplay() {
    const highScoreElement = document.getElementById('highScore');
    if (highScoreElement) {
        highScoreElement.textContent = highScore;
    }
}

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
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * taunts.length);
    } while (newIndex === lastTauntIndex);
    
    lastTauntIndex = newIndex;
    speechText.textContent = taunts[newIndex];
    speechBubble.classList.remove('hidden');
    
    // Always schedule next taunt
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showTaunt, 2000);
}

// 重置閒置計時器 (修改為只更新文字)
function resetIdleTimer() {
    clearTimeout(idleTimer);
    showTaunt();
}

// Add new state variables
let moodLevel = 100; // 100 = happy, 0 = very unhappy
let damageLevel = 0; // 0 = normal, 100 = very bruised
let lastHitTime = 0; // Track the last hit time

// Add combo tracking
let hitCombo = 0;
let lastHitTimestamp = 0;
const COMBO_WINDOW = 500; // 500ms to maintain combo

function updateVictorState() {
    const now = Date.now();
    const timeSinceLastHit = now - lastHitTime;
    const isRecovering = timeSinceLastHit > 1000; // 1 second since last hit

    // Update mood over time
    if (isRecovering && score % 10 !== 0) {
        moodLevel = Math.min(100, moodLevel + 0.1); // Slowly recover mood
        damageLevel = Math.max(0, damageLevel - 0.05); // Slowly recover from damage
        
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
        victor.style.filter = `hue-rotate(${damageLevel * 0.5}deg) brightness(${100 - damageLevel * 0.3}%)`;
    }
}

// 改返時間相關變量
let timeLeft = 20;  // 改做20秒
let timerInterval = null;
let isGameActive = false;

// 更新 resetGame 函數
function resetGame() {
    score = 0;
    moodLevel = 100;
    damageLevel = 0;
    timeLeft = 20;
    lastHitTime = 0;
    hitCombo = 0;        // Reset combo
    lastHitTimestamp = 0; // Reset combo timestamp
    
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
    
    // Reset Victor's appearance
    victor.style.filter = '';
    changeExpression('normal');
    
    // Ensure speech bubble is visible and start taunts
    speechBubble.classList.remove('hidden');
    showTaunt();
}

// 改返 startTimer 函數入面嘅時間
function startTimer() {
    timerInterval = setInterval(() => {
        if (timeLeft > 0 && isGameActive) {
            timeLeft = Math.max(0, timeLeft - 1); // Ensure timeLeft doesn't go below 0
            const timerElement = document.getElementById('timer');
            timerElement.textContent = Math.ceil(timeLeft); // Always show whole numbers
            
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
    if (timerInterval) clearInterval(timerInterval);
    
    // 移除 Victor 的搖動動畫
    victor.style.animation = '';
    
    // 更新按鈕文字
    resetBtn.textContent = '開始';
    
    // 檢查是否破紀錄
    if (score > highScore) {
        updateHighScore(score);
    }
    
    // Keep speech bubble visible but change to a taunt
    showTaunt();
}

// 修改 handleHit 函數
function handleHit(event) {
    if (!isGameActive) return;
    
    // 獲取點擊或觸摸位置
    let x, y;
    if (event.type.startsWith('touch')) {
        const touch = event.touches[0];
        x = touch.clientX;
        y = touch.clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    
    // 檢查點擊是否在 Victor 的臉部區域內
    const victorRect = victor.getBoundingClientRect();
    const centerX = victorRect.left + victorRect.width / 2;
    const centerY = victorRect.top + victorRect.height / 2;
    const radius = Math.min(victorRect.width, victorRect.height) * 0.4;
    
    const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + 
        Math.pow(y - centerY, 2)
    );
    
    if (distance > radius) {
        return;
    }
    
    resetIdleTimer();
    score += 1;
    scoreElement.textContent = score;
    lastHitTime = Date.now();
    
    // 播放音效
    if (isAudioInitialized) {
        audioPool.play(moodLevel < 25);  // When mood is low, play angry sounds
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
    
    // 防止事件冒泡
    event.stopPropagation();
}

// 事件監聽
const container = document.querySelector('.character-container');

// 處理第一次互動
function handleFirstInteraction(event) {
    if (!isAudioInitialized) {
        loadSounds();
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
    // 確保語句泡泡可見並顯示第一句挑釁語句
    speechBubble.classList.remove('hidden');
    showTaunt();
    // 立即加載最高分
    loadHighScore();
});

// Add interval to update Victor's state
setInterval(updateVictorState, 100);  // 每 0.1 秒更新一次
