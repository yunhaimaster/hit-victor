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
    isPlaying: false,  // 新增：追蹤是否正在播放音效
    poolSize: 3,
    
    initialize() {
        // Create multiple audio objects for each sound type
        for (let i = 0; i < this.poolSize; i++) {
            const ouchSound = new Audio('sounds/ouch.mp3');
            const painSound = new Audio('sounds/pain.mp3');
            const noSound = new Audio('sounds/no.mp3');
            
            // 添加錯誤處理
            ouchSound.onerror = () => console.error('Error loading ouch.mp3');
            painSound.onerror = () => console.error('Error loading pain.mp3');
            noSound.onerror = () => console.error('Error loading no.mp3');
            
            // 添加加載成功處理
            ouchSound.oncanplaythrough = () => console.log('ouch.mp3 loaded');
            painSound.oncanplaythrough = () => console.log('pain.mp3 loaded');
            noSound.oncanplaythrough = () => console.log('no.mp3 loaded');
            
            // 添加結束事件處理
            ouchSound.onended = () => this.isPlaying = false;
            painSound.onended = () => this.isPlaying = false;
            noSound.onended = () => this.isPlaying = false;
            
            ouchSound.preload = 'auto';
            painSound.preload = 'auto';
            noSound.preload = 'auto';
            
            this.sounds.ouch.push(ouchSound);
            this.sounds.pain.push(painSound);
            this.sounds.no.push(noSound);
        }
    },
    
    play(isAngry = false) {
        // 如果正在播放音效，直接返回
        if (this.isPlaying) {
            return;
        }
        
        // 檢查音效是否已經加載
        if (!this.sounds.ouch.length || !this.sounds.pain.length || !this.sounds.no.length) {
            console.warn('Sound effects not loaded yet');
            return;
        }
        
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
        
        // 檢查音效是否可以播放
        if (audio.readyState < 2) {  // HAVE_CURRENT_DATA = 2
            console.warn(`${type}.mp3 not ready to play`);
            return;
        }
        
        // Reset and configure audio
        audio.currentTime = 0;
        audio.volume = isAngry ? 1.0 : 0.7;
        audio.playbackRate = isAngry ? 0.8 : 1.0;
        
        // 設置正在播放標誌
        this.isPlaying = true;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error(`Audio play error for ${type}.mp3:`, error);
                this.isPlaying = false;  // 播放失敗時重置標誌
            });
        }
        
        // Move to next audio object in pool
        this.currentIndex[type] = (this.currentIndex[type] + 1) % this.poolSize;
    }
};

// 新增排行榜相關變量
const nameInputModal = document.getElementById('nameInputModal');
const playerNameInput = document.getElementById('playerNameInput');
const submitNameBtn = document.getElementById('submitNameBtn');
const leaderboardList = document.getElementById('leaderboardList');

// 更新分數處理函數
async function updateScore(newScore) {
    try {
        // 獲取當前排行榜
        const leaderboardRef = doc(db, 'leaderboard', 'global');
        const docSnap = await getDoc(leaderboardRef);
        
        let scores = [];
        if (docSnap.exists()) {
            scores = docSnap.data().scores || [];
        }
        
        // 檢查是否能進入排行榜（前3名）
        const isTopScore = scores.length < 3 || newScore > (scores[scores.length - 1]?.score || 0);
        
        if (isTopScore) {
            // 顯示名字輸入對話框
            nameInputModal.classList.remove('hidden');
            
            // 處理提交名字
            const handleSubmit = async () => {
                const playerName = playerNameInput.value.trim() || '無名英雄';
                
                // 添加新分數
                scores.push({
                    name: playerName,
                    score: newScore,
                    timestamp: new Date()
                });
                
                // 排序並只保留前3名
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 3);
                
                // 更新 Firebase
                await setDoc(leaderboardRef, {
                    scores: scores,
                    updatedAt: new Date()
                });
                
                // 隱藏對話框
                nameInputModal.classList.add('hidden');
                
                // 清除輸入框
                playerNameInput.value = '';
                
                // 移除事件監聽
                submitNameBtn.removeEventListener('click', handleSubmit);
            };
            
            // 添加提交按鈕事件監聽
            submitNameBtn.addEventListener('click', handleSubmit);
        }
    } catch (error) {
        console.error('Error updating score:', error);
    }
}

// 初始化排行榜
async function initializeLeaderboard() {
    try {
        // 讀取並監聽排行榜
        const leaderboardRef = doc(db, 'leaderboard', 'global');
        onSnapshot(leaderboardRef, (docSnap) => {
            if (docSnap.exists()) {
                const scores = docSnap.data().scores || [];
                updateLeaderboardDisplay(scores);
            }
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// 新增排行榜顯示函數
function updateLeaderboardDisplay(scores) {
    leaderboardList.innerHTML = scores.map((score, index) => `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">${index + 1}</span>
            <span class="leaderboard-name">${score.name}</span>
            <span class="leaderboard-score">${score.score}</span>
        </div>
    `).join('');
}

function updateHighScoreDisplay() {
    const highScoreElement = document.getElementById('highScore');
    if (highScoreElement) {
        highScoreElement.textContent = highScore;
    }
}

// 資源加載狀態
const resourceStatus = {
    images: {
        loaded: 0,
        total: 5,  // 5張表情圖片
        weight: 0.4  // 圖片佔40%的加載比重
    },
    sounds: {
        loaded: 0,
        total: 3,  // 3個音效
        weight: 0.3  // 音效佔30%的加載比重
    },
    firebase: {
        loaded: 0,
        total: 1,  // Firebase 連接
        weight: 0.3  // Firebase佔30%的加載比重
    }
};

// 更新加載進度
function updateLoadingProgress() {
    let totalProgress = 0;
    
    // 計算每個資源類型的進度
    for (const [key, status] of Object.entries(resourceStatus)) {
        const resourceProgress = (status.loaded / status.total) * status.weight;
        totalProgress += resourceProgress;
    }
    
    // 轉換為百分比
    const progress = Math.min(Math.round(totalProgress * 100), 100);
    
    // 平滑更新進度條
    requestAnimationFrame(() => {
        const loadingProgress = document.getElementById('loading-progress');
        const loadingPercentage = document.getElementById('loading-percentage');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (loadingProgress) {
            loadingProgress.style.width = `${progress}%`;
        }
        if (loadingPercentage) {
            loadingPercentage.textContent = `${progress}%`;
        }
        
        // 根據進度更新加載文字
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            if (progress < 20) {
                loadingText.textContent = "準備緊打 Victor...";
            } else if (progress < 40) {
                loadingText.textContent = "加載緊表情...";
            } else if (progress < 60) {
                loadingText.textContent = "加載緊音效...";
            } else if (progress < 80) {
                loadingText.textContent = "準備緊排行榜...";
            } else {
                loadingText.textContent = "Victor 準備俾你打...";
            }
        }
        
        // 當所有資源加載完成
        if (progress === 100) {
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                    document.querySelector('.game-container').style.visibility = 'visible';
                    initializeGame();
                }
            }, 500);
        }
    });
}

// 檢查圖片加載
function checkImagesLoaded() {
    const images = document.querySelectorAll('.expression');
    
    function imageLoaded() {
        resourceStatus.images.loaded++;
        updateLoadingProgress();
    }
    
    images.forEach(img => {
        if (img.complete) {
            imageLoaded();
        } else {
            img.addEventListener('load', imageLoaded);
            img.addEventListener('error', () => {
                console.error('Error loading image:', img.src);
                imageLoaded(); // 即使加載失敗也繼續
            });
        }
    });
}

// 修改音效加載邏輯
function loadSounds() {
    try {
        const soundTypes = ['ouch', 'pain', 'no'];
        let loadedSounds = 0;
        
        soundTypes.forEach(type => {
            const audio = new Audio(`sounds/${type}.mp3`);
            
            audio.addEventListener('canplaythrough', () => {
                loadedSounds++;
                resourceStatus.sounds.loaded = loadedSounds;
                updateLoadingProgress();
            });
            
            audio.addEventListener('error', () => {
                console.error(`Error loading ${type}.mp3`);
                loadedSounds++;
                resourceStatus.sounds.loaded = loadedSounds;
                updateLoadingProgress();
            });
        });
        
        audioPool.initialize();
        isAudioInitialized = true;
    } catch (e) {
        console.error('Audio not supported:', e);
        resourceStatus.sounds.loaded = resourceStatus.sounds.total; // 即使加載失敗也繼續
        updateLoadingProgress();
    }
}

// 修改 initializeFirebase 函數
async function initializeFirebase() {
    try {
        await initializeLeaderboard();
        resourceStatus.firebase.loaded = 1;
        updateLoadingProgress();
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        // 即使 Firebase 加載失敗都繼續
        resourceStatus.firebase.loaded = 1;
        updateLoadingProgress();
        
        // 在排行榜顯示錯誤信息
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = `
                <div class="leaderboard-item">
                    <span class="leaderboard-name">排行榜暫時未能載入</span>
                </div>
            `;
        }
    }
}

// 修改 window.addEventListener('load')
window.addEventListener('load', () => {
    // 設置超時機制
    const loadingTimeout = setTimeout(() => {
        console.log('Loading timeout reached, forcing game start');
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            document.querySelector('.game-container').style.visibility = 'visible';
            initializeGame();
        }
    }, 10000); // 10秒超時
    
    document.querySelector('.game-container').style.visibility = 'hidden';
    
    // 並行加載所有資源
    Promise.all([
        new Promise(resolve => {
            checkImagesLoaded();
            resolve();
        }),
        new Promise(resolve => {
            loadSounds();
            resolve();
        }),
        new Promise(resolve => {
            initializeFirebase().finally(resolve);
        })
    ]).then(() => {
        clearTimeout(loadingTimeout);
    }).catch(error => {
        console.error('Resource loading error:', error);
        clearTimeout(loadingTimeout);
    });
});

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
    resetBtn.textContent = '重新開始';
    
    // 檢查是否可以進入排行榜
    updateScore(score);
    
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

// 加載畫面相關變量
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const loadingPercentage = document.getElementById('loading-percentage');
const loadingTexts = [
    "準備緊打 Victor...",
    "加載緊表情...",
    "加載緊音效...",
    "準備緊排行榜...",
    "Victor 準備俾你打..."
];

// 音效初始化狀態
let isAudioInitialized = false;

// 初始化遊戲
function initializeGame() {
    // 顯示第一句挑釁語句
    speechBubble.classList.remove('hidden');
    showTaunt();
    // 初始化排行榜
    initializeLeaderboard();
}

// Add interval to update Victor's state
setInterval(updateVictorState, 100);  // 每 0.1 秒更新一次
