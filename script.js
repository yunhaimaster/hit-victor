let score = 0;
const scoreElement = document.getElementById('score');
const victor = document.getElementById('victor');
const glasses = document.getElementById('glasses');
const hair = document.getElementById('hair');
const mouth = document.getElementById('mouth');
const resetBtn = document.getElementById('resetBtn');

// 音效
let screamSound = null;

// Victor 的挑釁語句
const taunts = [
    "打我呀,哈哈!",
    "EasyPack, Take Easy!",
    "你打不到我的~",
    "就這樣?",
    "你太慢了!",
    "你好弱喔!",
    "來啊,繼續打啊!",
    "這樣不痛不癢啦!",
    "你是不是累了?",
    "我都睡著了...",
    "你的準頭好差!",
    "EVA打得比你準多了!",
    "你是不是手抖啊?",
    "這樣也能叫打嗎?"
];

let lastTauntIndex = -1;

let idleTimer = null;
const speechBubble = document.getElementById('speech-bubble');
const speechText = speechBubble.querySelector('p');

// 預加載音效
function loadSounds() {
    try {
        // 使用男性慘叫聲音效
        screamSound = new Audio('sounds/scream.mp3');
        screamSound.load();
    } catch (e) {
        console.log('Audio not supported');
    }
}

// 表情狀態
let isAngry = false;

// 顯示挑釁語句
function showTaunt() {
    if (!isAngry) {  // 只在不生氣時顯示挑釁
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * taunts.length);
        } while (newIndex === lastTauntIndex);  // 避免重複顯示同一句話
        
        lastTauntIndex = newIndex;
        speechText.textContent = taunts[newIndex];
        speechBubble.classList.remove('hidden');
        
        // 1.5秒後自動更換新的挑釁語句
        idleTimer = setTimeout(showTaunt, 1500);
    }
}

// 重置閒置計時器
function resetIdleTimer() {
    clearTimeout(idleTimer);
    speechBubble.classList.add('hidden');
    idleTimer = setTimeout(showTaunt, 1000);  // 1秒後開始挑釁
}

// 點擊事件處理
function handleHit(event) {
    resetIdleTimer();  // 重置閒置計時器
    score += 1;
    scoreElement.textContent = score;
    
    // 防止動畫重疊
    const target = event.target;
    target.classList.remove('hit');
    void target.offsetWidth; // 觸發重排,重置動畫
    
    // 根據點擊位置決定動畫
    if (event.target.closest('#glasses')) {
        glasses.classList.add('hit');
        setTimeout(() => glasses.classList.remove('hit'), 500);
    } else if (event.target.closest('#hair')) {
        hair.classList.add('hit');
        setTimeout(() => hair.classList.remove('hit'), 500);
    } else if (event.target.closest('#mouth')) {
        mouth.classList.add('hit');
        setTimeout(() => mouth.classList.remove('hit'), 300);
    } else {
        victor.classList.add('hit');
        setTimeout(() => victor.classList.remove('hit'), 500);
    }
    
    // 播放慘叫音效
    if (screamSound) {
        screamSound.currentTime = 0;
        screamSound.play().catch(() => {});
    }
    
    // 每10分變臉
    if (score % 10 === 0) {
        isAngry = true;
        victor.classList.add('angry');
        document.querySelector('.character-container').classList.add('angry');
    } else if (score % 10 === 1) {
        isAngry = false;
        victor.classList.remove('angry');
        document.querySelector('.character-container').classList.remove('angry');
    }
}

// 重置遊戲
function resetGame() {
    score = 0;
    scoreElement.textContent = score;
    isAngry = false;
    victor.classList.remove('angry');
    document.querySelector('.character-container').classList.remove('angry');
}

// 事件監聽
victor.addEventListener('mousedown', handleHit);
victor.addEventListener('touchstart', handleHit, { passive: true });
resetBtn.addEventListener('click', resetGame);

// 防止拖動SVG
victor.addEventListener('dragstart', (e) => e.preventDefault());

// 移動端優化
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// 當頁面加載完成時初始化
window.addEventListener('load', () => {
    loadSounds();
    resetIdleTimer();  // 開始閒置計時
});

// 滑鼠移動時也重置計時器
document.addEventListener('mousemove', resetIdleTimer);
