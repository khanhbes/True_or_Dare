# IMPLEMENTATION PLAN — RULES UI, STANDARD HEART & STAR SYSTEM

## 1. Mục tiêu

Phiên bản tiếp theo cần làm cho người chơi vừa mở game là hiểu ngay:

**🎴 Rút thẻ → ❤️ tăng thân mật → 👕 cởi đồ dần → 🔥 thẻ nóng dần → 💗 hoàn thành Standard → 💎 Position Deck ⭐6–⭐10**

Ba việc chính:

- 📖 Viết lại phần **Luật chơi** thật ngắn, dễ nhìn, nhiều icon.
- 💗 Standard Intimacy Heart chỉ dùng **một màu hồng duy nhất**.
- ⭐ Sửa hệ thống sao:
  - Standard Deck = **⭐1–⭐5**
  - Position Deck = **⭐6–⭐10**
  - điều tra và sửa lỗi khiến ⭐4–⭐5 không xuất hiện.

---

# 2. Viết lại phần “Cách chơi”

Không nên cho người chơi đọc một trang luật quá dài.

Phần giới thiệu trong app chỉ cần khoảng **6–8 bước**.

## Nội dung đề xuất

### 🎮 CÁCH CHƠI

### 👫 1. Hai người thay phiên nhau

Mỗi lượt một người rút thẻ.

---

### 🎴 2. Rút Truth hoặc Dare

💬 **Truth** — trả lời câu hỏi.

🔥 **Dare** — thực hiện thử thách.

---

### ❤️ 3. Hoàn thành để tăng Thân mật

Càng hoàn thành nhiều thẻ:

**❤️ → 💕 → 💗 → 🔥**

Mức độ thử thách sẽ tăng dần.

---

### ⭐ 4. Standard Deck có 5 mức

⭐ Nhẹ

⭐⭐ Dễ

⭐⭐⭐ Thân mật

⭐⭐⭐⭐ Nóng

⭐⭐⭐⭐⭐ Rất nóng

Càng gần cuối Standard Journey:

- ⭐4 xuất hiện nhiều hơn;
- ⭐5 xuất hiện nhiều hơn;
- Dare xuất hiện nhiều hơn.

---

### 👕 5. Trang phục được cởi dần

Một số thử thách có thể liên quan tới:

🙋 **Bạn**

💑 **Đối phương**

👫 **Cả hai**

🎲 **Lựa chọn / thử thách đặc biệt**

Game tự theo dõi quần áo của cả hai và chỉ đưa ra thẻ phù hợp.

---

### 💗 6. Đạt 100% Thân mật

Khi Standard Journey hoàn thành:

- nếu cả hai đã đủ điều kiện trang phục → chuẩn bị sang Position;
- nếu chưa → tiếp tục một số thẻ Standard nóng phù hợp.

Không bắt người chơi vào màn hình chọn đồ để cởi thủ công.

---

### 💎 7. Position Deck

Sau khi cả hai đồng ý:

**⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

Position Deck bắt đầu.

---

### 🛑 8. Luôn có thể bỏ qua

Không muốn thực hiện thẻ?

➡️ Bấm **Skip**.

Không cần giải thích.

Không bị ép thực hiện.

---

# 3. Thiết kế phần luật chơi

UI không nên hiển thị một đoạn văn dài.

Nên dùng card/icon.

| Icon | Nội dung |
|---|---|
| 🎴 | Rút thẻ |
| 💬 | Truth |
| 🔥 | Dare |
| ❤️ | Tăng thân mật |
| ⭐ | Độ nóng |
| 👕 | Clothing Journey |
| 💑 | Cả hai cùng chơi |
| 💎 | Position Deck |
| 🛑 | Skip bất cứ lúc nào |

Mỗi mục chỉ nên có:

**Icon lớn + tiêu đề + 1–2 câu.**

---

# 4. Chia màn luật thành 3 phần

## 🎮 Cách chơi

Chỉ giải thích:

**🎴 Rút → ✅ Hoàn thành → ❤️ Intimacy → 🔄 đổi lượt**

---

## 👕 Clothing Journey

Giải thích:

👕 Quần áo sẽ được thay đổi dần thông qua các thẻ trong game.

Game tự chọn thẻ phù hợp với trạng thái hiện tại của hai người.

---

## ⭐ Độ nóng

Hiển thị trực quan:

### Standard

**⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5**

### Position

**⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

Không reset sao khi chuyển sang Position.

---

# 5. Standard Heart chỉ dùng màu hồng đơn

Phần Standard Journey cần thống nhất nhận diện.

Màu chính:

**💗 Pink**

Không đổi màu tim theo level.

Không dùng:

**💗 → 🧡 → ❤️ → 💜**

Không dùng gradient nhiều màu cho Intimacy Heart.

Standard Journey chỉ có:

**một trái tim hồng.**

---

# 6. Progress của tim

Màu không đổi.

Chỉ thay đổi:

- mức fill;
- glow;
- animation;
- kích thước nhẹ;
- pulse.

Ví dụ:

### 0%

♡ Hồng nhạt / empty heart.

### 25%

💗 fill 25%.

### 50%

💗 fill 50%.

### 75%

💗 gần đầy + glow nhẹ.

### 100%

💗 đầy hoàn toàn + pulse/shine.

Nhưng vẫn là **cùng một màu hồng**.

---

# 7. Không dùng màu tim để biểu thị độ khó

Phân biệt rõ:

**💗 = Intimacy Progress**

**⭐ = Card Intensity**

Không nên để cả màu tim và màu card cùng biểu thị “độ nóng”.

---

# 8. Hệ thống sao Standard

Standard Deck phải sử dụng đầy đủ:

**⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5**

Không được để gameplay thực tế chỉ xuất hiện ⭐1–⭐3.

---

# 9. Hệ thống sao Position

Position Deck sử dụng:

**⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

Không reset star numbering.

Flow:

**Standard ⭐1–⭐5**

↓

**💗 Standard Complete**

↓

**💎 Position**

↓

**⭐6–⭐10**

---

# 10. Ý nghĩa sao đề xuất

## Standard

### ⭐1
🌸 Khởi động.

### ⭐2
💕 Flirt nhẹ.

### ⭐3
🔥 Thân mật.

### ⭐4
❤️‍🔥 Nóng.

### ⭐5
💋 Passionate / cuối Standard.

---

## Position

### ⭐6
💎 Position Entry.

### ⭐7
🔥 Position Medium.

### ⭐8
❤️‍🔥 Position Hot.

### ⭐9
💋 Position Very Hot.

### ⭐10
👑 Finale / mức cao nhất.

---

# 11. Ưu tiên sửa lỗi ⭐4–⭐5 không xuất hiện

Đây cần được coi là **bug P0**.

Vì Standard Deck được thiết kế ⭐1–⭐5 thì ⭐4 và ⭐5 phải thực sự có khả năng xuất hiện ở late game.

Cần audit toàn bộ draw pipeline.

---

# 12. Kiểm tra dữ liệu card ⭐4–⭐5

Kiểm tra:

- thực tế có bao nhiêu card ⭐4;
- thực tế có bao nhiêu card ⭐5;
- Truth/Dare của chúng;
- audience;
- level;
- outfit requirement;
- clothing requirement;
- enabled status.

Có khả năng card tồn tại nhưng đang bị filter.

---

# 13. Kiểm tra Star Weight

Expected:

| Intimacy | ⭐4 | ⭐5 |
|---|---:|---:|
| 0–19% | 0% | 0% |
| 20–39% | thấp | 0% |
| 40–59% | có | thấp |
| 60–79% | cao | có |
| 80–99% | rất cao | rất cao |

Đặc biệt từ:

**80%+**

⭐4 + ⭐5 phải là nhóm chính.

---

# 14. Kiểm tra Hard Filter

Tìm các rule có thể vô tình giới hạn sao:

- maxStars = 3;
- Standard max difficulty = 3;
- wardrobe dressed → maxStars 3;
- Gentle/Intimate filter loại Passionate;
- selectedDifficulty clamp;
- fallback chỉ lấy ⭐1–⭐3.

Nếu có thì sửa.

---

# 15. Kiểm tra Wardrobe Gate

Wardrobe có thể hạn chế một số card nóng.

Nhưng không được biến thành:

> còn dressed → tất cả ⭐4/⭐5 = 0.

Một số ⭐4/⭐5 không cần wardrobe đặc biệt vẫn phải xuất hiện được.

Chỉ card có requirement cụ thể mới bị filter.

---

# 16. Kiểm tra Clothing Journey có vô tình loại ⭐4–⭐5 không

Sau P0, selector có thêm:

- Clothing Opportunity;
- family;
- pity;
- catch-up;
- wardrobe.

Cần đảm bảo các modifier này chỉ:

**tăng/giảm weight**

chứ không vô tình khiến pool chỉ còn ⭐1–⭐3.

---

# 17. Kiểm tra fallback selector

Audit fallback.

Có thể main weighted selection tìm ⭐4/⭐5 đúng, nhưng fallback lại dùng:

> safe cards / low stars.

Nếu fallback quá thường xuyên thì người chơi gần như không thấy ⭐4/⭐5.

Cần log:

- candidate count;
- candidate stars;
- fallback triggered?;
- selected stars.

---

# 18. Debug Star Distribution

Trong development mode, log mỗi draw:

- Intimacy;
- current band;
- star weights;
- số candidate ⭐1;
- số candidate ⭐2;
- số candidate ⭐3;
- số candidate ⭐4;
- số candidate ⭐5;
- card bị filter vì lý do gì;
- star cuối cùng được chọn.

Ví dụ:

**Intimacy: 87%**

- ⭐1 candidates: 0
- ⭐2 candidates: 3
- ⭐3 candidates: 7
- ⭐4 candidates: 12
- ⭐5 candidates: 11

Selected:

**⭐5**

Nếu ⭐4 và ⭐5 candidates đều bằng 0 thì lỗi nằm ở data/filtering, không phải probability.

---

# 19. Test bắt buộc cho ⭐4–⭐5

## Test 40%

Có candidate ⭐4 hợp lệ.

Selector phải có thể chọn ⭐4.

---

## Test 60%

⭐4 phải có trọng số đáng kể.

⭐5 phải bắt đầu có cơ hội.

---

## Test 80%

⭐4 + ⭐5 phải chiếm phần lớn tổng star weight.

---

## Test 90%

Chạy nhiều draw.

Phải thấy ⭐4 và ⭐5 xuất hiện thường xuyên.

---

# 20. Statistical Test

Chạy nhiều draw ở từng mức:

- 10%;
- 30%;
- 50%;
- 70%;
- 90%.

Có thể dùng hàng nghìn đến 10.000 draw cho mỗi mốc.

Tại 90%, mong muốn:

- ⭐2 thấp;
- ⭐3 trung bình thấp;
- ⭐4 cao;
- ⭐5 cao nhất.

Nếu chạy 10.000 draw ở 90% mà ⭐5 gần 0% thì selector có bug.

---

# 21. Chuyển Position Stars sang ⭐6–⭐10

Position cần được chuẩn hóa:

| Position Star | Vai trò |
|---|---|
| ⭐6 | Entry |
| ⭐7 | Medium |
| ⭐8 | Hot |
| ⭐9 | Very Hot |
| ⭐10 | Finale |

---

# 22. Không trùng hệ Standard và Position

Không nên có:

**Standard ⭐3**

và

**Position ⭐3**

vì người chơi sẽ nghĩ chúng có cùng intensity.

Star system phải là một continuum:

**⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5 → ⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

---

# 23. UI Card phải hiển thị đúng sao

Standard Card:

**⭐⭐⭐⭐  
Standard • Passionate**

Position Card:

**⭐⭐⭐⭐⭐⭐⭐  
Position**

Không để Position dùng thang sao reset riêng trên UI.

---

# 24. Progression UI tổng thể

Có thể hiển thị:

### 💗 STANDARD

**⭐1 → ⭐2 → ⭐3 → ⭐4 → ⭐5**

↓

### 💎 POSITION

**⭐6 → ⭐7 → ⭐8 → ⭐9 → ⭐10**

Người chơi nhìn là hiểu toàn bộ progression.

---

# 25. Luxury Progress vẫn giữ riêng

Star và progress là hai khái niệm.

Standard:

**💗 Intimacy = 0–100%**

Position:

**💎 Luxury = 0–100%**

Stars chỉ mô tả intensity của card.

---

# 26. Không đổi màu Heart theo Star

Khi card ⭐5 xuất hiện:

trái tim Standard vẫn là:

**💗 màu hồng**

Không chuyển sang đỏ.

Card có thể dùng visual riêng để biểu thị intensity.

---

# 27. Icon hỗ trợ cho sao

Có thể dùng:

- ⭐1 🌸
- ⭐2 💕
- ⭐3 🔥
- ⭐4 ❤️‍🔥
- ⭐5 💋
- ⭐6 💎
- ⭐7 🔥💎
- ⭐8 ❤️‍🔥💎
- ⭐9 💋💎
- ⭐10 👑

Star vẫn là indicator chính.

---

# 28. Phần luật nên giải thích Star bằng hình

### 💗 STANDARD

🌸 ⭐  
💕 ⭐⭐  
🔥 ⭐⭐⭐  
❤️‍🔥 ⭐⭐⭐⭐  
💋 ⭐⭐⭐⭐⭐

### 💎 POSITION

**⭐6 → ⭐7 → ⭐8 → ⭐9 → 👑⭐10**

Người chơi nhìn là hiểu.

---

# 29. Thứ tự triển khai

## P0 — Star Bug

1. Audit card ⭐4.
2. Audit card ⭐5.
3. Audit filters.
4. Audit star weights.
5. Audit wardrobe restrictions.
6. Audit fallback.
7. Fix selector.
8. Add statistical tests.

Làm phần này trước.

---

## P1 — Star Model

9. Chuẩn hóa Standard ⭐1–⭐5.
10. Chuẩn hóa Position ⭐6–⭐10.
11. Update Position data.
12. Update Position selector.
13. Update UI star display.
14. Update summary/statistics nếu có.

---

## P2 — Standard Heart

15. Đổi Standard Heart thành hồng đơn.
16. Loại bỏ gradient/multi-color nếu có.
17. Progress thể hiện bằng fill/glow/pulse.
18. Kiểm tra light/dark mode.

---

## P3 — Rules UI

19. Rút ngắn luật.
20. Chia thành card/icon.
21. Thêm nhiều icon.
22. Tách Standard và Position.
23. Giải thích ⭐1–⭐10 trực quan.
24. Giải thích Clothing Journey.
25. Giải thích Skip.
26. Giữ consent rõ nhưng ngắn.

---

# 30. Acceptance Criteria

## Rules

- người mới có thể hiểu game trong khoảng 30 giây;
- không còn trang luật quá dài;
- sử dụng icon trực quan;
- Standard/Position được giải thích rõ.

## Standard Heart

- chỉ có một màu hồng;
- không đổi màu theo Intimacy;
- progress được thể hiện bằng fill/animation.

## Standard Stars

- Standard chỉ dùng ⭐1–⭐5;
- ⭐4 thực sự xuất hiện;
- ⭐5 thực sự xuất hiện;
- late game ⭐4–⭐5 xuất hiện thường xuyên.

## Position Stars

- Position chỉ dùng ⭐6–⭐10;
- không còn Position ⭐1–⭐5 trên UI;
- progression nhìn liên tục từ Standard sang Position.

## Tests

- toàn bộ test cũ vẫn pass;
- có test riêng ⭐4;
- có test riêng ⭐5;
- có statistical draw tests;
- TypeScript không lỗi.

---

# 31. Mental Model cuối cùng của game

## 💗 Standard

**🌸 ⭐ → 💕 ⭐⭐ → 🔥 ⭐⭐⭐ → ❤️‍🔥 ⭐⭐⭐⭐ → 💋 ⭐⭐⭐⭐⭐**

↓

## 👕 Clothing Journey

Quần áo thay đổi dần trong quá trình chơi.

↓

## 💗 100%

↓

## 🤝 Cả hai đồng ý

↓

## 💎 Position

**⭐6 → ⭐7 → ⭐8 → ⭐9 → 👑 ⭐10**

Đây nên là mental model mới của toàn bộ game.
