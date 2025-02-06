let score = 0;
const scoreElement = document.getElementById('score');
const victor = document.getElementById('victor');
const glasses = document.getElementById('glasses');
const hair = document.getElementById('hair');
const mouth = document.getElementById('mouth');
const resetBtn = document.getElementById('resetBtn');

// 音效
let screamSound = null;
let isAudioLoaded = false;

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

let idleTimer = null;
const speechBubble = document.getElementById('speech-bubble');
const speechText = speechBubble.querySelector('p');

// 預加載音效
function loadSounds() {
    try {
        screamSound = new Audio('sounds/scream.mp3');
        screamSound.volume = 1.0;  // 確保音量最大
        
        // 預加載音效
        const preloadSound = () => {
            screamSound.load();
            // 檢查是否已加載
            if (screamSound.readyState >= 2) {
                isAudioLoaded = true;
                console.log('Sound loaded successfully');
            } else {
                // 如果還沒加載完成,繼續監聽
                screamSound.addEventListener('canplaythrough', () => {
                    isAudioLoaded = true;
                    console.log('Sound loaded successfully');
                });
            }
        };

        // 立即開始預加載
        preloadSound();
        
        // 確保音效已加載
        screamSound.addEventListener('error', (e) => {
            console.log('Sound load error:', e);
            // 嘗試重新加載
            setTimeout(preloadSound, 1000);
        });
    } catch (e) {
        console.log('Audio not supported:', e);
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
        
        // 2秒後自動更換新的挑釁語句
        idleTimer = setTimeout(showTaunt, 2000);
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
    if (screamSound && isAudioLoaded) {
        const playSound = () => {
            screamSound.currentTime = 0;
            screamSound.volume = 1.0;
            const playPromise = screamSound.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => console.log('Sound played successfully'))
                    .catch(error => {
                        console.log('Sound play error:', error);
                        // 如果播放失敗,重新加載並重試
                        screamSound.load();
                        setTimeout(() => {
                            screamSound.play().catch(() => {});
                        }, 100);
                    });
            }
        };
        
        // 短暫延遲確保音效與動畫同步
        setTimeout(playSound, 50);
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
