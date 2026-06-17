import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo + name */}
        <div className="flex flex-col items-center gap-4">
          <div className="ring-4 ring-white/20 rounded-3xl shadow-2xl shadow-indigo-900/60">
            <img src="/logo.jpg" alt="logo" className="w-24 h-24 rounded-3xl object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">สนุกซัก</h1>
            <p className="text-indigo-300 text-lg font-medium mt-0.5">ฉะเชิงเทรา</p>
          </div>
        </div>

        {/* Glass card */}
        <div className="w-full bg-white/8 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl">
          <p className="text-white font-semibold text-center mb-1">ระบบรายงานการเงิน</p>
          <p className="text-indigo-300 text-xs text-center mb-6">ติดตามรายรับ–รายจ่ายของร้านในที่เดียว</p>

          <div className="flex flex-col gap-4">
            {[
              { icon: '💳', title: 'สลิปโอนเงิน', desc: 'บันทึกอัตโนมัติจาก LINE' },
              { icon: '💵', title: 'เงินหลังเครื่อง', desc: 'สรุปเงินสดจากตู้ซักผ้า' },
              { icon: '🏦', title: 'เงินส่วนกลาง', desc: 'จัดการกองทุนร่วมของร้าน' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-white text-sm font-medium leading-tight">{title}</p>
                  <p className="text-indigo-300 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link href="/dashboard"
          className="w-full py-4 bg-white text-indigo-900 font-bold text-base rounded-2xl shadow-xl shadow-indigo-900/40 hover:bg-indigo-50 active:scale-95 transition-all text-center block">
          เข้าสู่ระบบ →
        </Link>

        <p className="text-indigo-500 text-xs">sanook-report.vercel.app</p>
      </div>
    </div>
  );
}
