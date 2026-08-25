# IMPLEMENTATION PLAN  
## Fix Position Star Migration & 10 Failing Tests

---

# 1. Mục tiêu

Sau migration hệ sao mới:

- **Standard Deck:** ⭐1–⭐5
- **Position Deck:** ⭐6–⭐10

runtime hiện đã bắt đầu sử dụng Position ⭐6–⭐10, nhưng một số phần của hệ thống vẫn còn giả định legacy ⭐1–⭐5 hoặc ⭐1–⭐10.

Kết quả hiện tại:

- 84 tests tổng cộng
- 74 pass
- 10 fail

Mục tiêu của phase này:

1. Không rollback migration ⭐6–⭐10.
2. Chuẩn hóa catalog, schema, selector, Luxury config và tests về cùng một star model.
3. Không phá Standard Deck.
4. Không phá Clothing Journey.
5. Không phá Luxury progression.
6. Không phá finale logic.
7. Không làm thay đổi canonical card order chỉ vì đổi metadata.
8. Đưa toàn bộ test suite trở lại trạng thái pass.

---

# 2. Kết luận kỹ thuật hiện tại

Migration utility cơ bản đang hoạt động đúng.

Các test sau đã pass:

- Position legacy stars map sang 6–10;
- migration idempotent;
- Standard cards không bị thay đổi;
- invalid Position stars bị reject.

Vì vậy:

> **Không sửa hoặc rollback migration utility trước.**

Phần cần sửa nằm chủ yếu ở:

- catalog migration;
- canonical ordering;
- schema;
- Luxury probability/config;
- Position selector;
- fixtures;
- test expectations.

---

# 3. Quyết định kiến trúc cần chốt trước

Trước khi sửa test, phải chốt ý nghĩa của ⭐10.

## Đề xuất

Sử dụng:

### Standard

⭐1–⭐5

### Normal Position Cards

⭐6–⭐9

### Finale / Mythic

👑 ⭐10

Đây là phương án khuyên dùng.

Lý do:

- progression dễ hiểu;
- ⭐10 trở thành mức cao nhất thật sự;
- không có card normal ⭐10 cạnh card finale ⭐10;
- finale rõ ràng hơn về UX;
- dễ kiểm soát probability.

---

# 4. Rule cuối cùng về star range

Sau migration hoàn tất:

| Deck | Star hợp lệ |
|---|---|
| Standard | ⭐1–⭐5 |
| Position Normal | ⭐6–⭐9 |
| Position Finale | ⭐10 |

Nếu game quyết định cho phép normal Position ⭐10 thì phải sửa lại plan này, nhưng không nên để trạng thái hiện tại mơ hồ.

---

# 5. P0 — Fix Canonical Catalog Order

Một test hiện fail vì migration metadata làm thay đổi thứ tự canonical của card.

Đây là lỗi code thật, không chỉ là test outdated.

## Yêu cầu

Migration phải:

- giữ nguyên card ID;
- giữ nguyên array order;
- chỉ thay metadata cần migrate;
- không sort lại catalog sau migration.

Không sort theo:

- stars;
- Position family;
- audience;
- difficulty.

Nếu UI cần sort:

> sort ở presentation layer bằng một copy mới.

Không mutate canonical catalog.

---

# 6. Acceptance Criteria cho canonical order

Trước migration:

`cardIdsBefore`

Sau migration:

`cardIdsAfter`

Phải:

> giống nhau hoàn toàn theo đúng thứ tự.

Không chỉ giống set ID.

---

# 7. P1 — Audit Position Catalog

Tạo report cho toàn bộ Position Cards.

Với mỗi card ghi:

- ID;
- old star;
- migrated star;
- finale hay non-final;
- family;
- audience;
- target;
- Luxury gain;
- enabled;
- outfit requirement.

---

# 8. Phân nhóm Position Cards

Chia thành:

### Group A — Legacy normal

⭐1–⭐4

Map:

- 1 → 6
- 2 → 7
- 3 → 8
- 4 → 9

### Group B — Legacy ⭐5 nhưng non-final

Không tự động mặc định coi là ⭐10.

Phải review.

Nếu ⭐10 dành riêng cho finale:

legacy ⭐5 normal cần được phân loại lại hợp lý, thường thành ⭐9 hoặc theo intensity thực tế.

### Group C — Finale

Map thành:

👑 ⭐10

### Group D — Already migrated

Giữ nguyên.

### Group E — Invalid

Fix thủ công.

---

# 9. Không dùng blind `+5`

Không dùng rule:

> mọi Position star cũ +5.

Nếu ⭐10 là finale-only thì cách đó sẽ khiến toàn bộ legacy ⭐5 normal trở thành ⭐10.

Đây có thể chính là lý do non-final pool hiện đang chứa ⭐10. Test hiện cho thấy actual non-final range đang là `[6,7,8,9,10]`.

---

# 10. P2 — Fix `cardSchema`

Một test schema hiện mong giá trị Position star mới nhưng nhận `undefined`.

Điều này cho thấy schema/normalizer chưa thống nhất với model mới.

## Rule schema cuối

### Standard

Chỉ accept:

1–5.

### Position Normal

Chỉ accept:

6–9.

### Position Finale

Accept:

10.

---

# 11. Audit toàn bộ schema path

Kiểm tra:

- card validator;
- catalog validator;
- cloud payload validator;
- recovery bundle validator;
- local catalog parser;
- migration parser;
- runtime hydration.

Tìm mọi chỗ đang:

- clamp `stars` về 1–5;
- strip stars >5;
- normalize Position về legacy range;
- dùng type chung cho Standard và Position mà không phân deck.

---

# 12. Không dùng một validator giống nhau cho Standard và Position

Validation phải biết:

> card thuộc deck nào.

Không dùng đơn giản:

> stars must be between 1 and 5

cho mọi card.

---

# 13. P3 — Fix Position Catalog Fixtures

Một số fixtures vẫn mong legacy stars.

Ví dụ `pos-handjob-female` hiện actual là star 6 nhưng test vẫn mong star 1.

## Cần update

Tất cả approved metadata fixtures của Position:

- star;
- expected distribution;
- expected ranges.

Nhưng:

> chỉ update fixture sau khi star mapping cuối đã được chốt.

Không sửa test trước để “ép pass” khi model còn chưa ổn định.

---

# 14. P4 — Fix Position Catalog Coverage Tests

Test hiện đang kỳ vọng non-final Position pool cover ⭐1–⭐9.

Đây là expectation legacy.

## Nếu dùng model khuyên dùng

Expectation mới:

### Non-final Position

⭐6, ⭐7, ⭐8, ⭐9

### Finale

⭐10

Không còn test:

> Position covers 1–9.

---

# 15. P5 — Fix `progression.test.ts` assumptions

Có nhiều test progression vẫn dựa trên hệ cũ.

Ví dụ test deck coverage hiện vẫn mong Position có các card star 3 thay vì star 8.

Các test này cần migrate sang absolute Position stars.

---

# 16. Audit toàn bộ Position star constants

Tìm mọi config dạng:

- 1;
- 2;
- 3;
- 4;
- 5;

trong Position progression.

Xác định chúng là:

- relative difficulty legacy;
- absolute star;
- Luxury band;
- UI level.

Không thay tất cả một cách máy móc.

---

# 17. P6 — Chuẩn hóa Luxury probability table

Luxury probability tests đang fail vì runtime và expectation không còn cùng star keys.

## Position probability config mới

Chỉ dùng absolute keys:

- 6
- 7
- 8
- 9
- 10

Nếu ⭐10 là finale-only:

normal weighted Position draw dùng chủ yếu:

- 6
- 7
- 8
- 9

⭐10 được xử lý bằng finale logic riêng.

---

# 18. Đề xuất Luxury bands

Ví dụ:

### Luxury 0–19%

Ưu tiên:

⭐6

sau đó ⭐7.

### Luxury 20–39%

⭐6–⭐7 chủ đạo.

Bắt đầu ⭐8.

### Luxury 40–59%

⭐7–⭐8 chủ đạo.

Có ⭐9 thấp.

### Luxury 60–79%

⭐8–⭐9 chủ đạo.

### Luxury 80–99%

⭐9 chủ đạo.

⭐10 chỉ thông qua finale gate.

### Luxury 100%

Finale ⭐10 guaranteed nếu các điều kiện khác đã đủ.

---

# 19. Không trộn Finale probability vào normal star weight

Hiện luật có Have Sex/finale độc lập.

Giữ nguyên nguyên tắc:

> finale chance là một roll riêng.

Không biến ⭐10 thành normal weighted card chỉ vì star table có key 10.

---

# 20. P7 — Fix Luxury Selection

Test selection đang lấy star legacy và nhận `undefined`.

## Selector mới phải

- dùng Position stars 6–9 cho normal cards;
- dùng finale logic riêng cho ⭐10;
- tránh repeat;
- nearest-star fallback vẫn hoạt động;
- không fallback sang legacy star 1–5.

---

# 21. Nearest-star fallback mới

Ví dụ selector muốn ⭐8 nhưng không có:

ưu tiên:

⭐7 hoặc ⭐9.

Không fallback:

⭐3

chỉ vì đó từng là relative level cũ.

---

# 22. P8 — Fix Luxury Config Hydration

Hydration test hiện vẫn mong zero-row có keys 1–10, trong khi runtime chỉ còn 6–10.

## Model mới

Luxury star weight config chỉ cần:

- 6;
- 7;
- 8;
- 9;
- nếu cần 10.

Không còn 1–5.

---

# 23. Preserve absolute zero rows

Nếu user/config đặt toàn bộ Position weights bằng 0:

hydration phải giữ:

- 6 = 0
- 7 = 0
- 8 = 0
- 9 = 0
- 10 = 0 nếu config có finale key.

Không tự thêm legacy keys.

---

# 24. Oversized Weight Clamp

Một test khác đang đọc legacy key nên nhận `undefined` thay vì `100`.

Update test và implementation để clamp đúng trên key mới:

- 6–10.

---

# 25. P9 — Fix Recovery Bundle

Recovery bundle đang trả `null`.

Không sửa recovery layer đầu tiên.

Khả năng cao nguyên nhân là catalog validation fail sau migration.

## Thứ tự

1. Fix schema.
2. Fix catalog validation.
3. Fix Position data.
4. Chạy recovery test lại.

Chỉ sửa recovery code nếu vẫn fail sau đó.

---

# 26. P10 — Fix Catalog Payload Validation

Test payload cũng đang fail cùng khu vực schema/catalog.

Sau khi schema hiểu 6–10:

- declared counts phải khớp;
- Position star metadata phải được preserve;
- recovery bundle phải validate trở lại.

---

# 27. P11 — Update Migration Tests

Giữ các test migration hiện đã pass.

Không xóa:

- legacy → new;
- idempotency;
- Standard unchanged;
- invalid Position rejection.

Bổ sung test:

### Legacy normal

1 → 6  
2 → 7  
3 → 8  
4 → 9

### Legacy finale

5 → 10 nếu finale.

### Legacy non-final 5

Phải theo mapping đã chốt riêng.

---

# 28. Test idempotency

Migration chạy lần 2:

- ⭐6 vẫn ⭐6;
- ⭐7 vẫn ⭐7;
- ⭐8 vẫn ⭐8;
- ⭐9 vẫn ⭐9;
- ⭐10 vẫn ⭐10.

Không được:

⭐6 → ⭐11.

---

# 29. P12 — Catalog Validation mới

Thêm invariant test:

### Standard

100% cards:

⭐1–⭐5.

### Position non-final

100%:

⭐6–⭐9.

### Position final

100%:

⭐10.

---

# 30. Không cho legacy data quay lại

Sau migration:

Position star:

1–5

phải fail catalog validation.

Ngoại lệ duy nhất:

legacy save migration input.

Không cho live catalog chứa legacy star.

---

# 31. P13 — Save/Persisted Data Compatibility

Nếu game lưu card snapshot trong:

- localStorage;
- IndexedDB;
- saved sessions;
- history;
- favorite cards;

cần migrate legacy Position star khi load.

---

# 32. Chỉ migrate object được xác định là Position

Không làm:

> mọi card star 3 → 8.

Chỉ migrate khi:

`deck = position`

hoặc có identifier tương đương chắc chắn.

Standard ⭐3 phải giữ ⭐3.

---

# 33. Save migration không được reorder history

Tương tự catalog:

migration chỉ thay metadata.

Không đổi thứ tự:

- history;
- favorites;
- session card history.

---

# 34. P14 — UI Audit

Sau data/runtime ổn mới kiểm tra UI.

Tất cả Position UI phải hiển thị trực tiếp:

⭐6–⭐10.

Không dùng render hack:

> star + 5.

---

# 35. Các màn cần audit

- Position Card;
- reveal modal;
- Position Deck;
- rules;
- card collection;
- history;
- favorites;
- summary;
- stats;
- debug;
- result modal.

---

# 36. P15 — Statistical Tests

Sau khi selector ổn:

chạy nhiều Position draws tại:

- 10% Luxury;
- 30%;
- 50%;
- 70%;
- 90%.

---

# 37. Expected distribution

### Low Luxury

⭐6–⭐7 chiếm ưu thế.

### Mid Luxury

⭐7–⭐8.

### High Luxury

⭐8–⭐9.

### Very High

⭐9 nhiều.

⭐10 chỉ theo finale chance.

---

# 38. Finale tests

Giữ hoặc bổ sung:

- <80% → finale 0%;
- 80–99% → theo configured chance;
- 100% → guaranteed;
- minimum Position card requirement nếu đang có;
- finale độc lập với normal pool exhaustion.

---

# 39. Không sửa các subsystem đang pass

Các phần sau đang pass và không nên refactor trong fix này nếu không cần:

- Clothing Journey;
- wardrobe;
- dual removal;
- player hydration;
- rewards;
- card timer;
- resolution;
- Standard star migration.

Scope fix phải tập trung vào Position migration.

---

# 40. Thứ tự fix cụ thể

## Step 1

Chốt:

**Position normal ⭐6–⭐9, finale ⭐10.**

---

## Step 2

Fix catalog migration:

- preserve order;
- không blind +5 cho legacy ⭐5 normal.

---

## Step 3

Fix `cardSchema`.

---

## Step 4

Fix Position catalog data.

---

## Step 5

Fix Luxury weight/config model thành absolute ⭐6–⭐10.

---

## Step 6

Fix Position selector.

---

## Step 7

Fix hydration.

---

## Step 8

Update `localCatalog.test.ts`.

---

## Step 9

Update `progression.test.ts`.

---

## Step 10

Update `cardSchema.test.ts`.

---

## Step 11

Run:

`npx tsc --noEmit`

---

## Step 12

Run:

`npm test`

---

## Step 13

Nếu recovery bundle vẫn fail:

debug riêng recovery.

Không làm trước.

---

# 41. Expected fail resolution

Sau các bước trên, các fail hiện tại nên được xử lý như sau:

| Fail hiện tại | Hướng xử lý |
|---|---|
| Recovery bundle null | Có khả năng tự hết sau schema/catalog fix |
| Canonical order changed | Fix migration code |
| Non-final pool expects 1–9 | Update star model/test |
| Approved Position stars mismatch | Update fixtures |
| Catalog payload star undefined | Fix schema |
| Position coverage test legacy | Update progression tests |
| Luxury probabilities | Migrate config |
| Luxury selection undefined | Migrate selector |
| Zero-row hydration mismatch | Update hydration/config |
| Oversized weight undefined | Update new star keys |

---

# 42. Definition of Done

Phase fix chỉ hoàn thành khi:

- canonical card order không đổi;
- Position catalog không còn legacy ⭐1–⭐5;
- Standard vẫn chỉ ⭐1–⭐5;
- Position normal dùng ⭐6–⭐9;
- finale dùng ⭐10;
- schema hiểu đúng star range;
- Luxury config dùng absolute Position stars;
- selector không dùng legacy stars;
- hydration không tạo keys 1–5 cho Position;
- recovery bundle valid;
- old migration tests vẫn pass;
- catalog fixtures mới pass;
- statistical Position tests pass;
- `npx tsc --noEmit` pass;
- `npm test` pass 100%.

---

# 43. Không được làm để “chữa cháy”

Không:

- rollback Position về ⭐1–⭐5;
- sửa mỗi expected value để test xanh mà không fix model;
- cộng +5 lúc render UI;
- giữ live catalog 1–5 rồi normalize khắp nơi;
- sort lại catalog chỉ để test mới pass;
- biến mọi legacy ⭐5 thành finale;
- thay đổi Standard cards;
- sửa Clothing Journey không liên quan.

---

# 44. Kết quả cuối cùng

Data model phải trở thành:

## 💗 Standard

⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5

## 💎 Position

⭐6 → ⭐7 → ⭐8 → ⭐9

## 👑 Finale

⭐10

Và toàn bộ:

**catalog → schema → migration → selector → Luxury config → hydration → tests → UI**

phải sử dụng cùng một star model duy nhất.

Không còn trạng thái:

> data dùng 6–10 nhưng tests/config vẫn dùng 1–5.

Đây là mục tiêu chính của lần sửa lỗi này.