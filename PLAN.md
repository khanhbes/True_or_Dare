# IMPLEMENTATION PLAN

## Guaranteed Clothing Progression & Adaptive Gameplay

---

# 1. Mục tiêu của thay đổi

Mục tiêu của phiên bản gameplay mới là biến quá trình cởi đồ thành một phần có chủ đích của hành trình game, thay vì chỉ phụ thuộc vào xác suất random.

Game phải tạo được progression:

**Kết nối → Flirt → Thân mật → Cởi đồ dần → Passionate → Cả hai đạt trạng thái phù hợp → Position Deck.**

Các mục tiêu quan trọng:

* mỗi ván Standard mặc định khoảng 20–24 thẻ hoàn thành;
* chắc chắn có nhiều cơ hội cởi đồ;
* không guarantee một lá cụ thể;
* mỗi ván có nhiều kiểu Clothing Card khác nhau;
* hai người tiến trang phục tương đối đồng đều;
* Clothing Cards không xuất hiện quá sớm;
* cuối Standard Journey, game chủ động giúp wardrobe theo kịp Intimacy;
* không cần màn hình bắt người chơi tự chọn đồ để cởi chỉ để unlock Position Deck;
* người chơi luôn có quyền Skip;
* Position Deck chỉ bắt đầu khi đủ điều kiện và cả hai đồng ý.

---

# 2. Kiến trúc gameplay sau khi thay đổi

Gameplay nên có 3 progression chính.

## 2.1. Intimacy Progress

Đại diện cho tiến trình dài hạn của ván.

Từ:

**0% → 100%.**

Intimacy quyết định:

* Truth/Dare weighting;
* star difficulty;
* card level;
* Passionate weighting;
* thời điểm Clothing Cards bắt đầu được ưu tiên.

---

## 2.2. Wardrobe Progress

Đại diện cho trạng thái trang phục thực tế.

Từ:

**0% → 100%.**

Trong đó:

* 0% = mặc nguyên đồ;
* khoảng 50% = bỏ hết outerwear;
* 100% = không còn garment.

Wardrobe Progress quyết định:

* Clothing Card nào hợp lệ;
* card hot nào được phép xuất hiện;
* người nào đang chậm progression;
* có đủ điều kiện vào Position Deck hay chưa.

---

## 2.3. Heat Momentum

Có thể bổ sung sau hoặc triển khai cùng nếu kiến trúc cho phép.

Heat Momentum đại diện cho “độ nóng tức thời”.

Không phải progression dài hạn.

Nó giúp gameplay có nhịp:

**tăng → nghỉ nhẹ → tăng → tăng mạnh → nghỉ → cao hơn.**

Heat Momentum không được phép bypass:

* Intimacy;
* wardrobe;
* content settings;
* consent.

---

# 3. Bổ sung Clothing Journey Controller

Đây là thay đổi quan trọng nhất.

Hiện tại Clothing Card chủ yếu được quyết định bằng random weighting.

Hệ thống mới cần thêm một:

**Clothing Journey Controller**

Controller này theo dõi toàn bộ quá trình cởi đồ của session.

Nó không chọn sẵn card.

Nó chỉ quyết định:

* đã đến lúc cần Clothing Opportunity chưa;
* loại Clothing Event nào nên được ưu tiên;
* người nào đang chậm;
* Clothing family nào chưa xuất hiện;
* wardrobe có đang đi chậm hơn Intimacy không.

---

# 4. Guaranteed Clothing Opportunities

Một Standard Journey mặc định khoảng 20–24 completed cards nên có khoảng:

**6 Guaranteed Clothing Opportunities.**

Đây là 6 lần game bảo đảm sẽ tạo cơ hội xuất hiện Clothing Card.

Không có nghĩa người chơi bắt buộc phải cởi 6 món.

Nếu người chơi Skip thì progression không xảy ra.

---

# 5. Clothing Opportunity Windows

Không đặt Clothing Event theo số lượt cố định.

Sử dụng cửa sổ Intimacy.

Đề xuất:

| Event                   | Intimacy Window |
| ----------------------- | --------------- |
| Clothing Opportunity #1 | 20–35%          |
| Clothing Opportunity #2 | 35–50%          |
| Clothing Opportunity #3 | 50–65%          |
| Clothing Opportunity #4 | 60–75%          |
| Clothing Opportunity #5 | 75–88%          |
| Clothing Opportunity #6 | 85–97%          |

Game được tự chọn thời điểm tốt nhất trong window.

Ví dụ:

Opportunity #1 có thể xảy ra ở:

* 23%;
* 28%;
* 32%.

Không cần luôn luôn ở cùng một thời điểm.

---

# 6. Không guarantee actual card

Không được tạo trước kiểu:

“Turn 6 chắc chắn card X.”

Chỉ guarantee:

**Clothing Event Type.**

Ví dụ system có thể quyết định:

“Trong window này cần một Mutual Clothing Event.”

Sau đó tới lượt thực tế mới tìm card phù hợp dựa trên:

* current player;
* opponent;
* wardrobe;
* Intimacy;
* recent history;
* settings.

Điều này tránh card được schedule trước nhưng tới lúc xuất hiện lại không còn hợp lệ.

---

# 7. Clothing Event Types

Mỗi ván nên có đa dạng Clothing Event.

Các nhóm chính:

### Self Removal

Người đang lượt là đối tượng wardrobe progression.

### Opponent Removal

Hành động hướng tới đối phương.

### Mutual / Both

Cả hai cùng có wardrobe progression.

### Choice

Card cho phép người chơi quyết định target hợp lệ.

### Random Target

Game chọn target dựa trên wardrobe state.

### Catch-up

Target người đang chậm hơn wardrobe progression.

### Challenge Result

Kết quả một mini challenge quyết định clothing progression.

### Duo Event

Hai người cùng tham gia và cả hai cùng tiến wardrobe.

### Special Clothing

Các card tạo biến thể đặc biệt như swap hoặc mechanic riêng.

---

# 8. Guaranteed Variety mỗi ván

Trong 6 Clothing Opportunities mặc định, cố gắng bảo đảm tối thiểu:

* ít nhất 1 Self;
* ít nhất 1 Opponent;
* ít nhất 1 Both;
* ít nhất 1 Choice / Challenge / Special;
* 2 slot còn lại được adaptive engine lựa chọn.

Không bắt buộc thứ tự cố định.

Mỗi session có thể sinh một pattern khác nhau.

Ví dụ Session A:

**Self → Opponent → Both → Choice → Opponent → Both**

Session B:

**Opponent → Self → Challenge → Both → Catch-up → Both**

Session C:

**Self → Both → Opponent → Choice → Self → Catch-up**

---

# 9. Clothing Diversity Score

Bổ sung hệ thống theo dõi diversity.

Trong session cần ghi nhận:

* Self đã xuất hiện bao nhiêu lần;
* Opponent đã xuất hiện bao nhiêu lần;
* Both đã xuất hiện bao nhiêu lần;
* Choice đã xuất hiện bao nhiêu lần;
* Challenge đã xuất hiện bao nhiêu lần;
* Special đã xuất hiện bao nhiêu lần.

Loại nào chưa xuất hiện sẽ được tăng weight.

Loại nào vừa xuất hiện nhiều lần sẽ bị giảm weight.

Mục tiêu:

không để session trở thành:

**Opponent → Opponent → Opponent → Opponent.**

---

# 10. Mở rộng Clothing Card Pool

Hiện tại cần tăng số lượng Clothing Cards để giảm cảm giác lặp.

Mục tiêu mới:

**30–32 Clothing-related Cards trong Standard Deck.**

Không có nghĩa mỗi session sử dụng toàn bộ.

Mỗi session thường chỉ xuất hiện khoảng 6–8 Clothing Cards.

Pool lớn dùng để tạo variety.

---

# 11. Distribution Clothing Cards mới

Có thể hướng tới:

| Clothing Category            |   Số lượng |
| ---------------------------- | ---------: |
| Normal / không thay wardrobe |      60–62 |
| Self Removal                 |   khoảng 6 |
| Opponent Removal             |   khoảng 7 |
| Both Removal                 |   khoảng 7 |
| Choice Removal               |   khoảng 4 |
| Challenge-based              |   khoảng 3 |
| Special / Swap / biến thể    | khoảng 3–5 |

Không cần ép tuyệt đối số lượng nếu card content không phù hợp.

Quan trọng là card pool phải đủ đa dạng.

---

# 12. Clothing Card Audience

Riêng Clothing Cards nên ưu tiên neutral audience.

Mục tiêu:

* khoảng 75–80% `both`;
* khoảng 10–12.5% `male`;
* khoảng 10–12.5% `female`.

Lý do:

Clothing Journey không nên bị kẹt chỉ vì current turn không đúng gender.

Gender-specific card vẫn cần tồn tại để tăng variety, nhưng không nên chiếm phần lớn Clothing Deck.

---

# 13. Clothing Intensity Levels

Không nên coi tất cả Clothing Cards có cùng mức nóng.

Bổ sung 5 cấp Clothing Intensity.

### C1 — Early

Phù hợp khoảng:

**20–40% Intimacy.**

Nhẹ, khởi động wardrobe progression.

---

### C2 — Early/Mid

Phù hợp khoảng:

**35–55%.**

---

### C3 — Mid

Phù hợp khoảng:

**50–70%.**

---

### C4 — Hot

Phù hợp khoảng:

**65–85%.**

---

### C5 — Late

Phù hợp khoảng:

**80–100%.**

Late Clothing Card chỉ xuất hiện khi:

* Intimacy phù hợp;
* wardrobe phù hợp;
* settings cho phép.

---

# 14. First Removal Balance

Bổ sung rule cân bằng đầu tiên.

Trước khi một người nhận Clothing Removal lần thứ hai:

game nên cố gắng giúp người còn lại có First Removal.

Ưu tiên progression:

**A lần 1 → B lần 1 → sau đó mới tiếp tục.**

Tránh:

**A → A → A → B.**

Đây là soft rule, không phải hard lock.

---

# 15. Second Removal Balance

Sau khi cả hai đã có First Removal:

engine bắt đầu hướng tới trạng thái:

**cả hai bỏ outerwear tương đối đồng đều.**

Nếu:

* Player A Wardrobe Progress cao;
* Player B Wardrobe Progress thấp;

thì các Clothing Event tiếp theo ưu tiên Player B.

---

# 16. Wardrobe Difference Threshold

Theo dõi độ lệch wardrobe giữa hai người.

Nếu difference nhỏ:

game hoạt động bình thường.

Nếu difference khoảng 15–25%:

tăng nhẹ target weight cho người còn mặc nhiều hơn.

Nếu difference từ khoảng 25% trở lên:

tăng mạnh target weight.

Nếu difference cực lớn:

Catch-up Event được ưu tiên.

Không hard-code dựa vào Male/Female.

Luôn dựa vào normalized wardrobe progress.

---

# 17. Both Removal Rules

`Both Removal` rất hiệu quả vì làm progression của cả hai tăng cùng lúc.

Nhưng không nên xuất hiện sớm.

Đề xuất:

### 0–20%

Không xuất hiện.

### 20–40%

Rất hiếm.

### 40–60%

Bắt đầu được phép.

### 60–80%

Có trọng số cao.

### 80%+

Rất phù hợp nếu cả hai vẫn còn garment hợp lệ.

Mục tiêu mỗi Standard session:

**ít nhất 1 Both Clothing Event.**

---

# 18. Clothing Card Frequency

Không để guarantee system làm Clothing Cards xuất hiện liên tục.

Rule mặc định:

* không nên có Clothing Card 2 lượt liên tiếp;
* tuyệt đối tránh 3 Clothing Cards liên tiếp;
* ngoại lệ chỉ xảy ra nếu wardrobe cực kỳ tụt so với Intimacy và session gần kết thúc.

Sau Clothing Card:

thường nên có 1–2 normal cards trước Clothing Card tiếp theo.

---

# 19. Clothing Pity Timer

Ngoài Guaranteed Opportunities, vẫn giữ Pity Timer.

Pity Timer xử lý trường hợp:

* Clothing Opportunity bị Skip;
* random weighting không chọn được card phù hợp;
* wardrobe progression bị chậm.

Từ 40% Intimacy trở lên:

### 0–2 lượt chưa có wardrobe progression

Không thay đổi.

### 3 lượt

Tăng nhẹ Clothing Weight.

### 4 lượt

Tăng đáng kể.

### 5+ lượt

Tăng mạnh.

Pity Timer reset chỉ khi wardrobe thực sự thay đổi.

---

# 20. Skip Clothing Card

Clothing Opportunity không đồng nghĩa với Clothing Removal bắt buộc.

Nếu người chơi Skip:

* không thay wardrobe;
* không tăng clothing progression;
* không phạt tự động;
* Clothing Opportunity được đánh dấu chưa hoàn thành.

Không đưa ngay một Clothing Card khác ở lượt tiếp theo.

Áp dụng cooldown khoảng:

**2 normal turns.**

Sau đó event có thể quay lại dưới dạng một card khác.

---

# 21. Reroll Clothing Card

Nếu người chơi Reroll Clothing Card:

* không bắt buộc card mới cũng là Clothing Card;
* không tăng wardrobe;
* Clothing Opportunity chưa hoàn thành;
* đưa opportunity trở lại queue;
* thử lại sau một khoảng cooldown.

Điều này tránh cảm giác game đang cố ép người chơi phải cởi đồ.

---

# 22. Adaptive Clothing Weight

Guaranteed Journey không thay thế adaptive weighting.

Hai hệ thống phải hoạt động cùng nhau.

Mỗi lượt cần xem:

* Intimacy;
* expected wardrobe;
* actual wardrobe;
* Clothing Journey;
* recent Clothing Events;
* diversity;
* player balance;
* pity timer.

Sau đó mới quyết định Clothing Weight thực tế.

---

# 23. Expected Wardrobe Curve

Gameplay cần có một target mềm.

Đề xuất:

### 0–20% Intimacy

Wardrobe gần 0%.

### 20–40%

Khoảng 5–25%.

### 40–60%

Khoảng 20–50%.

### 60–80%

Khoảng 45–75%.

### 80–100%

Khoảng 70–100%.

Không bắt buộc phải đúng tuyệt đối.

Curve này chỉ dùng để phát hiện:

**wardrobe đang chậm hay nhanh hơn progression.**

---

# 24. Wardrobe Catch-up Mode

Bổ sung một mode đặc biệt ở late game.

### Dưới 75% Intimacy

Adaptive bình thường.

### 75–85%

Nếu có người vẫn mặc khá nhiều outerwear:

tăng Clothing Weight.

### 85–95%

Nếu bất kỳ player nào vẫn `dressed`:

tăng mạnh Clothing Weight và Catch-up target.

### 95–100%

Nếu vẫn có player `dressed`:

game ưu tiên rất mạnh các Passionate Clothing Cards hợp lệ.

Không auto-remove garment.

Game chỉ tăng khả năng đưa ra cơ hội phù hợp.

---

# 25. Bỏ Manual Strip Gate

Loại bỏ flow kiểu:

**“Bạn chưa đủ điều kiện. Hãy chọn một món đồ để cởi.”**

Không nên dùng manual clothing selection chỉ để unlock Position Deck.

Lý do:

* phá immersion;
* tạo cảm giác kỹ thuật;
* khiến Clothing Journey trước đó mất ý nghĩa.

Wardrobe phải được xử lý thông qua gameplay cards.

---

# 26. Standard Extension Mode

Nếu:

**Intimacy = 100%**

nhưng:

**một hoặc cả hai vẫn `dressed`**

thì không vào Position Deck ngay.

Bật:

**Standard Extension Mode.**

Trong mode này:

* Intimacy giữ ở 100%;
* không xuất hiện Gentle;
* tập trung Intimate/Passionate;
* ưu tiên Dare;
* ưu tiên ⭐3–⭐5;
* tăng Clothing Weight;
* tăng Catch-up Weight;
* vẫn giữ cooldown;
* vẫn tôn trọng Skip;
* không ép người chơi.

Mode kết thúc khi:

* cả hai đạt ít nhất `underwear_only`;
* hoặc người chơi chọn kết thúc game.

---

# 27. Position Eligibility

Position Deck chỉ ở trạng thái eligible khi:

* Intimacy đủ cao;
* cả hai không còn ở `dressed`;
* cả hai ít nhất `underwear_only`;
* Position Deck được bật trong Settings.

Sau đó mới hiển thị transition consent.

---

# 28. Mutual Consent

Position Stage phải tiếp tục giữ double consent.

Cần:

* Player A xác nhận;
* Player B xác nhận.

Chỉ khi cả hai đồng ý mới chuyển stage.

Nếu một người không đồng ý:

* ở lại Standard;
* hoặc kết thúc game.

Không tự động transition.

---

# 29. Truth/Dare Progression giữ nguyên hướng adaptive

Dùng progression:

| Intimacy | Truth | Dare |
| -------- | ----: | ---: |
| 0–19%    |   70% |  30% |
| 20–39%   |   60% |  40% |
| 40–59%   |   45% |  55% |
| 60–79%   |   30% |  70% |
| 80–99%   |   20% |  80% |

Trong Standard Extension:

ưu tiên Dare cao hơn Normal Standard.

---

# 30. Star Progression

Giữ hướng:

* đầu game ⭐1–⭐2;
* giữa game ⭐2–⭐3;
* cuối game ⭐4–⭐5;
* 80% trở lên không còn ⭐1.

Clothing Intensity cũng phải tương thích với star/intimacy progression.

Không cho Clothing C5 xuất hiện ở early game.

---

# 31. Anti-repeat System

Tiếp tục theo dõi:

* recent card ID;
* recent action family;
* recent Clothing Event Type;
* recent target;
* recent star level.

Không để:

* cùng card lặp;
* cùng Clothing Family spam;
* cùng người bị target liên tục;
* Both Remove lặp sát nhau;
* swap/special xuất hiện quá thường xuyên.

---

# 32. Clothing Action Families

Mỗi Clothing Card nên được gán family.

Ví dụ:

* self;
* partner;
* mutual;
* choice;
* challenge;
* catch-up;
* swap;
* random;
* duo;
* special.

Cooldown áp dụng theo family.

---

# 33. Draw Engine Pipeline mới

Mỗi lượt draw nên theo thứ tự:

### Bước 1

Xác định current Intimacy.

### Bước 2

Xác định current player và opponent.

### Bước 3

Đọc wardrobe state của cả hai.

### Bước 4

Tính wardrobe progress.

### Bước 5

Kiểm tra Clothing Journey.

### Bước 6

Kiểm tra có Clothing Opportunity active hay chưa.

### Bước 7

Kiểm tra Catch-up Mode.

### Bước 8

Kiểm tra Pity Timer.

### Bước 9

Filter cards theo:

* audience;
* outfit;
* clothing feasibility;
* content settings.

### Bước 10

Tính Truth/Dare weight.

### Bước 11

Tính difficulty weight.

### Bước 12

Tính Clothing Event Type weight.

### Bước 13

Tính wardrobe balance weight.

### Bước 14

Tính diversity bonus.

### Bước 15

Tính anti-repeat penalty.

### Bước 16

Tính recent target penalty.

### Bước 17

Weighted random.

### Bước 18

Validate lại card.

### Bước 19

Return card.

---

# 34. Session State mới cần theo dõi

Clothing system cần lưu thêm:

* tổng Clothing Opportunities;
* Clothing Opportunities đã hoàn thành;
* Clothing Opportunities bị Skip;
* Clothing Event Type history;
* lượt từ Clothing Progression gần nhất;
* First Removal của mỗi player đã xảy ra chưa;
* số lần mỗi player bị target;
* số lần Self/Both/Opponent/Choice xuất hiện;
* current clothing window;
* current wardrobe difference;
* Catch-up Mode;
* Standard Extension Mode.

---

# 35. Settings cần bổ sung

Bổ sung các setting:

### Clothing Progression Mode

Các lựa chọn:

* Relaxed;
* Balanced Guaranteed;
* Faster Progression.

Default:

**Balanced Guaranteed.**

---

### Guaranteed Clothing Opportunities

Default:

**ON.**

---

### Clothing Variety

Default:

**ON.**

---

### Wardrobe Balance

Default:

**ON.**

---

### Clothing Pity Timer

Default:

**ON.**

---

### Wardrobe Catch-up

Default:

**ON.**

---

### Manual Strip Before Position

Default:

**OFF.**

---

### Position Requires Both Underwear-only or Less

Default:

**ON.**

---

### Mutual Position Consent

Default:

**ON.**

---

# 36. Gameplay Mode: Relaxed

Relaxed dành cho session ít tập trung clothing.

Đặc điểm:

* ít Guaranteed Clothing Opportunities hơn;
* Clothing Cards xuất hiện muộn hơn;
* Catch-up nhẹ;
* không cần đảm bảo đạt underwear_only cuối Standard;
* Position có thể tắt.

---

# 37. Gameplay Mode: Balanced Guaranteed

Đây là Default.

Đặc điểm:

* khoảng 6 Clothing Opportunities;
* progression bắt đầu khoảng 20–35%;
* có diversity;
* có wardrobe balance;
* có Catch-up;
* hướng cả hai tới underwear_only cuối Standard;
* không ép nếu người chơi Skip.

---

# 38. Gameplay Mode: Faster Progression

Đặc điểm:

* Clothing Opportunity bắt đầu sớm hơn;
* số Clothing Opportunities có thể tăng;
* Clothing Weight cao hơn;
* Catch-up bắt đầu sớm hơn;
* Both Cards có trọng số cao hơn.

---

# 39. Card Content Expansion

Không chỉ thêm nhiều card giống nhau.

Khi bổ sung Clothing Cards mới cần ưu tiên:

### Variety về target

* self;
* opponent;
* both;
* choice.

### Variety về mechanic

* direct;
* challenge;
* random;
* catch-up;
* duo;
* special.

### Variety về intensity

* C1;
* C2;
* C3;
* C4;
* C5.

### Variety về audience

* mostly both;
* một phần male;
* một phần female.

### Variety về action family

Không để toàn bộ clothing pool chỉ khác câu chữ nhưng cùng mechanic.

---

# 40. Data Audit sau khi thêm card

Sau khi mở rộng card pool cần thống kê:

* tổng cards;
* Truth/Dare;
* Gentle/Intimate/Passionate;
* ⭐1–⭐5;
* both/male/female;
* Clothing vs Normal;
* Self/Opponent/Both/Choice;
* Clothing Intensity;
* action family;
* outfit requirement.

Mục tiêu là dễ phát hiện nhóm thiếu card.

---

# 41. Simulation bắt buộc

Sau khi implement cần simulation nhiều session.

Khuyến nghị:

**10.000–100.000 simulated games.**

Thống kê:

* số card trung bình tới 100% Intimacy;
* số Clothing Opportunities;
* số Clothing Removals thực tế;
* turn xuất hiện Clothing Card đầu tiên;
* thời điểm cả hai bỏ outerwear;
* tỷ lệ một người còn dressed ở 90%;
* tỷ lệ phải vào Standard Extension;
* số lượt Standard Extension trung bình;
* clothing diversity;
* target balance;
* card repeat;
* family repeat.

---

# 42. Target Simulation

Mục tiêu:

### Standard Journey

Khoảng:

**20–24 completed cards.**

### Clothing Opportunity

Khoảng:

**6 opportunities/session.**

### First Clothing

Phần lớn nằm khoảng:

**20–35% Intimacy.**

### Mutual Clothing

Ít nhất khoảng:

**1 event/session.**

### Late Wardrobe

Ở khoảng 85–100% Intimacy:

phần lớn session nên có cả hai tiến gần hoặc đạt `underwear_only`.

### Standard Extension

Có thể xảy ra nhưng không nên xảy ra trong đa số session.

Nếu quá nhiều session phải Extension:

Clothing Journey đang quá chậm.

---

# 43. Test các trường hợp quan trọng

Cần kiểm tra:

* current player không đúng audience;
* opponent không còn garment hợp lệ;
* cả hai không còn outerwear;
* First Removal balance;
* wardrobe difference lớn;
* Clothing Opportunity bị Skip;
* Clothing Opportunity bị Reroll;
* 5 lượt không có clothing progression;
* Both card không hợp lệ;
* Clothing Card vừa xuất hiện;
* session thiếu Clothing Family nào đó;
* Intimacy 100 nhưng còn dressed;
* Standard Extension;
* cả hai underwear_only;
* một người không consent Position;
* cả hai consent Position.

---

# 44. Debug information

Trong development cần xem được:

* Intimacy;
* wardrobe progress từng player;
* expected wardrobe;
* wardrobe difference;
* Clothing Opportunity hiện tại;
* Clothing Event Type;
* Clothing Diversity;
* Pity Counter;
* Catch-up multiplier;
* target multiplier;
* candidate count;
* card được chọn;
* lý do card được boost;
* lý do card bị filter.

Điều này rất quan trọng vì adaptive system khó debug nếu chỉ nhìn card cuối cùng.

---

# 45. Thứ tự triển khai

## Phase 1 — P0: Core State

Làm trước:

* normalized Wardrobe Progress;
* Clothing Event Types;
* Clothing Journey state;
* history;
* First Removal tracking;
* Clothing Pity Counter.

Không thay UI lớn.

---

## Phase 2 — P0: Guaranteed Clothing Journey

Implement:

* 6 Clothing Opportunity windows;
* Opportunity queue;
* skip behavior;
* reroll behavior;
* cooldown;
* event completion.

Đây là phần quan trọng nhất.

---

## Phase 3 — P0: Adaptive Clothing Selection

Implement:

* wardrobe balance;
* target weighting;
* First Removal Balance;
* Second Removal Balance;
* Clothing Diversity;
* Both weighting.

---

## Phase 4 — P0: Late-game Catch-up

Implement:

* 75% catch-up;
* 85% strong catch-up;
* 95% critical catch-up;
* không auto-strip.

---

## Phase 5 — P0: Position Transition

Thay:

**manual clothing selection**

bằng:

**Standard Extension.**

Sau đó:

* wardrobe eligibility;
* double consent;
* Position transition.

---

## Phase 6 — P1: Card Expansion

Tăng Clothing Card Pool lên khoảng:

**30–32 cards.**

Thêm:

* nhiều Both;
* Choice;
* Challenge;
* Catch-up;
* Duo;
* Special.

---

## Phase 7 — P1: Clothing Intensity

Phân card thành:

* C1;
* C2;
* C3;
* C4;
* C5.

Kết nối Clothing Intensity với Intimacy.

---

## Phase 8 — P1: Settings

Thêm:

* Relaxed;
* Balanced Guaranteed;
* Faster Progression.

Balanced Guaranteed làm default.

---

## Phase 9 — P1: Simulation

Chạy simulation.

Tune:

* opportunity windows;
* Clothing Weight;
* Catch-up multiplier;
* cooldown;
* diversity.

---

## Phase 10 — P2: Heat Momentum

Sau khi Clothing Journey đã ổn định mới thêm Heat Momentum.

Không nên làm Heat Momentum trước khi core clothing progression hoạt động đúng.

---

# 46. Những phần không nên làm

Không nên:

* chọn trước actual Clothing Card cho toàn session;
* auto-remove garment;
* ép Clothing Card ngay sau Skip;
* biến Skip thành punishment;
* hard-code nữ phải cởi nhiều hơn vì có nhiều garment;
* chỉ dựa vào số lượng garment;
* guarantee cùng một Clothing pattern mỗi ván;
* random card hoàn toàn không nhìn wardrobe;
* mở Position chỉ vì Intimacy = 100%;
* bắt người chơi chọn garment thủ công ở màn hình transition;
* spam Clothing Cards ở cuối để sửa progression quá muộn.

---

# 47. Acceptance Criteria

Implementation được coi là hoàn thành khi:

* mỗi Standard session mặc định có khoảng 6 Clothing Opportunities;
* Opportunity xảy ra ở nhiều thời điểm khác nhau;
* không guarantee một card cụ thể;
* Clothing Card Pool đủ lớn để không lặp;
* Self/Opponent/Both/Choice có diversity;
* có ít nhất một Mutual/Both opportunity trong phần lớn session;
* Clothing Cards rất ít ở đầu game;
* Clothing frequency tăng theo Intimacy;
* cả hai có First Removal tương đối sớm;
* không một player bị target liên tục vô lý;
* người wardrobe chậm được ưu tiên;
* Pity Timer hoạt động;
* Skip không làm wardrobe thay đổi;
* Reroll không ép Clothing Card khác ngay;
* Clothing Opportunity bị Skip được retry sau cooldown;
* 75%+ bắt đầu Catch-up;
* 85%+ Catch-up mạnh hơn;
* 95%+ ưu tiên mạnh Clothing Progression nếu còn dressed;
* không auto-strip;
* không còn Manual Strip Gate;
* 100% Intimacy nhưng wardrobe chưa đủ sẽ vào Standard Extension;
* Standard Extension chỉ dùng Passionate/Intimate phù hợp;
* Position Deck chỉ eligible khi wardrobe phù hợp;
* Position vẫn cần mutual consent;
* adaptive engine vẫn giữ yếu tố random;
* nhiều session liên tiếp tạo được progression khác nhau.

---

# 48. Gameplay mục tiêu cuối cùng

Một ván lý tưởng sẽ có cảm giác như:

**0–20%**

Kết nối và làm quen.

↓

**20–40%**

Flirt và Clothing Opportunity đầu tiên.

↓

**40–60%**

Hai người bắt đầu cùng tiến wardrobe.

↓

**60–80%**

Dare, Intimate và Clothing Cards tăng mạnh.

↓

**80–95%**

Passionate, ⭐4–⭐5 và wardrobe-dependent cards.

↓

**95–100%**

Game tự cân bằng người còn mặc nhiều hơn.

↓

**Wardrobe Ready**

Cả hai ít nhất underwear_only.

↓

**Mutual Consent**

Cả hai xác nhận.

↓

**Position / Luxury Stage**

Tiếp tục progression.

---

# 49. Nguyên tắc thiết kế cuối cùng

Không nên hỏi:

**“Lượt này có random trúng card cởi đồ hay không?”**

Hệ thống nên hỏi:

**“Clothing Journey hiện đang ở đâu, ai đang chậm, loại Clothing Event nào còn thiếu và card nào phù hợp nhất với thời điểm hiện tại?”**

Sau đó mới random trong nhóm card hợp lệ.

Đây là thay đổi cốt lõi giúp game vừa có tính ngẫu nhiên, vừa bảo đảm wardrobe progression thực sự diễn ra và dẫn tự nhiên tới Position Deck.
