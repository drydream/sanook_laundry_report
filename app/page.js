import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400% center; }
          100% { background-position:  400% center; }
        }
        @keyframes orb-a {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(40px,-30px) scale(1.12); }
          70%     { transform: translate(-25px,15px) scale(0.92); }
        }
        @keyframes orb-b {
          0%,100% { transform: translate(0,0) scale(1); }
          35%     { transform: translate(-35px,25px) scale(1.08); }
          65%     { transform: translate(20px,-15px) scale(0.9); }
        }
        @keyframes orb-c {
          0%,100% { transform: translate(0,0); }
          50%     { transform: translate(20px,20px); }
        }

        .logo-float  { animation: float 5s ease-in-out infinite; }
        .orb-a       { animation: orb-a 9s ease-in-out infinite; }
        .orb-b       { animation: orb-b 12s ease-in-out infinite; }
        .orb-c       { animation: orb-c 7s ease-in-out infinite; }

        .fade-up-0   { animation: fadeUp .7s ease-out .05s both; }
        .fade-up-1   { animation: fadeUp .7s ease-out .20s both; }
        .fade-up-2   { animation: fadeUp .7s ease-out .38s both; }
        .fade-up-3   { animation: fadeUp .7s ease-out .54s both; }
        .fade-up-4   { animation: fadeUp .7s ease-out .70s both; }

        .shimmer-btn {
          background: linear-gradient(110deg, #4f46e5 0%, #7c3aed 25%, #a78bfa 50%, #7c3aed 75%, #4f46e5 100%);
          background-size: 300% auto;
          animation: shimmer 4s linear infinite;
        }
        .dot-bg {
          background-image: radial-gradient(rgba(99,102,241,.18) 1.5px, transparent 1.5px);
          background-size: 26px 26px;
        }
        .glass {
          background: rgba(255,255,255,.05);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.10);
        }
      `}</style>

      <div className="h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center">

        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none" />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Bottom gradient for readability */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_110%,rgba(0,0,0,.5)_0%,transparent_70%)]" />

        {/* ── Content ── */}
        <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center gap-5 py-6">

          {/* Logo */}
          <div className="logo-float fade-up-0">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/50 blur-2xl scale-125 animate-pulse" />
              <img src="/logo.jpg" alt="logo"
                className="relative w-24 h-24 rounded-3xl object-cover ring-2 ring-white/20 shadow-2xl shadow-indigo-900" />
            </div>
          </div>

          {/* Hero text */}
          <div className="text-center fade-up-1">
            <span className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium px-3 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse inline-block" />
              ระบบรายงานการเงิน
            </span>
            <h1 className="text-5xl font-black text-white tracking-tight leading-none">
              สนุกซัก
            </h1>
            <p className="text-3xl font-bold mt-1"
              style={{ background: 'linear-gradient(90deg,#818cf8,#c084fc,#e879f9)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              ฉะเชิงเทรา
            </p>
          </div>

          {/* Feature pills */}
          <div className="w-full flex flex-col gap-2 fade-up-2">
            {[
              { icon: '💳', label: 'สลิปโอนเงิน',   accent: 'bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400' },
              { icon: '💵', label: 'เงินหลังเครื่อง', accent: 'bg-violet-500/10 border-violet-500/25',  dot: 'bg-violet-400'  },
              { icon: '🏦', label: 'เงินส่วนกลาง',   accent: 'bg-indigo-500/10 border-indigo-500/25',  dot: 'bg-indigo-400'  },
            ].map(({ icon, label, accent, dot }) => (
              <div key={label} className={`glass ${accent} rounded-2xl px-4 py-3 flex items-center gap-3`}>
                <span className="text-xl shrink-0">{icon}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                  <p className="text-white text-sm font-semibold">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="w-full fade-up-3">
            <Link href="/dashboard"
              className="shimmer-btn block w-full py-4 rounded-2xl text-white font-bold text-lg text-center shadow-xl shadow-indigo-950 hover:brightness-110 hover:scale-[1.02] active:scale-[.97] transition-transform">
              เข้าสู่ระบบ →
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
