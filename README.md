# 打 Victor!

一個有趣的網頁遊戲，讓你發洩對 Victor 的不滿！

## 遊戲特色

- 限時20秒快速攻擊模式
- 精美的 SVG 表情動畫系統
- 表情會隨住傷害程度變化
- 每次攻擊都有動畫效果和音效
- 支援電腦和手機操作
- 全球前5名排行榜系統
- PWA 支援，可安裝到手機主屏幕
- 響應式設計，完美支援各種螢幕尺寸

## 遊戲玩法

1. 點擊「開始」按鈕開始遊戲
2. 在20秒內盡可能多次擊中 Victor
3. 觀察 Victor 的表情變化和反應
4. 遊戲結束時，如果進入前5名，可以輸入你的名字
5. 實時查看全球排行榜，挑戰最高分

## 安裝和運行

### 本地運行

1. 下載或克隆此專案:
```bash
git clone [repository-url]
```

2. 進入專案目錄:
```bash
cd hitVictor
```

3. 啟動本地伺服器:
```bash
python3 -m http.server 8000
```

4. 在瀏覽器中訪問:
```
http://localhost:8000
```

### 直接訪問

你也可以直接訪問線上版本：[遊戲連結]

### GitHub Pages 部署

1. 在 GitHub 倉庫設定中啟用 GitHub Pages
2. 選擇部署分支（通常是 `main` 或 `master`）
3. 等待部署完成後，即可通過 `https://[username].github.io/hitVictor` 訪問

注意：在 GitHub Pages 上運行時，控制台可能會顯示以下警告：
```
Error with Permissions-Policy header: Unrecognized feature: 'interest-cohort'.
Error with Permissions-Policy header: Origin trial controlled feature not enabled: 'private-state-token-redemption'.
Error with Permissions-Policy header: Origin trial controlled feature not enabled: 'private-state-token-issuance'.
Error with Permissions-Policy header: Unrecognized feature: 'browsing-topics'.
```
這些是 GitHub Pages 的隱私保護設置產生的正常警告，不會影響遊戲功能。

## 技術實現

### 前端技術
- HTML5 + CSS3 + JavaScript
- SVG 動畫和表情系統
- 響應式設計適配各種設備
- PWA 支援
- 自定義滾動條樣式
- 優化的移動端體驗

### 音效系統
- 音效池管理
- 移動端音頻優化
- 自動音頻解鎖
- 多種隨機音效

### 後端整合
- Firebase Firestore 數據庫
- 實時排行榜同步
- 離線數據存儲
- 安全的數據讀寫

## 瀏覽器支援

- Chrome (推薦)
- Firefox
- Safari
- Edge
- 移動版瀏覽器

## 開發者工具

如果你想參與開發，需要以下工具：

- 現代瀏覽器（推薦 Chrome）
- 文本編輯器（VS Code, Sublime Text 等）
- Python（用於本地開發伺服器）
- Git（版本控制）
- Firebase 帳號（用於排行榜功能）

## 常見問題

### 排行榜無法顯示或更新

如果你使用廣告攔截器（如 AdBlock、uBlock Origin 等），可能會導致排行榜功能無法正常工作。你會在瀏覽器控制台看到類似以下錯誤：

```
POST https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?... net::ERR_BLOCKED_BY_CLIENT
```

解決方法：
1. 暫時停用廣告攔截器
2. 或在廣告攔截器中將本網站加入白名單
3. 或允許 `firestore.googleapis.com` 域名的連接

## 問題回報

如果你發現任何問題或有改進建議，歡迎提出 Issue 或 PR。

## 作者

EVA 專屬發洩遊戲

## 版本歷史

### v1.5.0
- 優化排行榜系統
- 新增前3名排行榜
- 改進移動端顯示效果
- 優化界面佈局和響應式設計
- 新增自定義滾動條樣式

### v1.6.0
- 新增精美的資源加載畫面
- 優化資源加載進度計算
- 改進音效系統，防止音效重疊
- 優化移動端體驗
- 改進錯誤處理機制

## 授權

本專案採用 MIT 授權條款 - 詳見 LICENSE 文件

## 移動應用開發

### Android 應用

可以使用以下方法將遊戲轉換為 Android 應用：

1. **使用 PWA Builder**
   - 訪問 [PWA Builder](https://www.pwabuilder.com/)
   - 輸入遊戲的網址
   - 選擇 Android 打包選項
   - 按照指示生成 APK 或 Android App Bundle

2. **使用 Capacitor**
   ```bash
   # 初始化 Capacitor 專案
   npm init @capacitor/app
   
   # 安裝必要套件
   npm install @capacitor/core @capacitor/android
   
   # 添加 Android 平台
   npx cap add android
   
   # 打包網頁內容
   npm run build
   
   # 同步到 Android 專案
   npx cap sync android
   ```

3. **使用 WebView**
   - 創建原生 Android 專案
   - 使用 WebView 加載遊戲網頁
   - 實現離線緩存和本地存儲
   - 添加推送通知等原生功能

### iOS 應用

可以使用以下方法將遊戲轉換為 iOS 應用：

1. **使用 PWA Builder**
   - 同 Android 流程
   - 選擇 iOS 打包選項
   - 需要 Apple 開發者帳號

2. **使用 Capacitor**
   ```bash
   # 添加 iOS 平台
   npx cap add ios
   
   # 同步到 iOS 專案
   npx cap sync ios
   ```

3. **使用 WKWebView**
   - 創建原生 iOS 專案
   - 使用 WKWebView 加載遊戲網頁
   - 實現離線緩存和本地存儲
   - 添加推送通知等原生功能

### 注意事項

1. **應用商店審核**
   - Google Play Store 和 App Store 都有嚴格的審核標準
   - 需要提供隱私政策
   - 需要適當的應用描述和截圖
   - 可能需要調整遊戲內容以符合商店政策

2. **開發者帳號**
   - Google Play Console 帳號：一次性費用 $25
   - Apple Developer Program：年費 $99

3. **原生功能整合**
   - 推送通知
   - 應用內購買
   - 社交分享
   - 離線遊戲
   - 設備存儲

4. **效能優化**
   - 資源預加載
   - 離線緩存
   - 動畫效能
   - 記憶體管理

5. **測試要求**
   - 需要在不同設備上測試
   - 需要處理不同螢幕尺寸
   - 需要測試離線功能
   - 需要測試系統更新的相容性

### 建議開發流程

1. 先使用 PWA Builder 快速製作測試版
2. 評估用戶反饋和市場需求
3. 如果反應良好，再考慮使用 Capacitor 或原生開發
4. 逐步添加原生功能和優化

## 技術特點

### 加載系統
- 精美的加載畫面設計
- 科學的加載進度計算
- 分權重的資源加載機制
- 平滑的進度條動畫
- 優雅的加載失敗處理

### 音效系統
- 智能音效池管理
- 防止音效重疊播放
- 根據情緒改變音效特性
- 自動音效資源管理
- 完整的錯誤處理機制

### 遊戲特色
- 限時20秒快速攻擊模式
- 精美的表情動畫系統
- 表情會隨住傷害程度變化
- 每次攻擊都有動畫效果和音效
- 支援電腦和手機操作
- 全球前3名排行榜系統
- PWA 支援，可安裝到手機主屏幕
- 響應式設計，完美支援各種螢幕尺寸
