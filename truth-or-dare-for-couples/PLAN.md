# Hoàn thiện thứ tự thẻ và toàn bộ gameplay

## Tóm tắt audit

- Catalog hiện hợp lệ: 157 thẻ duy nhất, gồm 113 bài thường, 44 Tư thế và 43 ảnh; không có ID hoặc nội dung trùng hoàn toàn.
- Đường cong bài thường 0–100% đang cho đúng tỷ lệ cấu hình; giữ nguyên điểm `4/6/8/10/12%`, thưởng cởi đồ `8%`, đổi bài `8★` và tăng khó `10★`.
- Các lỗi cần sửa:
  - `orderGroup` được Admin lưu nhưng không ảnh hưởng thứ tự.
  - Metadata đối tượng đang trộn “ai được rút” và “ai thực hiện”.
  - Tư thế thiếu lá thường 1★, 2★, 4★, 9★; pool hợp lệ Nam/Nữ lệch 9/17.
  - 41/44 Tư thế yêu cầu hết đồ nhưng selector không kiểm tra.
  - Have Sex 7–10★ đều đang chiếm ô xác suất 10★.
  - Tư thế 10★ không thuộc Have Sex không bao giờ được chọn.
  - Effect trang phục trên Tư thế hiển thị CTA nhưng không mở dialog xử lý.
  - Áo lót nữ chuyển sang nam dùng sai geometry.
  - Danh sách loại bài trước khi rút chưa lọc cấp độ đã bật.
  - Tỷ lệ hiển thị sau khi rút là tỷ lệ của lần kế tiếp, không phải tỷ lệ tạo ra lá hiện tại.
  - Bộ đếm “Tư thế đã mở” tăng từ lúc rút, trước khi mở nội dung.
  - `g-d-14` đang được tính như thử thách 2★ có timer dù chỉ yêu cầu chuyển lượt.
  - `rewards.test.ts` tồn tại nhưng chưa nằm trong lệnh `npm test`; chưa có integration test bàn chơi.

## Kiểu dữ liệu và tương thích

- Thay metadata đối tượng bằng `TurnAudience = 'male' | 'female' | 'both'`; trường này chỉ quyết định lượt nào được rút.
  - Người rút luôn là người nhận sao, điểm hoàn thành và luật phạt.
  - `current` được migrate thành `both`; catalog hiện không có lá `opponent`.
  - Dữ liệu cũ `audience`/`recipient` vẫn được hydrate, nhưng Admin chỉ lưu `turnAudience`.
- Thêm `CardGameplayEffect` với `pass_turn` cho `g-d-14`.
- Thêm `finalCardChance` vào cấu hình Luxury, mặc định 5% ở 80–99%.
- Thêm nguồn sự kiện trang phục `preparation`; không cộng sao, thân mật hoặc tính là luật phạt.
- Thêm `CardResolutionEvent` để ghi thống nhất trạng thái `completed`, `skipped`, `rerolled`, `passed`, `final_viewed`; dùng làm nguồn Summary và chống cộng hai lần.
- Have Sex tiếp tục kết thúc theo `family`, không theo số sao; không có clothing effect.

## Sắp xếp và migration 157 thẻ

- Dùng một comparator chung cho Player, Admin, export và catalog materialized:
  - Bài thường: cấp `Nhẹ nhàng → Thân mật → Nồng nhiệt` → số sao → `Truth → Dare` → `Cả hai → Nam → Nữ` → ID tự nhiên.
  - Tư thế: `orderGroup` → số sao → family → `Cả hai → Nam → Nữ` → ID tự nhiên.
  - Thẻ custom chen đúng metadata, không bị gom xuống cuối.
- Giữ nguyên toàn bộ ID, nội dung, hint, icon, ảnh và 21 lá Have Sex. Chỉ sửa metadata 23 Tư thế thường:

  - Cả hai: `pos-handjob-female→1★/other`, `custom-1787230294200→2★/handjob`, `pos-oral-male→7★/oral`, `pos-close-embrace-2→8★/oral`, `pos-connection-1→9★/oral`.
  - Nam thực hiện: `pos-oral-female→3★/oral`, `pos-guided-touch-4→4★/oral`, `pos-blowjob-male→4★/other`, `pos-blowjob-female→5★/oral`, `custom-1787207987099→5★/oral`, `pos-blowjob-both→6★/oral`, `custom-1787214401588→6★/oral`.
  - Nữ thực hiện: `custom-1787209509884→3★/blowjob`, `pos-oral-both→4★/handjob`, `custom-1787224227727→4★/handjob`, `custom-1787209236371→5★/handjob`, `custom-1787209789032→5★/handjob`, `custom-1787209029981→5★/blowjob`, `custom-1787209622650→6★/blowjob`, `pos-handjob-male→6★/other`, `pos-handjob-both→7★/handjob`, `custom-1787209997733→7★/blowjob`, `pos-massage-6→8★/blowjob`.

- Sau migration, cả Nam và Nữ đều có pool hợp lệ phủ đủ 1–9★; chênh lệch số lượng còn lại phản ánh số nội dung thực tế dành cho từng người, không sửa câu chữ để ép cân bằng.
- `g-d-14` giữ nguyên nội dung, đặt `timerSeconds:null` và `pass_turn`: bấm “Chuyển lượt”, mở khóa lá, không cộng sao/thân mật, không phạt.

## Gameplay và trang phục

- Trước pha Tư thế, bắt buộc cả hai bỏ hết trang phục đã chọn:
  - Mỗi món được chọn và xác nhận theo đúng thứ tự lớp.
  - Có thể hủy và kết thúc ở Tim hồng 100%.
  - Không lưu thay đổi vào outfit mặc định của ván sau.
- Selector vẫn kiểm tra trạng thái trang phục để phòng dữ liệu runtime sai.
- Sửa luồng hoàn thành chung để clothing effect của cả bài thường và Tư thế đều mở đúng dialog trước khi commit; Tư thế không nhận bonus cởi đồ.
- Đổi đồ tiếp tục nguyên tử và cho đổi khác slot. Bổ sung geometry nhận đồ riêng cho cơ thể nam khi nhận áo lót nữ; giữ slot, kiểu gốc, màu và ID, không đặt SVG nữ trực tiếp lên thân nam.
- Have Sex:
  - Từ 80–99%, kiểm tra `finalCardChance` riêng, mặc định 5%.
  - Nếu trúng, chọn trong các lá Have Sex theo trọng số số sao thực của chúng.
  - Nếu không trúng, chọn Tư thế thường 1–10★ theo đường cong.
  - 100% bắt buộc Have Sex; nếu cấu hình không còn trọng số hợp lệ, hiển thị lỗi an toàn và cho kết thúc.
  - UI hiển thị riêng “Have Sex 5%” và tỷ lệ sao của pool thường, không gắn sai 5% vào nhãn 10★.
- Lưu snapshot xác suất tại thời điểm rút; khi lá đang mở, hiển thị “Tỷ lệ lúc rút”.
- Chỉ hiện Truth/Dare nếu còn lá hợp lệ sau khi lọc level, lượt Nam/Nữ, trang phục, trọng số và ID đã dùng.
- Tách thống kê Tư thế thành `đã rút`, `đã mở nội dung`, `hoàn thành`, `bỏ qua`; chỉ hoàn thành hoặc xác nhận Have Sex mới mở khóa Bộ sưu tập.
- Giữ xác nhận đồng thuận một lần ở đầu pha Tư thế; timer từng lá vẫn mặc định 60 giây, `null` là không đếm giờ.

## Kiểm thử và rollout

- Unit test comparator, migration legacy, bảng metadata 23 lá, đủ 1–9★ cho cả hai lượt và bảo toàn nguyên văn/hash của 157 thẻ.
- Test selector tại 0/20/40/60/80/99/100%, Have Sex 5% độc lập, non-final 10★, pool thiếu sao, level tắt, trang phục sai và không có final hợp lệ.
- Test toàn bộ tổ hợp cởi/đổi đồ, preparation, áo lót nữ trên geometry nam, replacement, cancel và commit nguyên tử.
- Integration test rút → mở → timer → hoàn thành/bỏ qua/đổi bài/pass turn → effect trang phục → chuyển lượt → mở khóa; xác nhận mỗi resolution chỉ commit một lần.
- Thêm `rewards.test.ts` vào `npm test`; chạy TypeScript, toàn bộ unit/integration test, production build và browser test tại 390×844, 768×1024, 1440×900.
- Trước migration cloud, tạo backup `.todbackup.zip` và snapshot D1/R2; cập nhật catalog local và D1 trong một revision, kiểm tra vẫn đúng 157 thẻ/43 ảnh rồi thử staging trước production.

## Mặc định đã chốt

- Không thêm hoặc xóa thẻ; không sửa nội dung cũ.
- Người chơi 1 là Nam, người chơi 2 là Nữ.
- Metadata Nam/Nữ/Cả hai chỉ xác định lượt được rút; người rút là người được tính kết quả.
- Pha Tư thế chỉ bắt đầu khi cả hai hết đồ đã chọn.
- Không thêm xác nhận đồng thuận riêng cho từng lá.
- Giữ nguyên đường cong, điểm thưởng và chi phí quyền của pha Tim hồng.
- Giữ toàn bộ thay đổi chưa commit đang có trong working tree; không reset hoặc ghi đè chúng.
