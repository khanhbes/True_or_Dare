Implementation Plan — 3 Bug Fixes & Security Hardening

Problem Statement: Sửa 3 vấn đề trong web app truth-or-dare-for-couples: (1) thanh tim lần 1 đang có gradient hồng→vàng cần đổi sang gradient 2 tông hồng nhạt, (2) bộ Tư thế bị lỗi trống khi không tìm được bậc sao khớp thay vì fallback sang sao gần nhất, (3) nội dung thẻ có thể bị xem qua DevTools/DOM trước khi người chơi bấm reveal.

Requirements:

1=b: Thanh tim lần 1 → gradient nhẹ chỉ 2 tông hồng pastel, bỏ phần vàng #e2c275
2=a: Bộ Tư thế fallback tự động khi no_positive_weight → chọn sao gần nhất có thẻ, không hiện lỗi
3=c: Obfuscate nội dung thẻ trong bundle + khóa DOM không cho inspect nội dung trước khi reveal
Background:

Thanh tim:

File: 
GameTable.tsx
 ~dòng 1285
Hiện tại: bg-[linear-gradient(90deg,#fb7185,#f9a8d4,#e2c275)] + shadow rực rgba(251,113,133,.35)
Cần đổi sang 2 màu hồng nhạt, bỏ #e2c275
Bộ Tư thế fallback:

File: 
progression.ts
 — hàm selectLuxuryPositionCard()
Lỗi xảy ra tại 2 chỗ:
availableStars.length === 0 (không có sao nào có weight > 0 sau khi tính probabilities)
chooseWeighted() trả về null sau khi normalize
Fix: khi không khớp → lấy tất cả sao có thẻ trong candidates, chọn sao gần nhất với band hiện tại
Thay đổi chỉ trong selectLuxuryPositionCard(), không đụng selectJourneyCard() (bộ standard)
Bảo mật thẻ:

Vấn đề: card.content nằm plaintext trong JS bundle và trong React state → DevTools có thể $r.props để thấy nội dung
Giải pháp 2 lớp:
Obfuscate bundle: dùng Vite plugin vite-plugin-obfuscator (javascript-obfuscator) để obfuscate string literals trong cards.ts
DOM lock: thẻ chưa reveal → card.content không được đưa vào DOM (hiện đang đúng với showContent={false} khi !isRevealed). Cần thêm: không render card object vào props của component nội dung khi chưa reveal — thay bằng null hoặc placeholder, chỉ pass card vào component sau khi isRevealed = true
Proposed Solution:

Task 1: Sửa màu thanh tim lần 1 trong GameTable.tsx
Task 2: Thêm fallback star-selection trong selectLuxuryPositionCard() ở progression.ts
Task 3: Thêm DOM content guard — không truyền nội dung thẻ vào React tree khi chưa reveal
Task 4: Thêm Vite obfuscation plugin cho cards.ts string content
Task Breakdown:

Task 1: Sửa màu thanh tim lần 1

Objective: Đổi gradient thanh tim standard từ 3 màu #fb7185→#f9a8d4→#e2c275 sang 2 tông hồng nhạt #f9a8d4→#fecdd3, giảm shadow glow để trông nhẹ nhàng hơn.
File: 
GameTable.tsx
Tìm dòng có bg-[linear-gradient(90deg,#fb7185,#f9a8d4,#e2c275)] và đổi thành bg-[linear-gradient(90deg,#f9a8d4,#fecdd3)]
Đổi shadow shadow-[0_0_18px_rgba(251,113,133,.35)] → shadow-[0_0_10px_rgba(249,168,212,.25)] (nhẹ hơn)
Demo: chạy dev server, nhìn thanh tim lần 1 chỉ có màu hồng pastel nhẹ, không có đốm vàng ở cuối.
Task 2: Fallback bậc sao cho bộ Tư thế

Objective: Khi availableStars.length === 0 hoặc chooseWeighted() trả null trong selectLuxuryPositionCard(), thay vì trả errorCode: 'no_positive_weight', tự động chọn sao gần nhất có thẻ trong candidates.
File: 
progression.ts
Implementation:

// Sau khi tính availableStars, nếu rỗng → fallback
const effectiveStars = availableStars.length > 0
  ? availableStars
  : POSITION_DIFFICULTY_STARS.filter(star => candidates.some(c => derivePositionDifficultyStars(c) === star));

// Nếu effectiveStars vẫn rỗng → no_cards (không còn thẻ thật sự)
if (effectiveStars.length === 0) { return { errorCode: 'no_cards', ... }; }

// Chọn sao theo weight nếu có, hoặc uniform random nếu fallback
Tương tự, sau chooseWeighted() trả null → fallback chọn random từ effectiveStars
Test: viết hoặc cập nhật test case trong progression.test.ts để kiểm tra tình huống band có weights = 0 cho tất cả sao hiện có nhưng vẫn trả về thẻ
Demo: ở mức Luxury 0–19%, thẻ tư thế chỉ có sao 5-7 vẫn được rút thay vì báo lỗi.
Task 3: DOM content guard — không render nội dung trước khi reveal

Objective: Đảm bảo card.content, card.hint, card.icon không xuất hiện trong React DOM khi isRevealed = false, ngăn người dùng inspect element hoặc dùng React DevTools để đọc nội dung.
File: 
GameTable.tsx
Implementation: Tạo biến revealedCard — chỉ có giá trị khi isRevealed === true:
tsx

const revealedCard = isRevealed ? activeCard : null;
Đoạn render nội dung thẻ trong !isRevealed branch: thay vì chỉ ẩn qua showContent={false} (vẫn pass card xuống), đổi thành không render GameCard component hoàn toàn, chỉ render placeholder EyeOff + button "Xem Nội Dung". Khi isRevealed = true mới render <GameCard card={activeCard} showContent={true} .../>.
Lưu ý: activeCard vẫn cần tồn tại trong state để tracking (id, deck, type), nhưng không được truyền vào component render nội dung khi chưa reveal. Cần kiểm tra không có chỗ nào khác leak card.content vào DOM (aria-label, title, v.v.)
Demo: Mở DevTools → Elements tab khi thẻ chưa reveal → không thấy text nội dung thẻ trong DOM. React DevTools → không thấy content trong props của component hiển thị.
Task 4: Obfuscate string content trong bundle

Objective: Khó đọc nội dung thẻ ngay cả khi người dùng tải về và unminify JS bundle.
File: 
vite.config.ts
, thêm dependency javascript-obfuscator và vite-plugin-obfuscator
Implementation:
Cài vite-plugin-obfuscator (pinned version, ví dụ ^0.3.0)
Config chỉ obfuscate file 
cards.ts
 (tránh obfuscate toàn bộ bundle gây chậm)
Options: stringArray: true, stringArrayEncoding: ['base64'], rotateStringArray: true, selfDefending: false (tránh conflict với HMR)
Chỉ áp dụng trong production build (apply: 'build')
Demo: chạy npm run build, mở dist/assets/*.js, tìm một đoạn nội dung thẻ như "Ấn tượng đầu tiên" → không xuất hiện dưới dạng plaintext, thay bằng chuỗi base64 hoặc array lookup.