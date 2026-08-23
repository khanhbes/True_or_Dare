Implementation Plan — Mobile Gameplay Sync với Web
Problem Statement: Bản mobile đã có đầy đủ UI và logic nhưng có nhiều gap quan trọng so với bản web: settings không truyền từ Setup sang Game, Reroll/Difficulty Boost chưa có UI, cloud catalog chưa wire, audio chưa có sound thật, và một số edge case của gameplay flow chưa khớp hoàn toàn.

Requirements:

1=a: Có Reroll + Difficulty Boost UI với star balance
2=a: Có sound thật (synthesized hoặc file)
3=a: Có cloud catalog sync từ Cloudflare
Proposed Solution: Fix theo thứ tự ưu tiên từ critical đến nice-to-have, mỗi task là một working increment có thể demo ngay.

Task Breakdown
Task 1: Fix Settings Pipeline từ Setup → Game

Objective: Toàn bộ GameSettings (levels, outfits, drawMode, timers, privacyDefault, penaltyClothing) được truyền từ SetupScreen sang game route và dùng đúng trong GameTable.

Implementation guidance:

Trong setup.tsx, thay vì chỉ truyền p1Name/p1Avatar/p2Name/p2Avatar qua route params, serialize toàn bộ GameSettings và 2 Player objects thành JSON rồi pass qua router.push params
Trong game.tsx, đọc params JSON đó, deserialize bằng hydrateGameSettings() và hydrateOutfitConfig() đã có sẵn
Fix availableCards để filter đúng theo settings.levels từ user (không phải default)
Fix outfitStates để tạo từ settings.outfits đã hydrate, không phải hydrateGameSettings(null)
Fix completeCard() trong GameTable để dùng calculateCompletedPositionLuxury() thay vì hardcode luxuryGain ?? 10
Thêm timer settings vào resolveCardTimerSeconds (đã có sẵn trong cardTimer.ts)
Test: Setup với levels chỉ "gentle", bắt đầu game → chỉ thấy gentle cards. Setup outfit đặc biệt → figure hiển thị đúng outfit đó.

Demo: Toàn bộ flow Setup → Game hoạt động đúng với mọi setting user đã chọn.

Task 2: Reroll UI + Star Balance Display

Objective: Player thấy star balance của mình và có thể dùng 8★ để đổi lá bài hiện tại (chỉ một lần mỗi lá).

Implementation guidance:

Trong game.tsx, thêm state: playerRewards: [PlayerRewardState, PlayerRewardState], rewardEvents: RewardEvent[], pendingDifficultyBoosts: PendingDifficultyBoost | null — dùng createRewardStates() từ rewards.ts
Truyền các state mới này vào GameTable props
Trong GameTable, khi completeCard() được gọi, tính stars earned = deriveDifficultyStars(card) → call awardStars() từ rewards.ts
Thêm nút Reroll (đổi thẻ) trong card action area khi cardState === 'drawn_revealed' và chưa reroll lần nào (hasRerolled local state). Nút disabled nếu playerRewards[currentPlayerIndex].starBalance < 8
Khi Reroll: call spendReward(..., 'reroll') → draw lại card mới (exclude card hiện tại qua excludedCardIds) → record CardResolutionEvent status 'rerolled' cho card cũ
Hiển thị star balance mỗi player trong header dưới dạng ⭐ N
Test: Complete card 5★ → nhận 5★ hiển thị. Reroll khi đủ 8★ → thẻ mới xuất hiện, balance trừ 8.

Demo: Header hiển thị ⭐ N cho từng player. Nút Reroll có giá và hoạt động đúng.

Task 3: Difficulty Boost UI

Objective: Player dùng 10★ để boost độ khó lá bài tiếp theo của đối phương.

Implementation guidance:

Thêm nút Boost (tăng độ khó) chỉ hiển thị khi cardState === 'deck' (chưa rút) và journeyPhase === 'standard'
Nút disabled nếu balance < 10 hoặc đã có boost đang pending cho opponent
Khi tap: call spendReward(..., 'difficulty_boost') → set pendingDifficultyBoosts với { ownerPlayerIndex, targetPlayerIndex: opponentIndex, queuedRound }
Trong drawStandardCard(), đọc pendingDifficultyBoosts → pass difficultyBoost: true vào selectJourneyCard() nếu boost target là current actor → clear pending sau draw
Refund boost nếu intimacyPercent >= 100 khi pending → dùng refundPendingDifficultyBoost()
Hiển thị visual indicator "🔥 Boost đang chờ" trên player card của target
Test: Player 0 spend 10★ boost → Player 1 rút lá → lá rút có star cao hơn bình thường ở band đó. Balance trừ đúng.

Demo: Boost pending indicator hiển thị. Turn tiếp theo card xuất hiện với difficulty cao hơn.

Task 4: Audio Engine với Synthesized Sounds

Objective: Game có sound thật cho mọi action: flip, shuffle, complete, skip, timer alarm, ambient music.

Implementation guidance:

Đọc docs expo-audio v57 trước khi code: https://docs.expo.dev/versions/v57.0.0/sdk/audio/
Tạo sounds synthesized bằng cách generate audio buffers với Web Audio API-style approach, hoặc đơn giản hơn: tạo các file .mp3 nhỏ tối giản (beep tones) đặt vào assets/sounds/
Nếu dùng file: flip.mp3, shuffle.mp3, complete.mp3, skip.mp3, alarm.mp3, music_loop.mp3
Update SoundEngine trong audio.ts để load và play các file này qua createAudioPlayer() (đã import sẵn)
Thêm playTimerAlarm(durationMs) và stopTimerAlarm() — alarm loop khi timer hit 0
Ambient music: load music_loop.mp3, set loop: true, volume thấp (0.15)
Giữ haptics như fallback khi audio fail hoặc muted
Test: Mute toggle tắt hết sound nhưng giữ haptics. Timer alarm kêu khi countdown về 0 và dừng khi skip/complete.

Demo: Toàn bộ game có âm thanh sống động. Music toggle trên IntroScreen hoạt động thật.

Task 5: Have Sex Card Terminal Flow + Position Consent "End Here"

Objective: Hai edge case kết thúc game khớp hoàn toàn với bản web.

Implementation guidance:

Position consent gate: Thêm button "Kết thúc tại đây" bên cạnh "Bắt đầu chuẩn bị" trong consent screen. Khi tap → call onFinishGame('pink_complete') → SummaryModal mở với terminal=true
Have Sex card flow: Khi card drawn có position?.family === 'have_sex', ẩn hết action buttons (Complete/Skip), chỉ hiện button "Đã xem · Kết thúc ván". Khi tap → record CardResolutionEvent status 'final_viewed' → call onFinishGame('have_sex')
Terminal SummaryModal: Thêm prop terminal: boolean vào SummaryModal. Khi terminal=true, ẩn nút đóng (×), chỉ hiển thị "Về Trang Chủ" và "Ván Mới"
Trong game.tsx, handle onFinishGame để set { showSummary: true, terminal: true } thay vì ngay lập tức router.replace('/'); chỉ navigate home khi user bấm button trong summary
Test: Pha position consent → "Kết thúc tại đây" → SummaryModal hiện, không có nút đóng. Have sex card → chỉ 1 button → summary terminal.

Demo: Game kết thúc đúng 3 cách: pink_complete, have_sex, và no_cards.

Task 6: Probability Panel

Objective: Hiển thị xác suất rút Truth/Dare và từng mức sao, đóng băng lại khi đang có lá bài.

Implementation guidance:

Tạo component DrawProbabilityPanel nhỏ, collapsible (tap để mở/đóng)
Khi cardState === 'deck': tính live probabilities bằng getJourneyDrawProbabilities() hoặc luxuryProbabilitiesForCandidates — truyền current state
Khi cardState === 'drawn_*': hiện drawProbabilitySnapshot đã frozen (đã có sẵn trong state)
Hiển thị dạng: 💬 Sự thật 65% 🔥 Thử thách 35% và bars nhỏ cho ★:N%
Trong position phase: chỉ hiển thị star distribution, ẩn Truth/Dare
Đặt panel dưới progress bars, trước deck area
Test: Thay đổi intimacy% → bars thay đổi. Rút card → values đóng băng. Complete/skip → unfreeze.

Demo: Panel hiển thị live probabilities, đóng băng khi card active, unfreeze sau turn.

Task 7: Completion Toast + Confetti

Objective: Feedback visual và confetti khi hoàn thành card như bản web.

Implementation guidance:

Wire react-native-confetti-cannon (đã install): sau completeCard() → fire confetti từ center-top của màn hình
Tạo component CompletionToast nhỏ: fade in/out với Reanimated, hiển thị +X% thân mật · +N★
Toast mount sau complete event, tự dismiss sau 2.5 giây
Đặt toast ở fixed position trên ScrollView (dùng absolute positioning)
Cho position cards: hiển thị +X% luxury · ✦
Test: Complete card 3★ → toast hiện +8% thân mật · +3★, confetti fire, tự mất sau 2.5s.

Demo: Game completion có visual flair như bản web.

Task 8: Cloud Catalog Sync

Objective: App load catalog từ Cloudflare, merge với INITIAL_CARDS, update card list trong game.

Implementation guidance:

Đọc EXPO_PUBLIC_API_URL từ .env (đã có file .env trong project)
Trong 
_layout.tsx
 hoặc index.tsx, khi app mount: call fetchCloudCatalogIfChanged(cachedRevision) từ cloudCatalog.ts (đã implement xong)
Dùng catalogCache.get/set() để cache local (đã implement)
Merge strategy: INITIAL_CARDS là base, cloud editedCards override system cards by ID, cloud customCards thêm vào, deletedSystemCardIds remove
Tạo hook useCloudCatalog() trả về { cards, syncStatus, refresh } — dùng CatalogSyncStatus type đã có
Pass merged cards vào availableCards ở game.tsx
Hiển thị sync status indicator nhỏ trên collection screen (đã có CatalogSyncMode type)
Images: dùng fileSystemImageStore (đã implement) + hydrateCloudCatalogImages()
Polling: refresh khi app về foreground (AppState change)
Test: Thay đổi 1 card trên web admin → mở app lại → card update hiển thị. Offline → app dùng cached catalog.

Demo: Collection hiển thị tất cả cloud cards. Sync status indicator (cloud/offline/error) hiển thị rõ ràng.

Task 9: Card Flip 3D Animation

Objective: Thay SlideInUp bằng 3D flip animation khi card được reveal (như bản web).

Implementation guidance:

Dùng Reanimated useSharedValue + useAnimatedStyle với rotateY transform
Phase 1 (0→90°): card quay vào, lúc 90° swap content (hidden → shown)
Phase 2 (90→0°): card quay ra với nội dung mới
Duration: 600ms, easing Easing.out(Easing.cubic) — smooth như bản web
Shuffle animation (deck state): rotateY: [0, 180, 360] loop nhẹ, 0.8s
Deck visual: 3 layers stacked với offset nhỏ (đã có nhưng static) → thêm nhẹ floating animation
Test: Tap "Rút lá" → deck shuffle animation. Tap "Xem nội dung" → 3D flip reveal.

Demo: Game có card flip animation mượt mà, có chiều sâu.