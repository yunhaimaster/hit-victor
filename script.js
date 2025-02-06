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

// 音效池
const audioPool = {
    ouch: [],
    pain: []
};

// 音效初始化狀態
let isAudioInitialized = false;

// 預加載音效
function loadSounds() {
    try {
        // 創建音效池
        for (let i = 0; i < 3; i++) {
            const ouchSound = new Audio('sounds/哎也.mp3');
            const painSound = new Audio('sounds/好痛.mp3');
            
            ouchSound.volume = 1.0;
            painSound.volume = 1.0;
            
            // 預加載
            ouchSound.load();
            painSound.load();
            
            // 加入音效池
            audioPool.ouch.push(ouchSound);
            audioPool.pain.push(painSound);
            
            // 監聽加載完成
            ouchSound.addEventListener('canplaythrough', () => {
                sounds.isLoaded.ouch = true;
                console.log('Ouch sound loaded successfully');
            }, { once: true });
            
            painSound.addEventListener('canplaythrough', () => {
                sounds.isLoaded.pain = true;
                console.log('Pain sound loaded successfully');
            }, { once: true });
        }
    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// 初始化音效
async function initSounds() {
    if (isAudioInitialized) return;
    
    try {
        // 靜音播放所有音效以解鎖
        const promises = [...audioPool.ouch, ...audioPool.pain].map(audio => {
            audio.volume = 0;
            return audio.play().catch(() => {});
        });
        
        await Promise.all(promises);
        
        // 恢復音量
        audioPool.ouch.forEach(audio => audio.volume = 1.0);
        audioPool.pain.forEach(audio => audio.volume = 1.0);
        
        isAudioInitialized = true;
    } catch (e) {
        console.log('Sound initialization error:', e);
    }
}

// 從音效池獲取可用的音效
function getAvailableAudio(type) {
    return audioPool[type].find(audio => audio.paused || audio.ended);
}

// 播放隨機音效
function playRandomSound(isAngry = false) {
    if (!isAudioInitialized) return;
    
    const type = Math.random() < 0.5 ? 'ouch' : 'pain';
    const audio = getAvailableAudio(type);
    
    if (audio) {
        audio.currentTime = 0;
        audio.volume = isAngry ? 1.5 : 1.0;
        audio.playbackRate = isAngry ? 0.8 : 1.0;
        audio.play().catch(error => console.log('Sound play error:', error));
    }
}

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

// 點擊事件處理
async function handleHit(event) {
    event.preventDefault();
    
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
    
    // 添加點擊效果
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    container.appendChild(ripple);
    
    // 移除點擊效果
    setTimeout(() => {
        ripple.remove();
    }, 1000);
    
    resetIdleTimer();
    score += 1;
    scoreElement.textContent = score;
    
    // 更新進度條
    const progressFill = document.querySelector('.progress-fill');
    const hitsLeft = document.querySelector('.hits-left');
    const hitsToAngry = 10 - (score % 10);
    progressFill.style.width = `${((10 - hitsToAngry) / 10) * 100}%`;
    hitsLeft.textContent = hitsToAngry;
    
    // 播放音效
    playRandomSound();
    
    // 添加打擊動畫
    victor.classList.remove('hit');
    void victor.offsetWidth;
    victor.classList.add('hit');
    
    // 根據分數切換表情
    if (score % 10 === 0) {
        // 憤怒模式
        changeExpression('angry');
        victor.classList.add('angry');
        document.querySelector('.character-container').classList.add('angry');
        speechBubble.classList.add('hidden');
        
        // 播放特殊音效
        playRandomSound(true);
    } else if (score % 10 === 1) {
        // 恢復正常
        changeExpression('normal');
        victor.classList.remove('angry');
        document.querySelector('.character-container').classList.remove('angry');
        
    } else {
        // 隨機表情
        const newExpression = getRandomExpression();
        changeExpression(newExpression);
        
        // 0.5秒後恢復正常表情
        setTimeout(() => {
            if (currentExpression !== 'angry') {
                changeExpression('normal');
            }
        }, 500);
    }
    
    // 防止事件冒泡
    event.stopPropagation();
}

// 重置遊戲
function resetGame() {
    score = 0;
    scoreElement.textContent = score;
    changeExpression('normal');
    victor.classList.remove('angry');
    document.querySelector('.character-container').classList.remove('angry');
    
    // 重置進度條
    const progressFill = document.querySelector('.progress-fill');
    const hitsLeft = document.querySelector('.hits-left');
    progressFill.style.width = '0%';
    hitsLeft.textContent = '10';
}

// 事件監聽
const container = document.querySelector('.character-container');

// 處理第一次互動
async function handleFirstInteraction(event) {
    if (!isAudioInitialized) {
        await initSounds();
    }
    handleHit(event);
}

container.addEventListener('mousedown', handleFirstInteraction);
container.addEventListener('touchstart', handleFirstInteraction, { passive: false });

// 添加觸摸反饋
container.addEventListener('mouseenter', () => {
    container.classList.add('hover');
});

container.addEventListener('mouseleave', () => {
    container.classList.remove('hover');
});

container.addEventListener('touchstart', () => {
    container.classList.add('hover');
}, { passive: true });

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
});
