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

// 加載進度相關變量
let lastProgressUpdate = 0;
let currentLoadingText = "";
let isUpdatingProgress = false;
let currentProgress = 0;

// 檢查震動支援
const hasVibrationSupport = 'vibrate' in navigator;

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyCjrS24QtvHm31nR_0TTn5caVWbcJkXEcw",
    projectId: "hitvictorhighscore",
    appId: "1:643950387981:web:3cd0288c487f4abbe58644"
};

let db;
let useLocalStorage = false;

try {
    // 初始化 Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    resourceStatus.firebase.loaded = 1;
    updateLoadingProgress();
} catch (error) {
    console.error('Firebase initialization error:', error);
    useLocalStorage = true;
    resourceStatus.firebase.loaded = 1;
    updateLoadingProgress();
}

// 遊戲狀態變量
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore') || '0');
let moodLevel = 100;
let damageLevel = 0;
let lastHitTime = 0;
let timeLeft = 20;
let timerInterval = null;
let isGameActive = false;
let currentExpression = 'normal';
let idleTimer = null;
let lastTauntIndex = -1;
let isAudioInitialized = false;

// DOM 元素
const scoreElement = document.getElementById('score');
const victor = document.getElementById('victor');
const speechBubble = document.getElementById('speech-bubble');
const speechText = speechBubble.querySelector('p');
const resetBtn = document.getElementById('resetBtn');
const nameInputModal = document.getElementById('nameInputModal');
const playerNameInput = document.getElementById('playerNameInput');
const submitNameBtn = document.getElementById('submitNameBtn');
const leaderboardList = document.getElementById('leaderboardList');

// 表情元素
const expressions = {
    normal: document.querySelector('.expression.normal'),
    surprised: document.querySelector('.expression.surprised'),
    hurt: document.querySelector('.expression.hurt'),
    sad: document.querySelector('.expression.sad'),
    angry: document.querySelector('.expression.angry')
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

// 檢測是否為 iOS 設備
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// 音頻系統
const audioPool = {
    sounds: {
        ouch: [],
        pain: [],
        no: []
    },
    currentIndex: {
        ouch: 0,
        pain: 0,
        no: 0
    },
    isPlaying: false,
    poolSize: 3,
    isInitialized: false,
    
    async initializeAudio() {
        if (this.isInitialized) return;
        
        try {
            for (let i = 0; i < this.poolSize; i++) {
                const sounds = {
                    ouch: new Audio('sounds/ouch.mp3'),
                    pain: new Audio('sounds/pain.mp3'),
                    no: new Audio('sounds/no.mp3')
                };
                
                for (const [type, audio] of Object.entries(sounds)) {
                    audio.preload = 'auto';
                    audio.playsinline = true;
                    audio.volume = 0.7;
                    
                    audio.addEventListener('ended', () => this.isPlaying = false);
                    audio.addEventListener('error', () => console.error(`Error loading ${type}.mp3`));
                    audio.addEventListener('canplaythrough', () => console.log(`${type}.mp3 loaded`));
                    
                    this.sounds[type].push(audio);
                }
            }
            
            this.isInitialized = true;
            console.log('Audio pool initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio pool:', error);
            return false;
        }
    },
    
    play(isAngry = false) {
        if (!this.isInitialized || this.isPlaying) return;
        
        try {
            const types = ['ouch', 'pain', 'no'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            const audio = this.sounds[type][this.currentIndex[type]];
            if (!audio) return;
            
            audio.currentTime = 0;
            audio.volume = isAngry ? 1.0 : 0.7;
            audio.playbackRate = isAngry ? 0.8 : 1.0;
            
            this.isPlaying = true;
            
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch(error => {
                    console.warn('Audio play error:', error);
                    this.isPlaying = false;
                });
            }
            
            this.currentIndex[type] = (this.currentIndex[type] + 1) % this.poolSize;
        } catch (error) {
            console.error('Error playing audio:', error);
            this.isPlaying = false;
        }
    }
};

// 排行榜相關函數
async function updateScore(newScore) {
    if (useLocalStorage || !db) {
        const localScores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
        const playerName = prompt('恭喜你進入排行榜！請輸入你的名字：') || '無名英雄';
        
        localScores.push({
            name: playerName,
            score: newScore,
            timestamp: new Date().toISOString()
        });
        
        localScores.sort((a, b) => b.score - a.score);
        const topScores = localScores.slice(0, 3);
        
        localStorage.setItem('leaderboard', JSON.stringify(topScores));
        updateLeaderboardDisplay(topScores);
        return;
    }

    try {
        const leaderboardRef = db.collection('leaderboard').doc('global');
        const docSnap = await leaderboardRef.get();
        
        let scores = [];
        if (docSnap.exists) {
            scores = docSnap.data().scores || [];
        }
        
        const isTopScore = scores.length < 3 || newScore > (scores[scores.length - 1]?.score || 0);
        
        if (isTopScore) {
            nameInputModal.classList.remove('hidden');
            
            const handleSubmit = async () => {
                const playerName = playerNameInput.value.trim() || '無名英雄';
                
                scores.push({
                    name: playerName,
                    score: newScore,
                    timestamp: new Date()
                });
                
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 3);
                
                try {
                    await leaderboardRef.set({
                        scores: scores,
                        updatedAt: new Date()
                    });
                } catch (error) {
                    console.error('Error updating leaderboard:', error);
                    localStorage.setItem('leaderboard', JSON.stringify(scores));
                }
                
                nameInputModal.classList.add('hidden');
                playerNameInput.value = '';
                submitNameBtn.removeEventListener('click', handleSubmit);
            };
            
            submitNameBtn.addEventListener('click', handleSubmit);
        }
    } catch (error) {
        console.error('Error updating score:', error);
        useLocalStorage = true;
        updateScore(newScore);
    }
}

async function initializeLeaderboard() {
    if (useLocalStorage || !db) {
        const localScores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
        updateLeaderboardDisplay(localScores);
        return;
    }

    try {
        const leaderboardRef = db.collection('leaderboard').doc('global');
        leaderboardRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const scores = docSnap.data().scores || [];
                updateLeaderboardDisplay(scores);
            }
        }, (error) => {
            console.error('Error loading leaderboard:', error);
            useLocalStorage = true;
            const localScores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
            updateLeaderboardDisplay(localScores);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        useLocalStorage = true;
        const localScores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
        updateLeaderboardDisplay(localScores);
    }
}

function updateLeaderboardDisplay(scores) {
    leaderboardList.innerHTML = scores.map((score, index) => `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">${index + 1}</span>
            <span class="leaderboard-name">${score.name}</span>
            <span class="leaderboard-score">${score.score}</span>
        </div>
    `).join('');
}

// 加載進度相關函數
async function updateLoadingProgress() {
    if (isUpdatingProgress) return;
    
    let totalProgress = 0;
    for (const [key, status] of Object.entries(resourceStatus)) {
        const resourceProgress = (status.loaded / status.total) * status.weight;
        totalProgress += resourceProgress;
    }
    
    const targetProgress = Math.min(Math.round(totalProgress * 100), 100);
    
    // 確保進度只能增加，不能減少
    if (targetProgress < currentProgress) {
        return;
    }
    
    const now = Date.now();
    if (now - lastProgressUpdate < 300) {
        await new Promise(resolve => setTimeout(resolve, 300 - (now - lastProgressUpdate)));
    }
    
    isUpdatingProgress = true;
    
    requestAnimationFrame(async () => {
        const loadingProgress = document.getElementById('loading-progress');
        const loadingPercentage = document.getElementById('loading-percentage');
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = document.querySelector('.loading-text');
        
        // 平滑過渡到目標進度
        const step = Math.max(1, Math.floor((targetProgress - currentProgress) / 3));
        currentProgress = Math.min(targetProgress, currentProgress + step);
        
        if (loadingProgress) {
            loadingProgress.style.width = `${currentProgress}%`;
        }
        if (loadingPercentage) {
            loadingPercentage.textContent = `${currentProgress}%`;
        }
        
        let newLoadingText = "";
        if (currentProgress < 20) {
            newLoadingText = "準備緊打 Victor...";
        } else if (currentProgress < 40) {
            newLoadingText = "加載緊表情...";
        } else if (currentProgress < 60) {
            newLoadingText = "加載緊音效...";
        } else if (currentProgress < 80) {
            newLoadingText = "準備緊排行榜...";
        } else {
            newLoadingText = "Victor 準備俾你打...";
        }
        
        if (loadingText && newLoadingText !== currentLoadingText) {
            loadingText.textContent = newLoadingText;
            currentLoadingText = newLoadingText;
        }
        
        if (currentProgress === 100 && targetProgress === 100) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                document.querySelector('.game-container').style.visibility = 'visible';
                initializeGame();
            }
        }
        
        lastProgressUpdate = Date.now();
        isUpdatingProgress = false;
    });
}

// 資源加載檢查函數
function checkImagesLoaded() {
    const images = document.querySelectorAll('.expression');
    let loadedCount = 0;
    const totalImages = images.length;
    
    function imageLoaded() {
        loadedCount++;
        resourceStatus.images.loaded = loadedCount;
        resourceStatus.images.total = totalImages;
        console.log(`Image loaded: ${loadedCount}/${totalImages}`);
        updateLoadingProgress();
    }
    
    images.forEach(img => {
        if (img.complete && img.naturalHeight !== 0) {
            imageLoaded();
        } else {
            img.addEventListener('load', imageLoaded);
            img.addEventListener('error', () => {
                console.error('Error loading image:', img.src);
                imageLoaded();
            });
        }
    });
}

function loadSounds() {
    try {
        const soundTypes = ['ouch', 'pain', 'no'];
        let loadedSounds = 0;
        const totalSounds = soundTypes.length;
        
        soundTypes.forEach(type => {
            const audio = new Audio(`sounds/${type}.mp3`);
            
            const handleLoad = () => {
                loadedSounds++;
                resourceStatus.sounds.loaded = loadedSounds;
                resourceStatus.sounds.total = totalSounds;
                console.log(`Sound loaded: ${loadedSounds}/${totalSounds}`);
                updateLoadingProgress();
                
                if (loadedSounds === totalSounds) {
                    audioPool.initializeAudio();
                    isAudioInitialized = true;
                }
            };
            
            audio.addEventListener('canplaythrough', handleLoad, { once: true });
            audio.addEventListener('error', () => {
                console.error(`Error loading ${type}.mp3`);
                handleLoad();
            });
            
            // Force the load
            audio.load();
        });
    } catch (e) {
        console.error('Audio not supported:', e);
        resourceStatus.sounds.loaded = resourceStatus.sounds.total;
        updateLoadingProgress();
    }
}

// 遊戲核心函數
function changeExpression(newExpression) {
    if (currentExpression === newExpression) return;
    
    expressions[currentExpression].classList.add('hidden');
    expressions[newExpression].classList.remove('hidden');
    currentExpression = newExpression;
}

function getRandomExpression() {
    const options = ['surprised', 'hurt', 'sad'];
    return options[Math.floor(Math.random() * options.length)];
}

function showTaunt() {
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * taunts.length);
    } while (newIndex === lastTauntIndex);
    
    lastTauntIndex = newIndex;
    speechText.textContent = taunts[newIndex];
    speechBubble.classList.remove('hidden');
    
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showTaunt, 2000);
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    showTaunt();
}

function updateVictorState() {
    const now = Date.now();
    const timeSinceLastHit = now - lastHitTime;
    const isRecovering = timeSinceLastHit > 1000;

    if (isRecovering && score % 10 !== 0) {
        moodLevel = Math.min(100, moodLevel + 0.1);
        damageLevel = Math.max(0, damageLevel - 0.05);
        
        if (moodLevel > 75) {
            changeExpression('normal');
        } else if (moodLevel > 50) {
            changeExpression('sad');
        } else if (moodLevel > 25) {
            changeExpression('hurt');
        } else {
            changeExpression('angry');
        }
        
        victor.style.filter = `hue-rotate(${damageLevel * 0.5}deg) brightness(${100 - damageLevel * 0.3}%)`;
    }
}

function resetGame() {
    score = 0;
    moodLevel = 100;
    damageLevel = 0;
    timeLeft = 20;
    lastHitTime = 0;
    
    document.getElementById('score').textContent = '0';
    document.getElementById('timer').textContent = '20';
    document.getElementById('timer').classList.remove('timer-urgent');
    
    if (timerInterval) clearInterval(timerInterval);
    isGameActive = true;
    startTimer();
    
    resetBtn.textContent = '重新開始';
    
    document.getElementById('timer').classList.add('game-started');
    document.querySelector('.score-board').classList.add('game-started');
    
    victor.style.filter = '';
    changeExpression('normal');
    
    speechBubble.classList.remove('hidden');
    showTaunt();
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (timeLeft > 0 && isGameActive) {
            timeLeft = Math.max(0, timeLeft - 1);
            const timerElement = document.getElementById('timer');
            timerElement.textContent = Math.ceil(timeLeft);
            
            if (timeLeft <= 5) {
                timerElement.classList.add('timer-urgent');
            }
            
            if (timeLeft <= 7) {
                victor.style.animation = 'shake 0.3s infinite';
            }
        } else {
            endGame();
        }
    }, 1000);
}

function endGame() {
    isGameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    
    victor.style.animation = '';
    resetBtn.textContent = '重新開始';
    
    updateScore(score);
    showTaunt();
}

function handleHit(event) {
    if (!isGameActive) return;
    
    let x, y;
    if (event.type.startsWith('touch')) {
        const touch = event.touches[0];
        x = touch.clientX;
        y = touch.clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    
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
    
    // 觸發震動效果
    if (hasVibrationSupport) {
        // 根據心情等級調整震動強度
        if (moodLevel < 25) {
            // 生氣狀態：更強烈的震動
            navigator.vibrate([100, 50, 100]);
        } else if (moodLevel < 50) {
            // 受傷狀態：中等震動
            navigator.vibrate([80, 40, 80]);
        } else {
            // 正常狀態：輕微震動
            navigator.vibrate(50);
        }
    }
    
    resetIdleTimer();
    score += 1;
    scoreElement.textContent = score;
    lastHitTime = Date.now();
    
    if (audioPool.isInitialized) {
        audioPool.play(moodLevel < 25);
    }
    
    victor.classList.remove('hit');
    void victor.offsetWidth;
    victor.classList.add('hit');
    
    const newExpression = getRandomExpression();
    changeExpression(newExpression);
    
    moodLevel = Math.max(0, moodLevel - 10);
    damageLevel = Math.min(100, damageLevel + 5);
    
    event.stopPropagation();
}

async function handleFirstInteraction(event) {
    if (!audioPool.isInitialized) {
        try {
            await audioPool.initializeAudio();
            console.log('Audio initialized on first interaction');
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
        }
    }
    handleHit(event);
}

// 事件監聽器設置
const container = document.querySelector('.character-container');

container.addEventListener('mousedown', handleFirstInteraction);
container.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleFirstInteraction(e);
}, { passive: false });

container.addEventListener('mouseenter', () => {
    container.classList.add('hover');
});

container.addEventListener('mouseleave', () => {
    container.classList.remove('hover');
});

container.addEventListener('touchend', () => {
    container.classList.remove('hover');
}, { passive: true });

resetBtn.addEventListener('click', resetGame);

victor.addEventListener('dragstart', (e) => e.preventDefault());
victor.addEventListener('selectstart', (e) => e.preventDefault());

document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());

// 初始化遊戲
function initializeGame() {
    // 初始化遊戲狀態
    score = 0;
    moodLevel = 100;
    damageLevel = 0;
    timeLeft = 20;
    lastHitTime = 0;
    isGameActive = false;
    
    // 重置界面元素
    scoreElement.textContent = '0';
    document.getElementById('timer').textContent = '20';
    resetBtn.textContent = '開始';
    
    // 設置初始表情
    changeExpression('normal');
    victor.style.filter = '';
    
    // 顯示初始對話
    speechBubble.classList.remove('hidden');
    showTaunt();
    
    // 初始化排行榜
    initializeLeaderboard();
}

// 初始化
window.addEventListener('load', () => {
    const loadingTimeout = setTimeout(() => {
        console.log('Loading timeout reached, forcing game start');
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            document.querySelector('.game-container').style.visibility = 'visible';
            initializeGame();
        }
    }, 8000);

    document.querySelector('.game-container').style.visibility = 'hidden';
    
    // Reset loading status
    resourceStatus.images.loaded = 0;
    resourceStatus.sounds.loaded = 0;
    resourceStatus.firebase.loaded = 0;
    currentProgress = 0;
    
    // 按順序加載資源
    const loadSequentially = async () => {
        // 1. 首先加載 Firebase
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            resourceStatus.firebase.loaded = 1;
            await updateLoadingProgress();
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Firebase initialization error:', error);
            useLocalStorage = true;
            resourceStatus.firebase.loaded = 1;
            await updateLoadingProgress();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 2. 然後加載圖片
        await new Promise(resolve => {
            checkImagesLoaded();
            setTimeout(resolve, 1000);
        });

        // 3. 最後加載音效
        await new Promise(resolve => {
            loadSounds();
            setTimeout(resolve, 1000);
        });

        // 4. 初始化排行榜
        await initializeLeaderboard();

        // 5. 最終檢查
        let checkCount = 0;
        const finalCheck = setInterval(() => {
            let totalProgress = 0;
            for (const [key, status] of Object.entries(resourceStatus)) {
                const resourceProgress = (status.loaded / status.total) * status.weight;
                totalProgress += resourceProgress;
            }
            
            checkCount++;
            if (totalProgress >= 1 || checkCount > 50) {
                clearInterval(finalCheck);
                clearTimeout(loadingTimeout);
                setTimeout(() => {
                    const loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                        document.querySelector('.game-container').style.visibility = 'visible';
                        initializeGame();
                    }
                }, 500);
            }
        }, 100);
    };

    loadSequentially().catch(error => {
        console.error('Resource loading error:', error);
        clearTimeout(loadingTimeout);
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            document.querySelector('.game-container').style.visibility = 'visible';
            initializeGame();
        }
    });
});

setInterval(updateVictorState, 100);
