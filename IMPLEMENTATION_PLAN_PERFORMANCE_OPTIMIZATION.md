# IMPLEMENTATION PLAN — PERFORMANCE OPTIMIZATION

## 1. Mục tiêu

Tối ưu hiệu năng cho web app Truth or Dare, tập trung vào các nguồn gây lag/jank chính:

1. Tính toán nặng chạy lại mỗi render.
2. Props/object/array không ổn định khiến memoization mất tác dụng.
3. `GameTable` giữ quá nhiều state và render phần lớn gameplay subtree.
4. Polling catalog gây re-render không cần thiết.
5. CSS animation sử dụng thuộc tính gây repaint nặng.
6. Particle, blur, backdrop-filter và SVG animation chạy liên tục.
7. Card Collection có nhiều card nhưng chưa có render boundary rõ ràng.

Mục tiêu cuối cùng:

- giảm render thừa;
- giảm CPU work trong mỗi lượt;
- giảm paint/repaint;
- giảm long task;
- cải thiện FPS;
- không thay đổi gameplay logic;
- không làm hỏng Standard / Position / Clothing Journey / Rewards / Catalog;
- tất cả test hiện tại vẫn pass.

---

# 2. Problem Statement

Không nên mô tả đơn giản rằng:

> `GameTable` ~2100 dòng / 26 state nên chậm.

Số dòng không trực tiếp gây lag.

Mô tả chính xác hơn:

> `GameTable` đang sở hữu nhiều state có tần suất cập nhật khác nhau và chứa phần lớn gameplay subtree. Khi một state nhỏ thay đổi, nhiều UI không liên quan có thể render lại. Đồng thời một số phép tính chọn bài, xác suất và filter catalog đang chạy lại do dependency/reference không ổn định.

---

# 3. Các vấn đề hiện tại

| Mức độ | Vấn đề | Nơi xảy ra |
|---|---|---|
| 🔴 Critical | `selectLuxuryPositionCard` chạy dù đang ở Standard | `GameTable.tsx` |
| 🔴 Critical | `getJourneyDrawProbabilities` và `getJourneyAvailableTypes` có thể lặp lại filter cùng candidate pool | `GameTable.tsx` |
| 🔴 Critical | `allCards` / `availableCards` tạo array mới mỗi render | `App.tsx` |
| 🔴 Critical | Các dependency object/array/set có thể không stable, làm `useMemo` vô hiệu | `App.tsx`, `GameTable.tsx` |
| 🔴 Critical | High-frequency state trong `GameTable` có thể làm re-render toàn subtree | `GameTable.tsx` |
| 🟠 High | Polling 10s ở App gây update toàn cây app | `App.tsx` |
| 🟠 High | `PlayerOutfitStatus` chưa có render boundary đủ tốt | `GameTable.tsx` |
| 🟠 High | Một số handler truyền xuống child đổi reference liên tục | `App.tsx`, `GameTable.tsx` |
| 🟠 High | animated `box-shadow` / `background-position` gây repaint | `index.css` |
| 🟡 Medium | 28 particles + large blur chạy infinite | `ParticleBackground.tsx` |
| 🟡 Medium | SVG outfit animation chạy liên tục | `outfit.css` |
| 🟡 Medium | backdrop-filter blur lớn trên header/footer | `index.css` |
| 🟢 Low | `GameCard` chưa memo hóa | `GameCard.tsx` |
| 🟢 Low | Collection có thể render hàng trăm card cùng lúc | `CardCollection` |

---

# 4. Nguyên tắc triển khai

Không tối ưu theo kiểu:

- thêm `useMemo` khắp nơi;
- thêm `useCallback` cho mọi handler;
- thêm `React.memo` cho mọi component;
- thêm `will-change` hàng loạt.

Mỗi optimization phải giải quyết một nguyên nhân cụ thể.

Ưu tiên:

1. đo;
2. loại bỏ computation thừa;
3. ổn định reference;
4. tách render boundary;
5. giảm high-frequency parent updates;
6. sau đó mới tối ưu CSS/animation.

---

# 5. Task 0 — Baseline Profiling

## Objective

Có số liệu trước khi thay đổi để biết task nào thực sự đem lại hiệu quả.

## Tools

- React DevTools Profiler;
- Chrome DevTools Performance;
- Chrome Rendering panel;
- Network panel;
- production build.

## 5.1. Đo trên production build

Không chỉ profile dev server.

Dev mode và React Strict Mode có thể render nhiều lần hơn production.

Chạy:

```bash
npm run build
```

sau đó chạy preview production build.

## 5.2. Các flow cần profile

Profile ít nhất:

### Flow A — Standard idle

Không bấm gì trong 10 giây.

### Flow B — Draw Standard card

Rút một card.

### Flow C — Timer running

Một card có timer chạy 10 giây.

### Flow D — Complete card

Hoàn thành card và đổi lượt.

### Flow E — Open Position

Vào Position phase.

### Flow F — Card Collection

Scroll qua collection.

## 5.3. Baseline metrics

| Metric | Before | After |
|---|---:|---:|
| `GameTable` renders / draw | | |
| `PlayerOutfitStatus` renders / turn | | |
| Render duration | ms | ms |
| Long Tasks > 50ms / flow | | |
| Paint events / 5s | | |
| Average FPS | | |
| Catalog updates / 30s game | | |
| `selectLuxuryPositionCard` calls in Standard | | |
| `getJourneyDrawProbabilities` calls / render | | |

---

# 6. Task 1 — Eliminate Wasted Calculations

## Objective

Không tính lại selection/probability/filtering khi input không đổi.

## Files

- `GameTable.tsx`
- `src/utils/progression.ts`
- selector/progression helpers liên quan

---

# 7. Audit Reference Stability trước khi `useMemo`

Đây là bước bắt buộc.

Kiểm tra:

- `availableCards`
- `outfitStates`
- `usedCardIds`
- `sessionPositionCardIds`
- `settings.levels`
- `progressionConfig`
- `luxuryProgressionConfig`
- `cardDirectorState`

Nếu một object được tạo inline mỗi render:

```ts
const config = {
  ...
};
```

thì dependency luôn đổi.

Nếu cần:

```ts
const config = useMemo(() => ({
  ...
}), [dependencies]);
```

---

# 8. Không mutate Set / Map trực tiếp

Sai:

```ts
usedCardIds.add(cardId);
setUsedCardIds(usedCardIds);
```

Reference không đổi nên memoized calculation có thể giữ kết quả cũ.

Đúng:

```ts
setUsedCardIds(prev => {
  const next = new Set(prev);
  next.add(cardId);
  return next;
});
```

Áp dụng tương tự với:

- `Map`;
- array;
- nested object.

---

# 9. Memoize Standard Selection Options

Trong `GameTable.tsx`:

```ts
const journeySelectionOptions = useMemo(
  () => ({
    cards: availableCards,
    actorIndex: currentPlayerIndex,
    outfits: outfitStates,
    usedCardIds,
    levels: settings.levels,
    intimacyPercent,
    config: progressionConfig,
    difficultyBoost: Boolean(activeDifficultyBoost),
    directorState: cardDirectorState,
  }),
  [
    availableCards,
    currentPlayerIndex,
    outfitStates,
    usedCardIds,
    settings.levels,
    intimacyPercent,
    progressionConfig,
    activeDifficultyBoost,
    cardDirectorState,
  ]
);
```

---

# 10. Không filter candidate pool hai lần

Nếu:

```ts
getJourneyAvailableTypes(options)
```

và:

```ts
getJourneyDrawProbabilities(options)
```

đều tự filter card, thì vẫn còn duplicate work.

## Đề xuất

Tạo helper:

```ts
getJourneyDrawAnalysis(options)
```

trả về:

```ts
{
  eligibleCards,
  availableTypes,
  probabilities,
  starProbabilities,
  diagnostics,
}
```

Sau đó:

```ts
const drawAnalysis = useMemo(
  () => getJourneyDrawAnalysis(journeySelectionOptions),
  [journeySelectionOptions]
);
```

Dùng:

```ts
const availableDrawTypes = drawAnalysis.availableTypes;
const drawProbabilities = drawProbabilitySnapshot?.deck === 'standard'
  ? drawProbabilitySnapshot.probabilities
  : drawAnalysis.probabilities;
```

---

# 11. Không gọi selector Position chỉ để lấy probability

Không nên:

```ts
selectLuxuryPositionCard({
  ...,
  random: () => 0,
}).probabilities;
```

Tách helper riêng:

```ts
getLuxuryDrawProbabilities(options)
```

Selector Position sử dụng helper đó bên trong.

---

# 12. Chỉ tính Luxury khi đang Position

```ts
const currentLuxuryProbabilities = useMemo(() => {
  if (journeyPhase !== 'position') {
    return null;
  }

  return getLuxuryDrawProbabilities({
    cards: availableCards,
    actorIndex: currentPlayerIndex,
    outfits: outfitStates,
    usedCardIds: sessionPositionCardIds,
    luxuryPercent: luxuryIntimacyPercent,
    config: luxuryProgressionConfig,
  });
}, [
  journeyPhase,
  availableCards,
  currentPlayerIndex,
  outfitStates,
  sessionPositionCardIds,
  luxuryIntimacyPercent,
  luxuryProgressionConfig,
]);
```

---

# 13. Acceptance Criteria — Task 1

Trong Standard:

```text
selectLuxuryPositionCard calls/render = 0
getLuxuryDrawProbabilities calls/render = 0
```

Nếu state không liên quan thay đổi:

```text
Journey analysis không chạy lại.
```

Profiler phải xác nhận.

---

# 14. Task 2 — Stabilize `App → GameTable` Props

## Objective

Không tạo card arrays và props mới mỗi App render.

## File

`App.tsx`

---

# 15. Memoize `allCards`

```ts
const allCards = useMemo(() => {
  return [
    ...INITIAL_CARDS
      .filter(...)
      .map(...),
    ...customCards,
  ].sort(compareCollectionCards);
}, [
  customCards,
  editedCards,
  deletedSystemCardIds,
]);
```

Audit kỹ dependencies thực tế.

---

# 16. Memoize `availableCards`

```ts
const availableCards = useMemo(
  () =>
    allCards.filter(
      card =>
        getCardDeck(card) === 'position' ||
        settings.levels.includes(card.level)
    ),
  [allCards, settings.levels]
);
```

---

# 17. Không tạo array/object props inline

Tránh:

```tsx
<GameTable
  levels={[...settings.levels]}
  options={{ ...something }}
/>
```

Nếu cần object:

```ts
const gameOptions = useMemo(
  () => ({ ... }),
  [...]
);
```

---

# 18. Session Card Snapshot

Đây là improvement vừa về performance vừa gameplay correctness.

Khi bắt đầu game:

```ts
const [sessionCards, setSessionCards] = useState<Card[]>([]);
```

Start game:

```ts
setSessionCards(availableCards);
```

Trong game:

```tsx
<GameTable cards={sessionCards} />
```

Thay vì liên tục truyền catalog live.

Lợi ích:

- catalog update giữa game không đổi deck hiện tại;
- GameTable props ổn định hơn;
- balancing của session không thay đổi giữa chừng;
- remote refresh không ảnh hưởng draw pipeline đang chạy.

---

# 19. Task 3 — Split `GameTable` Render Boundaries

## Objective

Không để một state nhỏ làm render toàn gameplay.

## File

`GameTable.tsx`

---

# 20. Component Structure đề xuất

Tách dần thành:

```text
GameTable
│
├── GameProgressHeader
│
├── PlayersArea
│   ├── PlayerPanel
│   └── PlayerPanel
│
├── CurrentCardStage
│   ├── CardDisplay
│   └── CardTimer
│
├── GameActionBar
│
├── RewardControls
│
├── PositionProgress
│
└── GameOverlays
```

Không cần refactor toàn bộ một lần.

Tách theo render frequency.

---

# 21. Ưu tiên tách state cập nhật thường xuyên

Đặc biệt kiểm tra:

- timer countdown;
- animation state;
- card reveal;
- muted state;
- temporary modal;
- local transition state.

Ví dụ timer không nên nằm trong `GameTable` nếu chỉ `CardTimer` dùng.

Sai:

```text
GameTable
  timer = 60 → 59 → 58
```

Mỗi tick có thể render cả game.

Đúng:

```text
CurrentCardStage
  └── CardTimer
        timer state
```

---

# 22. `PlayerOutfitStatus` dùng `React.memo`

```tsx
const PlayerOutfitStatus = React.memo<PlayerOutfitStatusProps>(
  (props) => {
    ...
  }
);
```

Nhưng điều kiện để memo hiệu quả:

- player object stable;
- outfit state stable;
- callbacks stable;
- không truyền giant object.

---

# 23. Pass nhỏ nhất có thể

Không nên:

```tsx
<PlayerPanel gameState={gameState} />
```

nếu component chỉ cần:

```tsx
<PlayerPanel
  name={player.name}
  avatar={player.avatar}
  outfitState={outfitState}
  isCurrent={isCurrent}
/>
```

Props nhỏ giúp:

- dễ memo;
- dễ debug render;
- ít accidental invalidation.

---

# 24. `useCallback` có chọn lọc

Chỉ dùng `useCallback` khi:

1. callback truyền xuống component `React.memo`;
2. callback là dependency của effect/memo cần stable identity;
3. library API yêu cầu stable callback.

Không blanket-wrap toàn bộ function.

---

# 25. Dùng functional update để giảm dependency

Ví dụ:

```ts
const handleToggleFavorite = useCallback((cardId: string) => {
  setFavorites(prev => {
    ...
  });
}, []);
```

Tốt hơn:

```ts
useCallback(..., [favorites]);
```

nếu logic cho phép.

---

# 26. `useReducer` không phải performance fix

Nếu sau này gom 26 state thành reducer:

```ts
useReducer(...)
```

lợi ích chính:

- state logic rõ hơn;
- transition dễ test hơn.

Nhưng component chứa reducer vẫn render khi dispatch.

Do đó không dùng reducer như lý do chính để tối ưu render.

---

# 27. Acceptance Criteria — Task 3

Khi timer tick:

```text
PlayerOutfitStatus render = 0
RewardControls render = 0
Static card shell render = 0
```

Khi đổi outfit:

```text
chỉ PlayerPanel liên quan và các UI phụ thuộc wardrobe render.
```

Khi mute toggle:

```text
không render lại card selector/progression UI.
```

---

# 28. Task 4 — Fix Catalog Polling

## Objective

Polling không làm ảnh hưởng gameplay session.

## File

`App.tsx`

---

# 29. Suspend polling khi đang chơi

Đơn giản:

```ts
useEffect(() => {
  if (catalogSync.mode === 'draft') return;
  if (screen === 'game') return;

  ...
}, [
  screen,
  catalogSync.mode,
  ...
]);
```

Nhưng cần tránh restart interval do dependencies thay đổi liên tục.

---

# 30. Stable interval với refs

```ts
const screenRef = useRef(screen);

useEffect(() => {
  screenRef.current = screen;
}, [screen]);
```

Nếu `refreshCatalog` không stable:

```ts
const refreshCatalogRef = useRef(refreshCatalog);

useEffect(() => {
  refreshCatalogRef.current = refreshCatalog;
}, [refreshCatalog]);
```

Interval:

```ts
useEffect(() => {
  const interval = window.setInterval(() => {
    if (screenRef.current === 'game') return;

    refreshCatalogRef.current();
  }, 10_000);

  return () => window.clearInterval(interval);
}, []);
```

---

# 31. Không update state nếu catalog revision không đổi

Flow:

```text
poll
 ↓
server revision
 ↓
same revision?
 ├─ yes → return
 └─ no  → parse + setState
```

Nếu:

```text
revision 106 → 106
```

không chạy:

```ts
setCatalog(...)
setCards(...)
```

---

# 32. Optional — Refresh ngay khi rời game

Nếu muốn dữ liệu mới xuất hiện ngay sau game:

```ts
if (previousScreen === 'game' && screen !== 'game') {
  refreshCatalog();
}
```

Sau đó polling bình thường tiếp tục.

---

# 33. Acceptance Criteria — Task 4

Trong `screen === 'game'`:

```text
/api/catalog requests trong 30s = 0
```

hoặc ít nhất:

```text
catalog React state updates = 0
```

Sau khi thoát game:

```text
catalog có thể refresh lại.
```

---

# 34. Task 5 — CSS / Animation Optimization

## Objective

Giảm repaint và GPU/CPU load.

## Files

- `index.css`
- `outfit.css`
- `ParticleBackground.tsx`

---

# 35. Remove animated `box-shadow`

Trước:

```css
@keyframes rare-card-color-drift {
  0%, 100% {
    box-shadow: ...;
  }

  50% {
    box-shadow: ...;
  }
}
```

Sau:

```css
.card-position-rare {
  position: relative;
  box-shadow:
    0 28px 90px rgba(0, 0, 0, 0.62),
    0 0 42px rgba(244, 232, 255, 0.16);
}
```

Dùng pseudo-element:

```css
.card-position-rare::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;

  opacity: 0.62;
  animation: rare-card-ambience 9s ease-in-out infinite;
}

@keyframes rare-card-ambience {
  0%,
  100% {
    opacity: 0.62;
  }

  50% {
    opacity: 0.88;
  }
}
```

---

# 36. Không animate `background-position`

Nếu visual hiện cần drift:

thay bằng:

- static gradient;
- pseudo-element;
- `opacity`;
- `transform`.

Ưu tiên:

```text
transform
opacity
```

---

# 37. Particle Count responsive

Thay vì cố định 28:

### Mobile

```text
8–10 particles
```

### Desktop

```text
14–16 particles
```

Ví dụ:

```ts
const particleCount = isSmallViewport ? 10 : 16;
```

Particles data vẫn memoized:

```ts
const particles = useMemo(
  () => Array.from({ length: particleCount }).map(...),
  [particleCount]
);
```

---

# 38. Bokeh optimization

Nếu bokeh blur đang di chuyển:

không nên chỉ đổi:

```text
blur(60px) → blur(40px)
```

mà vẫn animate cả blurred layer.

Ưu tiên:

```css
background: radial-gradient(...);
```

rồi animate:

```css
transform
opacity
```

---

# 39. `will-change` chỉ dùng chọn lọc

Có thể dùng:

```css
.outfit-figure__character {
  will-change: transform;
}

.luxury-heart-fill::after {
  will-change: transform;
}
```

Nhưng không thêm hàng loạt.

Quá nhiều compositing layer có thể:

- tăng GPU memory;
- làm performance tệ hơn.

---

# 40. Backdrop Filter

Audit:

```css
backdrop-filter: blur(16px);
```

trên header/footer cố định.

Đề xuất:

### Desktop

```css
backdrop-filter: blur(8px);
```

hoặc `10px`.

### Mobile

ưu tiên:

```css
backdrop-filter: none;
background: rgba(..., 0.94);
```

nếu visual vẫn chấp nhận được.

---

# 41. `prefers-reduced-motion`

Bắt buộc nên thêm:

```css
@media (prefers-reduced-motion: reduce) {
  .particle,
  .outfit-figure__character,
  .rare-card-ambience,
  .luxury-heart-fill::after {
    animation: none !important;
  }
}
```

Có thể giảm thêm:

- bokeh;
- decorative pulse;
- ambience.

---

# 42. Animation Acceptance Criteria

Không còn continuous animation trên:

```text
box-shadow
background-position
```

Particle:

```text
mobile <= 10
desktop <= 16
```

High blur moving layers:

```text
được thay bằng gradient/opacity/transform nếu có thể.
```

---

# 43. Task 6 — Card Collection Optimization

## Objective

Collection không render lại hàng loạt card không cần thiết.

## Files

- `GameCard.tsx`
- `CardCollection.tsx`

---

# 44. `React.memo(GameCard)`

```tsx
export const GameCard = React.memo(GameCardComponent);
```

Đảm bảo props:

- card object stable;
- callback stable;
- favorite state primitive.

---

# 45. Stable collection handlers

Ví dụ:

```ts
const handleToggleFavorite = useCallback(
  (cardId: string) => {
    ...
  },
  []
);
```

nếu dùng functional update.

---

# 46. Nếu Collection vẫn lag

Nếu collection render 200+ card cùng lúc, `React.memo` có thể chưa đủ.

Phase tiếp theo:

### Option A — `content-visibility`

```css
.collection-card {
  content-visibility: auto;
  contain-intrinsic-size: 400px;
}
```

### Option B — virtualization

Dùng virtualization nếu:

- initial render vẫn nặng;
- scrolling jank;
- DOM nodes quá nhiều.

Không cần đưa virtualization vào P0 nếu memo + content visibility đã đủ.

---

# 47. Task 7 — Regression / Performance Tests

## Functional Tests

Sau mỗi task chạy:

```bash
npx tsc --noEmit
npm test
```

Không chấp nhận optimization làm thay đổi:

- card selection probabilities;
- Standard stars;
- Position stars;
- Clothing Journey;
- rewards;
- wardrobe state;
- catalog migration;
- session progression.

---

# 48. Performance Smoke Tests

Tạo checklist manual hoặc automated benchmark.

### Standard draw

- no Luxury selector call;
- no unnecessary PlayerOutfitStatus render.

### Timer

- only timer subtree updates.

### Position draw

- Position probability runs đúng lúc.

### Polling

- không request/update giữa game.

### Collection

- scroll không jank rõ rệt.

---

# 49. Optional Development Instrumentation

Trong development có thể thêm counters:

```ts
if (import.meta.env.DEV) {
  console.count('GameTable render');
}
```

hoặc custom hook:

```ts
useRenderCount('PlayerOutfitStatus');
```

Chỉ dùng DEV.

Không để logging production.

---

# 50. Task Order cuối cùng

## P0 — Baseline

1. Build production.
2. Profile Standard.
3. Profile timer.
4. Profile Position.
5. Profile collection.
6. Lưu baseline.

## P1 — Calculation

7. Audit reference stability.
8. Fix immutable Set/Map/array updates.
9. Memoize selection options.
10. Tạo `getJourneyDrawAnalysis`.
11. Tạo `getLuxuryDrawProbabilities`.
12. Gate Luxury calculation theo phase.

## P2 — Stable Props

13. Memoize `allCards`.
14. Memoize `availableCards`.
15. Audit inline object/array props.
16. Tạo session card snapshot.
17. Không set catalog state nếu revision không đổi.

## P3 — Render Boundaries

18. Tách `GameProgressHeader`.
19. Tách `PlayerPanel`.
20. Memo `PlayerOutfitStatus`.
21. Tách `CurrentCardStage`.
22. Move timer xuống `CardTimer`.
23. Tách RewardControls.
24. Tách PositionProgress.
25. Tách GameOverlays.
26. Chỉ dùng `useCallback` khi cần stable prop.

## P4 — Polling

27. Skip polling khi game.
28. Stable interval.
29. Avoid stale `refreshCatalog`.
30. Optional immediate refresh sau game.

## P5 — Animation

31. Remove animated box-shadow.
32. Remove animated background-position.
33. Responsive particle count.
34. Optimize bokeh.
35. Reduce backdrop blur.
36. Add reduced-motion.
37. Use `will-change` có chọn lọc.

## P6 — Collection

38. `React.memo(GameCard)`.
39. Stable handlers.
40. Test `content-visibility`.
41. Virtualization nếu cần.

## P7 — Final Regression

42. `npx tsc --noEmit`.
43. `npm test`.
44. Production build.
45. Re-profile same flows.
46. Compare before/after metrics.

---

# 51. Definition of Done

Performance optimization chỉ được coi là hoàn thành khi:

## Render

- `GameTable` không render lại toàn bộ subtree vì timer tick.
- `PlayerOutfitStatus` không render khi outfit/player data không đổi.
- static gameplay sections giữ nguyên khi unrelated state thay đổi.

## Calculation

- Luxury selection/probability không chạy ở Standard.
- Journey filter/candidate analysis không chạy duplicate trong cùng render path.
- memo dependencies stable.

## Catalog

- `allCards` stable khi catalog input không đổi.
- `availableCards` stable khi card pool/settings không đổi.
- polling không update gameplay session.
- same catalog revision không trigger state update.

## Animation

- không còn infinite animated box-shadow.
- không còn unnecessary background-position drift.
- particle count giảm theo device.
- mobile blur/backdrop cost thấp hơn.
- reduced-motion hoạt động.

## Collection

- `GameCard` memoized.
- collection scroll acceptable.
- virtualization chỉ thêm nếu cần.

## Functional correctness

- toàn bộ gameplay behavior không đổi.
- `npx tsc --noEmit` pass.
- `npm test` pass.
- production build pass.

---

# 52. Performance Targets

Không cần ép những con số phi thực tế.

Target nên là:

### Standard phase

```text
Luxury selector calls = 0
```

### Timer tick

```text
PlayerOutfitStatus render = 0
RewardControls render = 0
PositionProgress render = 0
```

### Catalog game session

```text
catalog polling request/update = 0 khi đang chơi
```

### Animation

```text
continuous box-shadow animation = 0
continuous background-position animation = 0
```

### Particle

```text
mobile <= 10
desktop <= 16
```

### Main thread

Mục tiêu:

```text
không tạo Long Task > 50ms trong thao tác draw/complete thông thường
```

trên thiết bị test mục tiêu.

---

# 53. Không được làm

Không:

- thêm `useMemo` khắp nơi mà không đo;
- thêm `useCallback` cho mọi function;
- mutate Set/Map để giữ reference;
- dùng `random: () => 0` chỉ để lấy probabilities;
- đưa toàn bộ state vào `useReducer` rồi coi là performance fix;
- thêm `will-change` cho mọi animation;
- refresh live catalog giữa session rồi làm đổi card pool đang chơi;
- thay đổi gameplay probability chỉ để code nhanh hơn;
- bỏ animation quan trọng mà không có visual replacement;
- optimize trước nhưng không benchmark lại.

---

# 54. Kết quả kiến trúc mong muốn

Sau optimization:

```text
App
│
├── Catalog state
├── Memoized allCards
├── Memoized availableCards
├── Session card snapshot
│
└── GameTable
    │
    ├── GameProgressHeader
    ├── PlayerPanel A
    ├── PlayerPanel B
    ├── CurrentCardStage
    │   └── CardTimer
    ├── GameActionBar
    ├── RewardControls
    ├── PositionProgress
    └── GameOverlays
```

Selection pipeline:

```text
Stable Input
    ↓
Journey Draw Analysis
    ↓
availableTypes + probabilities + eligible pool
```

Position:

```text
journeyPhase === position
    ↓
getLuxuryDrawProbabilities
    ↓
selectLuxuryPositionCard
```

Standard:

```text
journeyPhase === standard
    ↓
Luxury calculation skipped completely
```

---

# 55. Final Goal

Người chơi phải cảm nhận:

- mở card nhanh;
- animation mượt;
- timer không làm UI giật;
- outfit không flicker/re-render không cần thiết;
- chuyển lượt mượt;
- collection scroll tốt;
- gameplay không bị ảnh hưởng khi catalog sync;
- Standard và Position vẫn giữ đúng toàn bộ progression hiện tại.

Optimization phải làm app **nhẹ hơn mà gameplay không thay đổi**.
