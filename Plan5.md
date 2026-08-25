# Plan: Nâng cấp Card Director Engine

> Mục tiêu: bỏ cơ chế "random đều trong danh sách hợp lệ", thay bằng một engine có "trí nhớ" và chủ đích đạo diễn nhịp chơi, nhưng vẫn giữ đủ ngẫu nhiên để mỗi ván khác nhau.

---

## 1. Vấn đề của mô hình hiện tại

- Band % (mục 7.1 trong manual) chỉ quyết định *tỉ lệ sao / truth-dare*, nhưng bên trong 1 band, việc chọn card cụ thể vẫn random đều → không có "trí nhớ" về những gì vừa xảy ra. Hệ quả: có thể ra 2 câu ⭐4 liên tiếp ngay đầu band 60–79%, hoặc một người cởi đồ dồn dập trong khi người kia còn nguyên.
- Card cởi đồ và card nội dung "nóng" hiện dùng chung một hệ số sao → không phân biệt được **độ nóng nội dung (heat)** với **độ khó/cam kết (star)**. Một câu Truth ⭐4 riêng tư khác hẳn một Dare ⭐4 cởi đồ.
- Chưa có cơ chế đảm bảo 2 người không lệch trạng thái trang phục quá xa.
- Chưa có giới hạn "không quá 2 card cùng loại liên tiếp" → nhịp game có thể giật cục.

---

## 2. Kiến trúc đề xuất: 3 lớp thay vì 1 lớp

```
State Layer  →  Weight Layer (Director)  →  Sampling Layer (Randomness)
```

### 2.1. State Layer — dữ liệu cần theo dõi thêm mỗi lượt

Ngoài `intimacy%`, `wardrobeState(P1/P2)` đã có, bổ sung:

| Trường | Ý nghĩa |
| :--- | :--- |
| `heatHistory` | Mảng heat-score của N card gần nhất, dùng để tính đà tăng nhiệt, tránh tăng vọt. |
| `typeHistory` | Loại của 3 card gần nhất (truth/dare, gentle/intimate/passionate) để áp luật chống lặp. |
| `wardrobeGapScore` | Chênh lệch số món đồ đã cởi giữa P1 và P2. |
| `cardsCompletedCount`, `starsSpentThisSession` | Ước lượng đang ở lượt thứ mấy trên tổng 20–24. |

### 2.2. Weight Layer — "bộ não đạo diễn"

Thay vì lọc cứng theo band rồi random đều, mỗi card ứng viên nhận một **điểm trọng số tổng hợp**:

```
weight(card) = baseBandWeight(card.star, currentIntimacy%)
             × wardrobeEligibility(card, P1, P2)      // 0 nếu không hợp lệ, ramp nếu vừa đủ điều kiện
             × pacingPenalty(card, typeHistory)         // giảm nếu vừa mới ra loại này
             × heatSmoothing(card.heat, heatHistory)    // chặn spike nhiệt sớm
             × wardrobeBalanceFactor(card, wardrobeGapScore)
             × noveltyBoost(card, seenCards)            // ưu tiên card chưa ra trong ván này
```

**a) `baseBandWeight`**
Giữ ý tưởng bảng % ở mục 7.1 manual, nhưng chuyển từ "tỉ lệ rời rạc theo band cứng" sang **hàm nội suy tuyến tính liên tục** theo intimacy% giữa các mốc đã có. Band cứng tạo bước nhảy đột ngột đúng lúc chuyển band (ví dụ 39%→40%, tỉ lệ ⭐3 nhảy từ 15%→30%). Nội suy giúp nhịp mượt hơn, đúng tinh thần "không nóng đột ngột".

**b) `wardrobeEligibility`** — điểm mới quan trọng nhất
Card không chỉ ON/OFF theo đủ điều kiện, mà có **vùng đệm ưu tiên**:
- Card yêu cầu wardrobe state X → weight = 0 nếu chưa đạt X (như hiện tại).
- Ngay khi vừa đạt X, card đó được **boost weight tạm thời** (×1.5 trong 2–3 lượt kế) để engine "tận dụng" trạng thái mới thay vì để nó rơi vào im lặng rồi mãi mới random trúng. Đây là cách tạo cảm giác game biết trang phục vừa thay đổi.

**c) `pacingPenalty`**
Nếu 2 card gần nhất đã là Dare, giảm nhẹ weight Dare cho lượt kế để tăng cơ hội Truth xen kẽ, và ngược lại. Tương tự với star: nếu vừa ra ⭐4, giảm weight ⭐4/⭐5 cho lượt kế → tránh 2 cú nóng liên tiếp sớm. Đây là cơ chế "mượt hoá" mà random đơn thuần không có.

**d) `heatSmoothing`**
`heat` là thuộc tính riêng của card (không trùng star), đo mức độ táo bạo nội dung, độc lập với việc nó khó hay dễ thực hiện. Giới hạn **heat được phép tăng tối đa mỗi lượt** (ví dụ +1 cấp heat/lượt, tính trung bình trượt trên 3 lượt gần nhất). Nếu random tự nhiên chọn trúng card có heat vượt giới hạn cho phép ở thời điểm đó → weight bị nén mạnh (không cấm tuyệt đối, chỉ giảm xác suất), để occasional spike vẫn có thể xảy ra (giữ tính ngẫu nhiên) nhưng hiếm.

**e) `wardrobeBalanceFactor`**
Nếu P1 đã cởi nhiều hơn P2 quá X món, tăng weight cho card nhắm vào P2 (`target: self` khi đến lượt P2, hoặc `target: opponent` nhắm P2 khi đến lượt P1) và giảm nhẹ weight card khiến P1 cởi thêm. Đảm bảo hai người không lệch trạng thái quá xa.

**f) `noveltyBoost`**
Tăng nhẹ weight cho card chưa từng xuất hiện trong ván, tránh cảm giác lặp lại trong một ván 20–24 câu.

### 2.3. Sampling Layer — vẫn có ngẫu nhiên thật

Sau khi có weight cuối cùng cho toàn bộ danh sách ứng viên hợp lệ (weight > 0), dùng **weighted random sampling** (roulette wheel / cumulative distribution), **không phải argmax**. Giữ được tính ngẫu nhiên mỗi ván khác nhau, nhưng xác suất đã được đạo diễn nắn theo đúng nhịp mong muốn — khác hẳn random đều.

---

## 3. Bổ sung dữ liệu cho từng card (schema mở rộng)

Mỗi card cần thêm 2 field mới, ngoài các field hiện có (`star`, `type`, `level`, `turnAudience`, `clothingEffect`):

| Field mới | Kiểu | Ý nghĩa |
| :--- | :--- | :--- |
| `heat` | number (1–10) | Độc lập với `star`. |
| `phaseTag` | `'gentle' \| 'intimate' \| 'passionate'` | Tách khỏi `level` — 1 card có thể "level Intimate nhưng heat thấp" hoặc ngược lại. |

Việc tách `heat` khỏi `phaseTag` giải quyết đúng yêu cầu: **mọi mốc đều có tỉ lệ xuất hiện cả 3 loại thẻ (nhẹ nhàng / thân mật / cởi đồ)** — vì ta có thể luôn giữ một tỉ lệ nhỏ card gentle xen giữa các card nóng, và ngược lại vẫn có card cởi đồ nhẹ (heat thấp) xuất hiện sớm.

---

## 4. Ràng buộc để đạt mục tiêu Standard Journey (20–24 card, 10–12 lượt/người)

- Đặt `targetSessionLength ≈ 22` card làm tham số điều chỉnh **tốc độ tăng intimacy%/lượt**, thay vì mức gain cố định (+4% đến +12%) như hiện tại:
  ```
  intimacyGain = baseGainByStar × sessionLengthAdjustFactor
  ```
  Dù người chơi rơi vào nhánh nhiều Truth (gain thấp) hay nhiều Dare (gain cao), tổng số lượt vẫn hội tụ quanh 20–24.
- Thêm **"pity timer" nhẹ**: nếu đã hơn N lượt (ví dụ 6) mà intimacy% chưa nhích đủ do toàn bốc Truth ⭐1, tăng nhẹ `baseBandWeight` cho star cao hơn — tránh ván chơi bị "mắc kẹt" ở đầu quá lâu. Đối xứng với cơ chế "mythic 5%" đã có ở cuối cho Have Sex.

---

## 5. Mô phỏng & kiểm thử (bắt buộc trước khi đổi engine thật)

Trước khi đụng vào engine chính, viết một script simulator (Node/Python) chạy N = 1000 ván ảo với model trên, xuất ra:

- Phân phối số card/ván (kỳ vọng tập trung 20–24).
- Đường cong heat theo thời gian (phải mượt, không có bậc thang).
- % ván có 2 card ⭐4–⭐5 liên tiếp trước lượt thứ 8 (mục tiêu: gần 0%).
- Max wardrobe gap giữa 2 người trong suốt ván (mục tiêu: hiếm khi > 2 món).

Đây là bước quan trọng để tinh chỉnh các hệ số (pacing penalty %, boost %, decay rate) bằng số liệu thay vì đoán mò.

---

## 6. Lộ trình triển khai đề xuất

1. **Data**: thêm field `heat`, tách `phaseTag` khỏi `level` cho toàn bộ 108 card.
2. **Core**: viết module `weightEngine` thuần hàm (input: state + card list → output: weight map), test độc lập không đụng UI.
3. **Sampling**: thay lời gọi `pickRandomFromValidList()` hiện tại bằng `weightedSample(weightMap)`.
4. **State tracking**: thêm `heatHistory`, `typeHistory`, `wardrobeGapScore` vào game state store.
5. **Simulator**: script offline chạy hàng loạt ván để tune số.
6. **Wardrobe balance & pity timer**: thêm sau khi 5 bước trên ổn định — đây là lớp tinh chỉnh, dễ gây rối nếu làm sớm.
7. **QA thủ công**: chơi thử 5–10 ván thật để cảm nhận nhịp trước khi release.

---

## 7. Bước tiếp theo

Hai hướng có thể triển khai chi tiết tiếp:
- Viết pseudocode/công thức cụ thể cho từng hàm trong `weightEngine`.
- Thiết kế lại bảng dữ liệu 108 card với field `heat` mới (đề xuất giá trị heat cho từng nhóm card hiện có).