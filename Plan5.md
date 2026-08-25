# IMPLEMENTATION PLAN  
## Position Star Catalog Migration ⭐6–⭐10

---

# 1. Mục tiêu

Chuẩn hóa toàn bộ hệ thống sao của game thành một thang duy nhất:

### Standard Deck

**⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5**

### Position Deck

**⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

Hiện Position Deck vẫn còn một số card legacy sử dụng metadata sao cũ **⭐1–⭐5**.

Mục tiêu của phase này là:

- audit toàn bộ Position catalog;
- xác định tất cả metadata legacy;
- migrate dữ liệu Position sang ⭐6–⭐10;
- không chỉ sửa UI;
- cập nhật selector;
- cập nhật catalog validation;
- cập nhật save migration;
- cập nhật tests;
- đảm bảo Luxury progression không bị thay đổi ngoài ý muốn;
- cuối cùng xóa compatibility logic legacy.

---

# 2. Nguyên tắc quan trọng

Không được chỉ hiển thị:

**legacy ⭐1 → UI ⭐6**

trong khi dữ liệu bên dưới vẫn là ⭐1.

Kết quả cuối cùng phải là:

> Position Card thực sự lưu intensity từ ⭐6–⭐10.

Standard và Position phải sử dụng chung một hệ sao liên tục:

**⭐1 → ⭐10**

---

# 3. Phân biệt Star và Progression

Trước khi migrate cần xác định rõ:

### Star

Biểu thị:

**độ nóng / intensity của card.**

### Intimacy

Progress của Standard:

**0–100%.**

### Luxury

Progress của Position:

**0–100%.**

Không được để việc đổi star từ ⭐1 thành ⭐6 vô tình làm Luxury Gain tăng theo.

Migration star không đồng nghĩa với migration Luxury progression.

---

# 4. Phase P0 — Audit Position Catalog

Đầu tiên phải thống kê toàn bộ Position Deck.

Với mỗi Position Card cần kiểm tra:

- card ID;
- title/name;
- current star;
- difficulty metadata;
- family;
- audience;
- target;
- Luxury gain;
- finale flag;
- enabled status;
- outfit requirement;
- legacy metadata khác nếu có.

---

# 5. Audit tất cả giá trị star hiện tại

Report cần cho biết:

- bao nhiêu Position Card đang ⭐1;
- bao nhiêu ⭐2;
- bao nhiêu ⭐3;
- bao nhiêu ⭐4;
- bao nhiêu ⭐5;
- bao nhiêu đã là ⭐6–⭐10;
- card nào không có star;
- card nào có star ngoài range hợp lệ.

Không bắt đầu migration trước khi có report này.

---

# 6. Audit tất cả field có ý nghĩa difficulty

Không chỉ tìm field tên `stars`.

Cần kiểm tra các field có thể đang biểu diễn cùng khái niệm:

- stars;
- star;
- difficulty;
- level;
- intensity;
- rank;
- tier;
- positionDifficulty;
- luxuryDifficulty.

Mục tiêu:

tránh trường hợp migrate một field nhưng selector vẫn đọc field legacy khác.

---

# 7. Xác định Source of Truth

Sau migration chỉ nên có **một field chính** biểu thị star/intensity.

Ví dụ về mặt thiết kế:

- Standard: 1–5;
- Position: 6–10.

Các field legacy khác nếu không còn cần:

- migrate;
- deprecate;
- sau đó xóa.

Không để hai field difficulty cùng tồn tại lâu dài và có thể mâu thuẫn.

---

# 8. Phase P1 — Xác định mapping legacy

Nếu legacy Position star thực sự là scale 5 mức tăng dần, dùng mapping:

| Legacy | New |
|---|---|
| ⭐1 | ⭐6 |
| ⭐2 | ⭐7 |
| ⭐3 | ⭐8 |
| ⭐4 | ⭐9 |
| ⭐5 | ⭐10 |

Đây là mapping mặc định đề xuất.

---

# 9. Không cộng +5 một cách mù quáng

Trước khi áp dụng mapping toàn catalog cần audit nội dung.

Ví dụ:

Nếu một card legacy ⭐5 thực chất chỉ ở mức medium do dữ liệu cũ không nhất quán, không nên tự động biến nó thành ⭐10.

Cần kiểm tra:

- family;
- description;
- Luxury stage;
- finale status;
- intensity thực tế.

Nếu catalog cũ có dữ liệu không nhất quán, cần lập danh sách exception.

---

# 10. Migration Classification

Sau audit, chia Position Cards thành:

### Group A — Safe automatic migration

Card legacy có scale đúng.

Có thể chuyển trực tiếp:

⭐1→⭐6  
⭐2→⭐7  
⭐3→⭐8  
⭐4→⭐9  
⭐5→⭐10

### Group B — Needs manual review

Metadata và nội dung không khớp.

### Group C — Already migrated

Đã sử dụng ⭐6–⭐10.

Không thay đổi.

### Group D — Invalid data

Thiếu star hoặc star ngoài range.

Phải sửa trước khi catalog được coi là valid.

---

# 11. Phase P2 — Compatibility Layer tạm thời

Trong thời gian migration, nếu code cần đọc cả dữ liệu mới và cũ, tạo compatibility logic tạm thời.

Compatibility layer phải hiểu:

- Position legacy 1–5;
- Position new 6–10.

Nhưng đầu ra nội bộ phải normalize về:

**6–10.**

---

# 12. Compatibility Layer chỉ là tạm thời

Không để architecture cuối cùng tồn tại kiểu:

> nếu Position star <=5 thì +5.

Đó chỉ là giải pháp migration.

Sau khi catalog hoàn toàn chuyển sang ⭐6–⭐10:

**xóa compatibility layer.**

---

# 13. Phase P3 — Migrate Position Catalog

Cập nhật toàn bộ Position Card data.

Sau migration:

- tất cả Position Card stars phải từ 6 tới 10;
- không còn Position stars 1–5;
- card ID không đổi;
- family không đổi;
- audience không đổi;
- content không đổi nếu không cần;
- outfit requirements không đổi;
- Luxury behavior không đổi ngoài những thay đổi đã chủ động thiết kế.

---

# 14. Không đổi ID trong migration

Position Card ID phải được giữ nguyên.

Lý do:

- favorite cards;
- history;
- analytics;
- save game;
- test fixtures;
- references;
- migration.

Không tạo card mới chỉ để đổi star.

---

# 15. Không thay đổi Position Family ngoài ý muốn

Migration star không phải migration family.

Ví dụ:

- Connection vẫn Connection;
- Sensual vẫn Sensual;
- các family hiện tại vẫn giữ nguyên.

Chỉ thay metadata intensity nếu không có lý do khác.

---

# 16. Phase P4 — Luxury Gain Audit

Sau migration star phải kiểm tra Luxury gain riêng.

Không dùng logic đơn giản:

> card ⭐10 phải cộng Luxury nhiều hơn card ⭐5 legacy chỉ vì số sao mới lớn hơn.

Luxury Gain phải dựa trên rule Position hiện tại hoặc rule mới được định nghĩa riêng.

---

# 17. Luxury Gain phải độc lập với display star nếu cần

Nếu hiện hệ thống dùng star trực tiếp để tính Luxury:

phải audit.

Có thể giữ một bảng riêng:

- ⭐6 → Luxury Gain mức entry;
- ⭐7 → cao hơn;
- ⭐8;
- ⭐9;
- ⭐10.

Nhưng không được vô tình dùng raw value 6–10 như số % tăng.

---

# 18. Finale ⭐10

Đặc biệt kiểm tra ⭐10.

Không phải mọi card được migrate từ legacy ⭐5 đều nhất thiết phải là finale.

Cần phân biệt:

### ⭐10 intensity

và

### Finale / Mythic Card

Nếu game có card finale riêng, finale phải tiếp tục phụ thuộc:

- Luxury;
- minimum Position cards;
- finale gate;
- probability;
- consent/settings.

Không được hiểu:

> mọi ⭐10 = finale.

---

# 19. Phase P5 — Position Selector Migration

Sau catalog migration, selector Position phải hoạt động trực tiếp với ⭐6–⭐10.

Không còn logic nội bộ dùng 1–5 cho Position.

Selector cần phân phối như continuum mới.

---

# 20. Position Star Progression đề xuất

Có thể dùng logic:

### Luxury thấp

Ưu tiên:

**⭐6–⭐7**

### Luxury trung bình

Ưu tiên:

**⭐7–⭐8**

### Luxury cao

Ưu tiên:

**⭐8–⭐9**

### Luxury rất cao

Ưu tiên:

**⭐9–⭐10**

⭐10 finale vẫn phải tuân thủ finale gate.

---

# 21. Không reset progression

Khi chuyển:

**Standard ⭐5**

↓

**Position ⭐6**

Người chơi phải cảm nhận đây là continuation.

Không được Position bắt đầu lại ở ⭐1.

---

# 22. Phase P6 — UI Migration

Audit toàn bộ UI liên quan Position.

Các màn cần kiểm tra:

- Position Card;
- card reveal;
- card details;
- deck preview;
- rules;
- gameplay table;
- summary;
- history;
- favorite cards;
- stats;
- debug UI;
- Position unlock screen.

---

# 23. Standard UI

Standard chỉ hiển thị:

**⭐1–⭐5**

Không được vô tình hiển thị 6–10.

---

# 24. Position UI

Position chỉ hiển thị:

**⭐6–⭐10**

Không dùng:

- legacy 1–5;
- internal level;
- star +5 chỉ trên render.

UI phải lấy trực tiếp giá trị normalized.

---

# 25. Rules UI

Trong phần luật cần hiển thị cực đơn giản:

### 💗 Standard

**⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5**

### 💎 Position

**⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

Để người chơi hiểu đây là một thang liên tục.

---

# 26. Summary UI

Nếu Summary hiển thị:

- highest card;
- highest difficulty;
- average stars;
- Position cards;

cần update để hiểu range 6–10.

Không để Summary gọi Position ⭐8 là invalid hoặc clamp xuống ⭐5.

---

# 27. History / Favorite Migration

Nếu game lưu card object trực tiếp vào history:

cần xác định save cũ có stars 1–5 hay không.

Nếu history chỉ lưu card ID:

sẽ đơn giản hơn vì catalog mới tự resolve star mới.

Nếu lưu snapshot:

cần normalize khi load.

---

# 28. Phase P7 — Save Migration

Nếu app có persisted session/save:

cần support legacy saves.

Các dữ liệu cần kiểm tra:

- active Position card;
- card history;
- favorites;
- current Position deck;
- selected card;
- stats;
- analytics state.

---

# 29. Save migration rule

Legacy Position star:

⭐1→⭐6  
⭐2→⭐7  
⭐3→⭐8  
⭐4→⭐9  
⭐5→⭐10

Chỉ áp dụng nếu object được xác định rõ là Position Card.

Không được áp dụng lên Standard Card.

---

# 30. Migration phải idempotent

Nếu save đã migrate rồi:

không được:

⭐6 → ⭐11.

Migration phải biết dữ liệu đang ở version nào.

---

# 31. Data Version

Nếu app đang có schema version:

tăng version cho migration này.

Ví dụ về mặt thiết kế:

**Position Star Scale v2**

Không cần expose version này ra UI.

---

# 32. Phase P8 — Catalog Validator

Bổ sung validation bắt buộc.

### Standard

Star hợp lệ:

**1–5**

### Position

Star hợp lệ:

**6–10**

---

# 33. Invalid catalog cases

Validator phải fail hoặc warning nghiêm trọng nếu:

- Standard ⭐0;
- Standard ⭐6;
- Position ⭐3;
- Position ⭐11;
- Position thiếu star;
- unknown deck type.

---

# 34. Không auto-normalize trong validator

Validator dùng để phát hiện lỗi catalog.

Không nên âm thầm sửa:

> Position ⭐3 → ⭐8

sau khi migration hoàn tất.

Nếu legacy quay lại sau này:

test/build phải báo lỗi.

---

# 35. Phase P9 — Migration Tests

Test từng mapping:

- Position ⭐1 legacy → ⭐6
- ⭐2 → ⭐7
- ⭐3 → ⭐8
- ⭐4 → ⭐9
- ⭐5 → ⭐10

---

# 36. Test không migrate Standard

Standard:

⭐1 vẫn ⭐1  
⭐2 vẫn ⭐2  
...  
⭐5 vẫn ⭐5

Migration không được cộng 5 cho Standard.

---

# 37. Test already-migrated card

Position ⭐8:

sau migration vẫn:

**⭐8**

Không được thành ⭐13.

---

# 38. Test invalid Position card

Position có star ngoài cả legacy và new scale:

phải báo invalid.

Không silently normalize.

---

# 39. Catalog Count Test

Trước và sau migration:

- số Position cards không đổi;
- ID set không đổi;
- số family không đổi ngoài intentional change.

---

# 40. Metadata Preservation Test

Với mỗi Position card:

migration không được vô tình thay đổi:

- ID;
- audience;
- target;
- family;
- content;
- outfit requirement;
- enabled;
- finale flag.

---

# 41. Luxury Behavior Regression Test

Các Position Cards sau migration phải tạo Luxury progression tương đương logic mong muốn.

Nếu Luxury Gain được đổi theo star mới:

cần test riêng.

Không để raw star 6–10 làm Luxury tăng quá nhanh.

---

# 42. Position Selector Tests

Test tại nhiều Luxury band.

Ví dụ:

### Luxury thấp

⭐6–⭐7 phải phổ biến.

### Luxury trung bình

⭐7–⭐8 tăng.

### Luxury cao

⭐8–⭐9 tăng.

### Luxury cuối

⭐9–⭐10 tăng.

---

# 43. Finale Gate Test

Đảm bảo ⭐10 finale:

- không xuất hiện quá sớm;
- không bypass minimum cards;
- không bypass Luxury threshold;
- vẫn guarantee đúng tại finale condition nếu luật yêu cầu.

---

# 44. Statistical Position Simulation

Sau migration chạy nhiều draw.

Ví dụ:

- Luxury 10%;
- 30%;
- 50%;
- 70%;
- 90%.

Kiểm tra distribution ⭐6–⭐10.

---

# 45. Metric cần xem

Ở mỗi Luxury level:

- candidate count ⭐6;
- ⭐7;
- ⭐8;
- ⭐9;
- ⭐10;
- selected distribution;
- fallback count;
- finale frequency.

---

# 46. Phase P10 — Xóa Legacy Compatibility

Chỉ thực hiện sau khi:

- catalog đã migrate 100%;
- save migration hoạt động;
- tests pass;
- UI dùng 6–10;
- selector dùng 6–10.

Sau đó xóa:

- legacy Position 1–5 mapping trong normal runtime;
- fallback `+5`;
- legacy star render;
- legacy selector branch.

---

# 47. Không xóa save migration ngay

Compatibility cho **live catalog** có thể xóa.

Nhưng migration cho **old saved data** có thể cần giữ lâu hơn tùy architecture.

Phân biệt:

### Catalog compatibility

Có thể xóa sau migration.

### Persisted-save migration

Có thể vẫn cần giữ cho user update từ version cũ.

---

# 48. Thứ tự triển khai

## P0 — Audit

1. Audit Position catalog.
2. Audit tất cả difficulty fields.
3. Tạo report legacy/new.
4. Xác định Source of Truth.

---

## P1 — Mapping

5. Xác nhận legacy 1–5 mapping.
6. Review exceptions.
7. Phân card thành auto/manual/already migrated/invalid.

---

## P2 — Compatibility

8. Tạo compatibility layer tạm nếu cần.
9. Normalize Position runtime về 6–10.

---

## P3 — Catalog Migration

10. Migrate Position card data.
11. Giữ nguyên IDs.
12. Giữ family/audience/requirements.
13. Review ⭐10 cards.

---

## P4 — Progression

14. Audit Luxury Gain.
15. Tách star khỏi Luxury nếu cần.
16. Update Position selector sang 6–10.

---

## P5 — UI

17. Update Position card UI.
18. Update rules.
19. Update history.
20. Update summary.
21. Update stats/debug.

---

## P6 — Persistence

22. Add save migration.
23. Add schema/data version.
24. Test legacy saves.
25. Test migration idempotency.

---

## P7 — Validation

26. Standard validator 1–5.
27. Position validator 6–10.
28. Reject future legacy Position cards.

---

## P8 — Tests

29. Migration unit tests.
30. Catalog tests.
31. Selector tests.
32. Luxury regression tests.
33. Finale tests.
34. Position simulation.

---

## P9 — Cleanup

35. Confirm 100% Position catalog 6–10.
36. Remove live legacy compatibility.
37. Keep old-save migration where necessary.
38. Final regression tests.

---

# 49. Definition of Done

Migration chỉ hoàn thành khi:

- 100% Standard Cards nằm trong ⭐1–⭐5;
- 100% Position Cards nằm trong ⭐6–⭐10;
- không còn Position catalog card ⭐1–⭐5;
- Position selector hoạt động trực tiếp với 6–10;
- UI không còn legacy Position stars;
- Rules hiển thị Standard 1–5 / Position 6–10;
- Luxury progression không bị phá;
- finale logic không bị phá;
- old saves được migrate an toàn;
- migration idempotent;
- catalog validator chặn Position star <6;
- migration tests pass;
- catalog tests pass;
- Position statistical tests pass;
- TypeScript không lỗi;
- toàn bộ regression tests cũ vẫn pass.

---

# 50. Acceptance Criteria UI

Người chơi chỉ cần nhìn thấy:

## 💗 Standard

**⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5**

↓

## 💎 Position

**⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

Không bao giờ thấy:

> Position ⭐1

sau khi migration hoàn tất.

---

# 51. Acceptance Criteria Data

Không chỉ UI.

Catalog thực tế phải là:

**Standard = 1–5**

**Position = 6–10**

Không còn logic:

> Position lưu 1–5 nhưng hiển thị +5.

---

# 52. Kết luận

Migration này phải được coi là một **data-model migration hoàn chỉnh**, không phải một thay đổi hiển thị.

Flow đúng là:

**Audit legacy data**

↓

**Xác định mapping**

↓

**Compatibility tạm thời**

↓

**Migrate catalog**

↓

**Migrate selector + Luxury logic**

↓

**Migrate UI**

↓

**Migrate saved data**

↓

**Catalog validation**

↓

**Tests + simulation**

↓

**Xóa compatibility legacy**

Kết quả cuối cùng phải là một hệ sao duy nhất và dễ hiểu:

> **Standard ⭐1–⭐5 → Position ⭐6–⭐10**