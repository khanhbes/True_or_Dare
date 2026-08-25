# IMPLEMENTATION PLAN — REMAINING GAMEPLAY WORK

## 1. Mục tiêu giai đoạn tiếp theo

P0 hiện đã đưa Clothing Journey vào gameplay thực tế. Giai đoạn tiếp theo tập trung vào 4 mục tiêu:

1. Hoàn thiện balancing giữa hai người.
2. Mở rộng và chuẩn hóa dữ liệu Clothing Cards.
3. Dùng simulation để kiểm chứng pacing thật.
4. Sau khi có baseline ổn định mới bổ sung Gameplay Modes và Heat Momentum.

Thứ tự nên là:

**P0 Final Check → P1A Metadata & Card Pool → P1B Simulation → P1C Gameplay Modes → P2 Heat Momentum**

---

## 2. P0 FINAL CHECK — Những phần cần xác nhận/làm nốt

### 2.1. First Removal Balance

Mục tiêu:

Không để một người bị cởi nhiều lần trong khi người kia chưa có Clothing Progression lần đầu.

Ví dụ không mong muốn:

**A → A → A → B**

Nên ưu tiên:

**A → B → A/B**

Rule mong muốn:

- nếu A đã có First Removal;
- B chưa có First Removal;
- có candidate phù hợp cho B;

thì tăng mạnh trọng số card/target hướng tới B.

Không hard-lock tuyệt đối.

Nếu card tự nhiên chỉ áp dụng được cho A thì vẫn cho phép.

### Acceptance Criteria

- cả hai thường có First Removal tương đối gần nhau;
- hiếm khi một player có 2–3 removal trước khi player kia có removal đầu tiên.

---

## 3. Second Removal / Wardrobe Balance

Sau First Removal, engine phải tiếp tục cân bằng dựa trên `wardrobeProgress`.

Ví dụ:

- A = 75%
- B = 25%

thì B đang mặc nhiều hơn và phải được ưu tiên.

Đề xuất chia chênh lệch thành:

| Wardrobe Difference | Xử lý |
|---|---|
| <15% | Không cần can thiệp |
| 15–24% | Boost nhẹ player chậm |
| 25–39% | Boost mạnh |
| ≥40% | Ưu tiên Catch-up |

Không dùng giới tính để quyết định.

Chỉ dùng progression thực tế.

### Acceptance Criteria

Simulation không thường xuyên xuất hiện tình trạng:

**A gần empty trong khi B vẫn dressed.**

---

## 4. Clothing Diversity

Cần bổ sung hoặc xác nhận hệ thống session thực sự theo dõi Clothing Family.

Các family tối thiểu:

- Self
- Opponent
- Both
- Choice
- Challenge
- Catch-up
- Special

Session phải đếm số lần từng family đã xuất hiện.

Family chưa xuất hiện:

→ được boost.

Family vừa xuất hiện:

→ bị giảm weight.

Family xuất hiện quá nhiều:

→ bị giảm mạnh.

### Mục tiêu mỗi Balanced session

Khoảng 6 Clothing Opportunities, trong đó cố gắng có:

- ≥1 Self
- ≥1 Opponent
- ≥1 Both
- ≥1 Choice / Challenge / Special

Hai opportunity còn lại để adaptive engine quyết định.

---

## 5. Both Removal Weighting

`both_remove` cần weighting riêng theo Intimacy.

| Intimacy | Both Removal |
|---|---|
| 0–19% | Không xuất hiện |
| 20–39% | Rất hiếm |
| 40–59% | Bắt đầu cho phép |
| 60–79% | Weight cao |
| 80–100% | Weight rất cao nếu cả hai còn garment |

### Balanced Mode Goal

Phần lớn session nên có ít nhất:

**1 Both Clothing Event.**

---

# P1A — CHUẨN HÓA CARD SYSTEM

## 6. Chuẩn hóa metadata Clothing Cards

Mỗi Clothing Card nên xác định rõ:

- Clothing Family
- Clothing Intensity
- Action Target
- Turn Audience
- Outfit Requirement
- Clothing Effect
- Level
- Stars
- Truth/Dare
- Cooldown Family nếu cần

Mục tiêu: card selector không cần suy luận từ nội dung text.

---

## 7. Clothing Intensity C1–C5

### C1 — Early
**20–40% Intimacy**

### C2 — Early/Mid
**35–55%**

### C3 — Mid
**50–70%**

### C4 — Hot
**65–85%**

### C5 — Late
**80–100%**

C5 chỉ xuất hiện khi:
- Intimacy phù hợp;
- wardrobe phù hợp;
- content settings cho phép.

---

## 8. Clothing Intensity phải tham gia draw engine

Opportunity không chỉ yêu cầu một Clothing Card, mà nên ưu tiên:

**Clothing Family phù hợp + Clothing Intensity phù hợp.**

Ở 30%:
- C1 cao;
- C2 có thể;
- C3 rất thấp;
- C4/C5 không hợp lệ.

Ở 88%:
- C1 gần như không còn;
- C3 có thể;
- C4/C5 chiếm ưu thế.

---

## 9. Data Audit tự động

Audit toàn bộ 92 Standard Cards.

Report phải có:

### Tổng quan
- tổng số card;
- Truth;
- Dare;
- Gentle;
- Intimate;
- Passionate.

### Difficulty
- ⭐1;
- ⭐2;
- ⭐3;
- ⭐4;
- ⭐5.

### Audience
- both;
- male;
- female.

### Clothing
- non-clothing;
- clothing-related;
- clothing-changing.

### Clothing Family
- Self;
- Opponent;
- Both;
- Choice;
- Challenge;
- Catch-up;
- Special.

### Clothing Intensity
- C1;
- C2;
- C3;
- C4;
- C5.

### Outfit Requirement
- thống kê theo từng loại requirement.

### Target
- self;
- opponent;
- both;
- choice.

---

## 10. Mục tiêu của Data Audit

Không thêm card theo cảm giác.

Ví dụ nếu audit cho thấy:
- Self = 9
- Opponent = 10
- Both = 2
- Choice = 1
- Challenge = 0

thì không cần thêm Self/Opponent nữa; cần tập trung vào Both, Choice, Challenge.

Tương tự với intensity.

---

## 11. Mở rộng Clothing Pool

Sau Data Audit mới nâng pool.

Mục tiêu:

**30–32 Clothing-related Standard Cards.**

Một session vẫn chỉ nên có khoảng:

**6–8 Clothing Cards.**

Pool lớn nhằm tăng variety, không làm tăng quá mức tần suất cởi đồ trong một ván.

---

## 12. Distribution mục tiêu cho Clothing Pool

| Family | Số card mục tiêu |
|---|---:|
| Self | 5–6 |
| Opponent | 6–7 |
| Both | 6–7 |
| Choice | 3–4 |
| Challenge/Duo | 3–4 |
| Catch-up/Special | 3–4 |

Không cần tạo card chỉ để đủ số lượng nếu nội dung bị trùng.

---

## 13. Audience của Clothing Pool

| Audience | Tỷ lệ |
|---|---:|
| Both | 75–80% |
| Male | 10–12.5% |
| Female | 10–12.5% |

Guaranteed Clothing Journey không nên bị kẹt vì gender-specific cards quá nhiều.

---

## 14. Không tạo card chỉ khác câu chữ

Diversity phải đến từ mechanic:

- self progression;
- partner progression;
- mutual;
- challenge result;
- choice;
- random target;
- catch-up;
- duo;
- special;
- swap.

---

# P1B — SIMULATION & BALANCING

## 15. Simulation Engine

Sau khi metadata và card pool hoàn chỉnh:

- chạy tối thiểu **10.000 simulated Standard Sessions**;
- có thể tăng lên **50.000–100.000** khi tuning cuối.

---

## 16. Baseline Simulation

Giả định:
- mọi card đều Completed;
- không Skip;
- không Reroll;
- Balanced Guaranteed Mode;
- wardrobe mặc định;
- chưa cần mô phỏng Position ở vòng đầu.

Sau đó mới thêm scenario:
- random Skip;
- random Reroll;
- custom wardrobes.

---

## 17. Session Duration Metrics

Đo:
- average cards tới 100%;
- median;
- p10;
- p90.

Target:

**20–24 completed cards trung bình.**

---

## 18. Clothing Frequency Metrics

Đo:
- Clothing Opportunities/session;
- Clothing Cards presented;
- Clothing Cards completed;
- normal cards giữa hai Clothing Events.

Target:

**khoảng 6 opportunities/session.**

---

## 19. First Clothing Timing

Đo:

**intimacyAtFirstClothing**

Target:

phần lớn khoảng **20–35%**.

---

## 20. Both Underwear Timing

Đo:

**intimacyAtBothUnderwearOnly**

Target đẹp:

phần lớn Balanced sessions đạt **both underwear_only khoảng 80–98% Intimacy**.

Nếu thường ở 55–65% → quá nhanh.

Nếu thường tới 100% vẫn chưa đạt → quá chậm.

---

## 21. Wardrobe Balance Metrics

Đo:
- average wardrobe difference;
- maximum wardrobe difference;
- số lượt difference ≥25%;
- số lượt difference ≥40%;
- tỷ lệ một người empty trong khi người còn lại dressed.

Target:

`empty vs dressed` phải cực hiếm.

---

## 22. Diversity Metrics

Đo:
- Self events;
- Opponent events;
- Both events;
- Choice events;
- Challenge events;
- Special events;
- % session có ít nhất 1 Both.

Target:

phần lớn Balanced session phải có Both Event.

---

## 23. Pity Metrics

Đo:
- pity level 1 activations;
- pity level 2;
- pity level 3;
- average turns between clothing progressions.

Nếu pity gần như luôn active → base Journey quá yếu.

Nếu pity không bao giờ active → có thể Clothing Weight quá mạnh.

---

## 24. Catch-up Metrics

Đo:
- Level 1 activation;
- Level 2;
- Level 3;
- số lượt cần để wardrobe cân bằng trở lại.

Nếu Level 3 xuất hiện thường xuyên → progression trước 95% đang có vấn đề.

---

## 25. Standard Extension Metrics

Đo:
- tỷ lệ session vào Standard Extension;
- số turn Extension trung bình;
- số turn Extension tối đa;
- lý do Extension;
- player nào thường bị chậm.

Target:

Standard Extension tồn tại nhưng **không nên xảy ra trong đa số session**.

---

## 26. Simulation có Skip

Test Clothing Card Skip rate:
- 10%;
- 20%;
- 30%.

Đo:
- Extension Rate;
- retry rate;
- session duration;
- position eligibility rate.

Mục tiêu:

Skip làm game dài hơn nhưng không phá Journey.

---

## 27. Simulation có Reroll

Đảm bảo:
- Clothing Opportunity retry hoạt động;
- không spam Clothing Cards;
- session vẫn có progression.

---

## 28. Balancing Pass

Chỉ tune:
- opportunity boost;
- pity multiplier;
- wardrobe balance multiplier;
- diversity multiplier;
- catch-up multipliers;
- Both weighting;
- cooldown.

### Nếu wardrobe quá nhanh
Giảm:
- Clothing opportunity weight;
- Both weight;
- catch-up early weight.

Hoặc đẩy windows muộn hơn.

### Nếu wardrobe quá chậm
Tăng:
- opportunity boost;
- pity;
- target balance;
- late catch-up.

### Nếu diversity thấp
Tăng:
- unseen-family bonus;
- repeated-family penalty.

### Nếu Standard Extension quá nhiều
Clothing Journey trước 100% chưa đủ mạnh.

---

# P1C — GAMEPLAY MODES

## 29. Relaxed Mode

- 3–4 Clothing Opportunities;
- first clothing muộn hơn;
- Both weight thấp;
- pity chậm hơn;
- catch-up yếu;
- không cần guarantee both underwear_only.

---

## 30. Balanced Guaranteed Mode

Default.

- khoảng 6 Opportunities;
- First Removal Balance;
- Wardrobe Balance;
- Diversity;
- Both Event;
- Pity;
- Catch-up;
- Standard Extension;
- hướng cả hai tới underwear_only ở khoảng 80–98%.

---

## 31. Faster Progression Mode

- 7–8 Opportunities;
- first clothing sớm hơn;
- Both weight cao hơn;
- pity mạnh hơn;
- catch-up bắt đầu sớm hơn.

Không nên làm Clothing quá mạnh ở 0–20%.

---

## 32. Settings UI

Chỉ expose các lựa chọn đơn giản:

### Relaxed
“Chậm và nhẹ hơn.”

### Balanced
“Tiến triển tự nhiên và cân bằng.”

### Faster
“Nhanh và táo bạo hơn.”

Không expose hàng chục multiplier kỹ thuật.

---

# P1D — INTEGRATION TESTS MỞ RỘNG

## 33. Test First Removal Balance

Setup:
- A đã removal một lần;
- B chưa.

Kỳ vọng:
- B được boost.

---

## 34. Test Clothing Diversity

Setup:
- 3 recent Clothing Events cùng family.

Kỳ vọng:
- family khác được boost mạnh.

---

## 35. Test Both Progression

Test ở:
- 10%;
- 30%;
- 50%;
- 70%;
- 90%.

Đảm bảo weight thay đổi đúng.

---

## 36. Test Critical Wardrobe Difference

Setup:
- A = 80%;
- B = 20%.

Kỳ vọng:
- B được strong target boost.

---

## 37. Test Opportunity + Diversity + Balance cùng lúc

Ví dụ:
- Active Opportunity yêu cầu Clothing;
- Both chưa xuất hiện;
- B đang chậm;
- recent family = Self.

Selector phải tổng hợp được tất cả modifier đúng cách.

---

## 38. Test Standard Extension full lifecycle

Test:

**100% + dressed  
→ Extension  
→ Clothing Card  
→ completed  
→ both underwear_only  
→ Exit Extension  
→ Position Consent**

Đây phải là integration test end-to-end.

---

# P1E — DEBUG & TOOLING

## 39. Debug Logging

Mỗi draw trong development nên xem được:

- Intimacy;
- current phase;
- current opportunity;
- clothing family desired;
- wardrobe A/B;
- wardrobe difference;
- expected wardrobe;
- pity;
- catch-up;
- diversity state;
- target modifier;
- Both modifier;
- candidate count;
- top weighted candidates;
- selected card;
- lý do card được boost.

---

## 40. Top Candidates Debug

Nên log Top 5 candidates cùng:
- weight;
- family;
- intensity;
- target;
- modifier chính;
- lý do bị boost/penalty.

---

# P2 — HEAT MOMENTUM

## 41. Chỉ làm sau khi core ổn định

Chỉ triển khai khi:
- Clothing Journey ổn;
- card pool ổn;
- simulation ổn;
- modes ổn.

---

## 42. Mục tiêu Heat Momentum

Heat Momentum dùng để tạo nhịp ngắn hạn:

- card nhẹ → Heat giảm nhẹ;
- Intimate Dare → Heat tăng;
- Passionate Dare → tăng mạnh;
- Clothing Event → tăng;
- nhiều card mạnh liên tục → có thể đưa một card nhẹ hơn nhưng vẫn phù hợp late game.

---

## 43. Heat Momentum không thay Intimacy

Ba hệ thống:

- **Intimacy** = Long-term progression.
- **Wardrobe Progress** = Physical progression.
- **Heat Momentum** = Short-term pacing.

Không dùng Heat để bypass:
- Intimacy band;
- Clothing Intensity;
- Outfit Requirement.

---

# 44. Những phần chưa nên làm

Chưa cần:
- thêm nhiều animation;
- overhaul UI;
- Achievement system mới;
- AI-generated cards runtime;
- multiplayer;
- cloud balancing;
- Heat Momentum trước simulation;
- tăng card pool vô hạn.

Ưu tiên gameplay core.

---

# 45. Thứ tự triển khai đề xuất

## Remaining P0
1. First Removal Balance.
2. Second Removal / Wardrobe Target Balance.
3. Clothing Diversity.
4. Both Weighting.

## P1A — Card System
5. Chuẩn hóa Clothing metadata.
6. C1–C5.
7. Data Audit.
8. Phân tích card thiếu.
9. Mở rộng Clothing Pool 30–32.

## P1B — Validation
10. Integration tests mới.
11. Simulation 10k.
12. Analyze metrics.
13. Tune balancing.
14. Simulation lại.
15. Lặp tới khi đạt target.

## P1C — Modes
16. Balanced baseline.
17. Relaxed.
18. Faster.
19. Settings UI.
20. Simulation từng mode.

## P1D — Tooling
21. Debug logging.
22. Candidate weight inspection.
23. Data distribution report.

## P2
24. Heat Momentum.
25. Simulation lại với Heat.
26. Final pacing tuning.

---

# 46. Definition of Done cho P1

P1 chỉ hoàn thành khi:

- Clothing Pool đạt khoảng 30–32 card chất lượng;
- card có Clothing Family rõ ràng;
- có C1–C5;
- C1–C5 ảnh hưởng selector;
- Data Audit chạy được;
- First/Second Removal Balance hoạt động;
- Clothing Diversity hoạt động;
- Both Weight thay đổi theo Intimacy;
- simulation ít nhất 10.000 ván chạy thành công;
- Standard Journey trung bình 20–24 card;
- first clothing chủ yếu 20–35%;
- cả hai thường đạt underwear_only khoảng 80–98%;
- Standard Extension không xảy ra trong đa số session;
- wardrobe imbalance lớn hiếm;
- phần lớn session có Both Event;
- Relaxed/Balanced/Faster khác nhau rõ;
- toàn bộ tests pass;
- TypeScript build không lỗi.

---

# 47. Milestone tiếp theo

Milestone gần nhất:

> **P1A — Clothing Metadata + Data Audit**

Sau đó:

> **P1A.2 — bổ sung đúng các family/intensity còn thiếu để đạt khoảng 30–32 Clothing Cards.**

Tiếp theo:

> **P1B — chạy 10.000 simulation và tuning.**

Đây là bước quyết định các tỷ lệ hiện tại có thực sự tạo ra một ván chơi cân bằng hay không.
