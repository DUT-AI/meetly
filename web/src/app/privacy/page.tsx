import Link from 'next/link';

import { Logo } from '@/components/logo';

export const metadata = {
  title: 'Chính sách quyền riêng tư - Privacy Policy | Meetly',
  description: 'Chính sách bảo mật và quyền riêng tư cho tiện ích Meetly - Audio Recorder for Google Meet',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link href="/" className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100">
            Quay lại trang chủ
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="border-b border-slate-100 pb-6">
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Chính sách bảo mật / Privacy Policy
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Meetly - Audio Recorder for Google Meet</h1>
            <p className="mt-2 text-sm text-slate-500">Cập nhật lần cuối: Ngày 19 tháng 09 năm 2026 • Last updated: September 19, 2026</p>
          </div>

          <div className="prose prose-slate max-w-none pt-6 text-sm leading-relaxed sm:text-base">
            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-900">1. Giới thiệu / Introduction</h2>
              <p>
                Tiện ích mở rộng <strong>Meetly - Audio Recorder for Google Meet</strong> do đội ngũ Meetly phát triển cam kết tôn trọng và
                bảo vệ tuyệt đối quyền riêng tư của người dùng. Chính sách này giải thích cách tiện ích xử lý dữ liệu khi bạn cài đặt và sử
                dụng.
              </p>
              <p className="italic text-slate-600">
                Meetly (&quot;we&quot;, &quot;our&quot;) is committed to protecting your privacy. This policy outlines how &quot;Meetly -
                Audio Recorder for Google Meet&quot; handles information during your usage.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-900">2. Mục đích duy nhất / Single Purpose</h2>
              <p>
                Mục đích duy nhất của tiện ích là hỗ trợ người dùng <strong>ghi âm âm thanh cuộc họp Google Meet hai chiều</strong> (âm
                thanh từ các thành viên trong cuộc họp và giọng nói qua micro của chính bạn) và lưu file âm thanh trực tiếp về máy tính cá
                nhân để phục vụ cho việc ghi chép, tóm tắt và quản lý công việc trên Meetly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-900">3. Xử lý dữ liệu cục bộ 100% / 100% Local Processing</h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Âm thanh cuộc họp & Micro:</strong> Tiện ích chỉ thu nhận âm thanh khi bạn chủ động nhấn nút &quot;Ghi âm cuộc
                  họp&quot;. Quá trình trộn luồng (Web Audio API) và nén thành định dạng <code>.webm</code> diễn ra{' '}
                  <strong>hoàn toàn trên trình duyệt tại máy tính của bạn</strong>.
                </li>
                <li>
                  <strong>Lưu file trực tiếp:</strong> Khi kết thúc, file âm thanh được tải thẳng về thư mục <code>Downloads</code> trên máy
                  tính cá nhân của bạn.
                </li>
                <li>
                  <strong>Không truyền dữ liệu ra bên ngoài:</strong> Tiện ích <strong>không gửi</strong> âm thanh cuộc họp đến bất kỳ máy
                  chủ bên thứ ba nào hoặc máy chủ theo dõi quảng cáo.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-900">4. Không thu thập dữ liệu cá nhân / No Personal Data Collection</h2>
              <p>
                Chúng tôi cam kết <strong>KHÔNG</strong> thu thập:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Họ tên, địa chỉ email, số điện thoại hoặc mã định danh cá nhân.</li>
                <li>Mật khẩu hoặc thông tin đăng nhập.</li>
                <li>Lịch sử duyệt web hoặc hoạt động của bạn trên các trang web khác ngoài Google Meet.</li>
                <li>Dữ liệu vị trí, tài chính hoặc sức khỏe.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-900">5. Quyền hạn sử dụng / Permissions Justification</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 font-semibold text-slate-700">
                      <th className="py-2">Quyền (Permission)</th>
                      <th className="py-2">Mục đích sử dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="py-2 font-mono font-medium text-slate-800">storage</td>
                      <td className="py-2">Lưu trữ các cài đặt tùy chọn của người dùng (bật/tắt micro, server URL) trên máy cục bộ.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-medium text-slate-800">activeTab</td>
                      <td className="py-2">Tương tác và chuyển hướng đến tab cuộc họp Google Meet đang hoạt động.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-medium text-slate-800">cookies</td>
                      <td className="py-2">Đọc cookie access_token để tự động xác thực phiên làm việc với hệ thống Meetly.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-medium text-slate-800">meet.google.com</td>
                      <td className="py-2">Hiển thị widget điều khiển nổi (nút bắt đầu/dừng ghi âm) trong cuộc họp Google Meet.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-medium text-slate-800">meetly.dutai.io.vn</td>
                      <td className="py-2">Kết nối API máy chủ Meetly để khởi tạo phiên phiên âm thời gian thực và đồng bộ dữ liệu.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-900">6. Tuân thủ chính sách Chrome Web Store</h2>
              <p>
                Chúng tôi tuân thủ nghiêm ngặt Chính sách dành cho nhà phát triển của Cửa hàng Chrome trực tuyến (Chrome Web Store Developer
                Program Policies):
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Không bán hoặc chuyển nhượng dữ liệu người dùng cho bất kỳ bên thứ ba nào.</li>
                <li>Không sử dụng hoặc chuyển giao dữ liệu người dùng cho các mục đích không liên quan đến chức năng chính.</li>
                <li>Không sử dụng dữ liệu để xác định khả năng thanh toán nợ hoặc phục vụ cho vay.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-900">7. Quyền của người dùng đối với dữ liệu</h2>
              <p>
                Vì toàn bộ file ghi âm được lưu trữ trực tiếp trên thiết bị của bạn, bạn nắm toàn quyền kiểm soát dữ liệu của mình. Bạn có
                thể mở nghe, sao chép hoặc xóa vĩnh viễn các file này khỏi máy tính bất cứ lúc nào.
              </p>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-bold text-slate-900">8. Thông tin liên hệ / Contact Us</h2>
              <p>Nếu bạn có bất kỳ câu hỏi nào về chính sách quyền riêng tư này, vui lòng liên hệ:</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <strong>Website:</strong>{' '}
                  <a href="https://meetly.dutai.io.vn/" className="text-indigo-600 hover:underline">
                    https://meetly.dutai.io.vn/
                  </a>
                </li>
                <li>
                  <strong>Dự án:</strong> Meetly Platform - DUT-AI
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
