import React, { useState } from 'react';
import { Heart, LogIn, ShieldCheck, Users } from 'lucide-react';

interface PlayerLoginScreenProps {
  onLogin: (displayName: string) => Promise<void>;
  initialError?: string | null;
}

export const PlayerLoginScreen: React.FC<PlayerLoginScreenProps> = ({ onLogin, initialError }) => {
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || '');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = displayName.replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.length > 40) {
      setError('Nhập tên hiển thị từ 1 đến 40 ký tự.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onLogin(normalized);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Không thể đăng nhập lúc này.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#12090f] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(244,63,94,0.2),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_55%)]" />
      <section className="relative w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border border-rose-200/25 bg-rose-300/10 shadow-[0_0_55px_rgba(244,63,94,0.22)]">
          <Heart className="h-9 w-9 fill-rose-300/25 text-rose-200" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">True or Dare for Couples</p>
        <h1 className="mt-3 font-serif-romantic text-4xl font-bold leading-tight text-rose-50 sm:text-5xl">Bắt đầu hành trình</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">
          Chỉ cần một tên hiển thị. Không email, không OTP và không lưu mật khẩu.
        </p>

        <form onSubmit={submit} className="mt-8 border-y border-white/10 py-7 text-left">
          <label htmlFor="player-display-name" className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">
            Tên hiển thị
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="player-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={40}
              autoComplete="nickname"
              autoFocus
              placeholder="Ví dụ: Minh & An"
              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-white/12 bg-black/25 px-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-rose-300/55 focus:ring-2 focus:ring-rose-300/15"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-rose-400 px-5 text-sm font-bold text-[#250b14] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" /> {busy ? 'Đang vào…' : 'Vào chơi'}
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-rose-300">{error}</p>}
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Chỉ dùng để thống kê người chơi</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Ứng dụng không lưu IP người chơi</span>
        </div>
        <a
          href="/admin"
          className="mt-7 inline-flex min-h-11 items-center text-xs font-semibold text-neutral-500 underline decoration-white/15 underline-offset-4 transition-colors hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
        >
          Đăng nhập quản trị viên
        </a>
      </section>
    </main>
  );
};
