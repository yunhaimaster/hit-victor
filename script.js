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

// 預加載音效
async function loadSounds() {
    try {
        // 載入哎也音效
        sounds.ouch = new Audio('sounds/哎也.mp3');
        sounds.pain = new Audio('sounds/好痛.mp3');

        // 設置音量
        sounds.ouch.volume = 1.0;
        sounds.pain.volume = 1.0;

        // 等待音效載入
        await Promise.all([
            new Promise(resolve => {
                sounds.ouch.addEventListener('canplaythrough', () => {
                    sounds.isLoaded.ouch = true;
                    console.log('Ouch sound loaded successfully');
                    resolve();
                }, { once: true });
            }),
            new Promise(resolve => {
                sounds.pain.addEventListener('canplaythrough', () => {
                    sounds.isLoaded.pain = true;
                    console.log('Pain sound loaded successfully');
                    resolve();
                }, { once: true });
            })
        ]);

        // 在用戶互動時初始化音效
        document.addEventListener('click', initSounds, { once: true });
        document.addEventListener('touchstart', initSounds, { once: true });

    } catch (e) {
        console.log('Audio not supported:', e);
    }
}

// 初始化音效
async function initSounds() {
    try {
        // 靜音播放以解鎖音效
        sounds.ouch.volume = 0;
        sounds.pain.volume = 0;
        await Promise.all([
            sounds.ouch.play().catch(() => {}),
            sounds.pain.play().catch(() => {})
        ]);
        
        // 恢復音量
        sounds.ouch.volume = 1.0;
        sounds.pain.volume = 1.0;
    } catch (e) {
        console.log('Sound initialization error:', e);
    }
}

// 播放隨機音效
async function playRandomSound(isAngry = false) {
    try {
        const soundType = Math.random() < 0.5 ? 'ouch' : 'pain';
        const sound = sounds[soundType];
        
        if (sound && sounds.isLoaded[soundType]) {
            // 創建新的音效實例
            const newSound = new Audio(sound.src);
            newSound.volume = isAngry ? 1.5 : 1.0;
            newSound.playbackRate = isAngry ? 0.8 : 1.0;
            
            // 播放音效
            await newSound.play();
            
            // 監聽播放結束事件來清理
            newSound.addEventListener('ended', () => {
                newSound.remove();
            }, { once: true });
        }
    } catch (error) {
        console.log('Sound play error:', error);
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
function handleHit(event) {
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
container.addEventListener('mousedown', handleHit);
container.addEventListener('touchstart', handleHit, { passive: false });

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
