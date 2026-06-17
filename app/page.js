'use client';
import { useState, useEffect, useMemo } from 'react';

const SHEET_ID = '1w9ZuQED5dRuQsjbR2UtQ5tzO0hw4YBzsHFo-g5jxcpo';

// gviz raw date value looks like "Date(2026,5,17)" or "Date(2026,5,17,10,30,0)"
// month is zero-indexed → add 1; reformat to "YYYY/MM/DD HH:MM"
function gvizDateStr(v, type) {
  const m = String(v ?? '').match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+))?/);
  if (!m) return '';
  const y = m[1], mo = String(+m[2] + 1).padStart(2, '0'), d = String(+m[3]).padStart(2, '0');
  if (type === 'datetime' && m[4] != null)
    return `${y}/${mo}/${d} ${String(+m[4]).padStart(2,'0')}:${String(+m[5]).padStart(2,'0')}`;
  return `${y}/${mo}/${d}`;
}

async function fetchSheet(sheetName, overrideHeaders = null) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!match) throw new Error('gviz parse failed');
  const json = JSON.parse(match[1]);
  if (!json.table?.cols?.length) return [];
  return (json.table.rows || [])
    .filter(row => row.c?.some(cell => cell?.v != null))
    .map(row =>
      Object.fromEntries(json.table.cols.map((col, i) => {
        const cell = row.c[i];
        const label = overrideHeaders ? (overrideHeaders[i] ?? col.label) : col.label;
        const val = (col.type === 'date' || col.type === 'datetime')
          ? gvizDateStr(cell?.v, col.type)
          : (cell?.v ?? '');
        return [label, val];
      }))
    );
}

// Returns [year, month] from various date string formats
function extractYM(dateStr) {
  const s = String(dateStr || '');
  const iso = s.match(/^(\d{4})[\/\-](\d{2})/);
  if (iso) return [+iso[1], +iso[2]];
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return [+dmy[3], +dmy[2]];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return [d.getFullYear(), d.getMonth() + 1];
  return null;
}

function dateInRange(dateStr, fromMonth, toMonth) {
  const ym = extractYM(dateStr);
  if (!ym) return false;
  const [fy, fm] = fromMonth.split('-').map(Number);
  const [ty, tm] = toMonth.split('-').map(Number);
  const v = ym[0] * 100 + ym[1];
  return v >= fy * 100 + fm && v <= ty * 100 + tm;
}

export default function Home() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('payment');
  const [fromMonth, setFromMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [toMonth, setToMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    Promise.all([
      fetchSheet('Payment'),
      fetchSheet('เงินหลังเครื่อง', ['Timestamp (GMT+7)', 'Date', '100 บาท', '50 บาท', '20 บาท', 'รวม', 'File URL']),
      fetchSheet('เงินส่วนกลาง', ['DATETIME', 'DATE', 'เงินเข้า', 'ยอดรวม', 'รายการจ่าย', 'ยอดจ่าย']),
    ]).then(([payment, machineCash, commonFund]) => setData({ payment, machineCash, commonFund }));
  }, []);

  const paymentRows = useMemo(
    () => (data?.payment || []).filter(r => dateInRange(r['Timestamp (GMT+7)'], fromMonth, toMonth)),
    [data, fromMonth, toMonth]
  );
  const cashRows = useMemo(
    () => (data?.machineCash || []).filter(r => dateInRange(r['Date'], fromMonth, toMonth)),
    [data, fromMonth, toMonth]
  );
  const commonFundRows = useMemo(
    () => (data?.commonFund || []).filter(r => dateInRange(r['DATE'], fromMonth, toMonth)),
    [data, fromMonth, toMonth]
  );

  const totalPayment = paymentRows.reduce((s, r) => s + (parseFloat(r['Amount']) || 0), 0);
  const totalCash    = cashRows.reduce((s, r) => s + (parseFloat(r['รวม']) || 0), 0);
  const totalIn      = commonFundRows.reduce((s, r) => s + (parseFloat(r['เงินเข้า']) || 0), 0);
  const totalOut     = commonFundRows.reduce((s, r) => s + (parseFloat(r['ยอดจ่าย']) || 0), 0);
  const balance      = (data?.commonFund || []).reduce((s, r) => s + (parseFloat(r['ยอดรวม']) || 0), 0);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="logo" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <h1 className="text-base font-bold text-gray-800">สนุกซักฉะเชิงเทรา</h1>
            <p className="text-gray-400 text-xs">ระบบรายงานการเงิน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={fromMonth}
            max={toMonth}
            onChange={e => setFromMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="month"
            value={toMonth}
            min={fromMonth}
            onChange={e => setToMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label={`💳 สลิปโอนเงิน · ${paymentRows.length} รายการ`}
            value={totalPayment.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' ฿'}
            color="text-green-600"
          />
          <StatCard
            label={`💵 เงินหลังเครื่อง · ${cashRows.length} รายการ`}
            value={totalCash.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' ฿'}
            color="text-purple-600"
          />
          <StatCard
            label={`🏦 เงินส่วนกลาง · คงเหลือทั้งหมด`}
            value={balance.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' ฿'}
            color={balance >= 0 ? 'text-emerald-600' : 'text-red-500'}
            sub={`รับเข้า ${totalIn.toLocaleString('th-TH')} · จ่ายออก ${totalOut.toLocaleString('th-TH')}`}
          />
        </div>

        <div className="flex gap-2 mb-4">
          {[['payment', '💳 สลิปโอนเงิน'], ['cash', '💵 เงินหลังเครื่อง'], ['common', '🏦 เงินส่วนกลาง']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {tab === 'payment' && <PaymentTable rows={paymentRows} />}
          {tab === 'cash'    && <CashTable rows={cashRows} />}
          {tab === 'common'  && <CommonFundTable rows={commonFundRows} />}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function PaymentTable({ rows }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-400 text-xs">
          <tr>
            {['วันที่', 'เวลา', 'ธนาคาร', 'ผู้รับ', 'จำนวน (฿)', 'ประเภท', 'บันทึก'].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r['Date']}</td>
              <td className="px-4 py-3 text-gray-500">{r['Time']}</td>
              <td className="px-4 py-3 font-medium">{r['Bank Name']}</td>
              <td className="px-4 py-3">{r['Receiver Name']}</td>
              <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">
                {parseFloat(r['Amount'] || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r['Type'] === 'bill_payment' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {r['Type'] === 'bill_payment' ? 'จ่ายบิล' : 'โอนเงิน'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">{r['Note']}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashTable({ rows }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-400 text-xs">
          <tr>
            {['วันที่', '100 บาท', '50 บาท', '20 บาท', 'รวม (฿)'].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r['Date']}</td>
              <td className="px-4 py-3">{Number(r['100 บาท'] || 0).toLocaleString('th-TH')}</td>
              <td className="px-4 py-3">{Number(r['50 บาท'] || 0).toLocaleString('th-TH')}</td>
              <td className="px-4 py-3">{Number(r['20 บาท'] || 0).toLocaleString('th-TH')}</td>
              <td className="px-4 py-3 font-semibold text-purple-600 whitespace-nowrap">
                {parseFloat(r['รวม'] || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommonFundTable({ rows }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-400 text-xs">
          <tr>
            {['วันที่', 'เงินเข้า (฿)', 'รายการจ่าย', 'ยอดจ่าย (฿)', 'ยอดรวม (฿)'].map(h => (
              <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => {
            const net = parseFloat(r['ยอดรวม'] || 0);
            return (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r['DATE']}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600 whitespace-nowrap">
                  {parseFloat(r['เงินเข้า'] || 0) > 0
                    ? parseFloat(r['เงินเข้า']).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">{r['รายการจ่าย'] || '—'}</td>
                <td className="px-4 py-3 font-semibold text-red-500 whitespace-nowrap">
                  {parseFloat(r['ยอดจ่าย'] || 0) > 0
                    ? parseFloat(r['ยอดจ่าย']).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                    : '—'}
                </td>
                <td className={`px-4 py-3 font-bold whitespace-nowrap ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {net.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
          <tr>
            <td className="px-4 py-3 text-gray-500 text-xs font-medium" colSpan={4}>รวมเดือนนี้</td>
            <td className={`px-4 py-3 font-bold whitespace-nowrap ${
              rows.reduce((s, r) => s + (parseFloat(r['ยอดรวม']) || 0), 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {rows.reduce((s, r) => s + (parseFloat(r['ยอดรวม']) || 0), 0)
                .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Empty() {
  return <p className="text-center text-gray-300 py-16 text-sm">ไม่มีข้อมูลในเดือนนี้</p>;
}
