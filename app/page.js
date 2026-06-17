'use client';
import { useState, useEffect, useMemo } from 'react';

const SHEET_ID = '1w9ZuQED5dRuQsjbR2UtQ5tzO0hw4YBzsHFo-g5jxcpo';

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
    .map((row, rawIdx) => ({ row, rawIdx }))
    .filter(({ row }) => row.c?.some(cell => cell?.v != null))
    .map(({ row, rawIdx }) => ({
      ...Object.fromEntries(json.table.cols.map((col, i) => {
        const cell = row.c[i];
        const label = overrideHeaders ? (overrideHeaders[i] ?? col.label) : col.label;
        const val = (col.type === 'date' || col.type === 'datetime')
          ? gvizDateStr(cell?.v, col.type)
          : (cell?.v ?? '');
        return [label, val];
      })),
      _row: rawIdx + 2,
    }));
}

function extractDate(dateStr) {
  const s = String(dateStr || '');
  const iso = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toInt(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

function dateInRange(dateStr, fromDate, toDate) {
  const d = extractDate(dateStr);
  if (!d) return false;
  return toInt(d) >= toInt(new Date(fromDate)) && toInt(d) <= toInt(new Date(toDate));
}

async function callCrud(payload) {
  const res = await fetch('/api/crud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function fetchCommonFund() {
  return fetchSheet('เงินส่วนกลาง', ['DATETIME', 'DATE', 'เงินเข้า', 'ยอดรวม', 'รายการจ่าย', 'ยอดจ่าย']);
}

function fetchMachineCash() {
  return fetchSheet('เงินหลังเครื่อง', ['Timestamp (GMT+7)', 'Date', '100 บาท', '50 บาท', '20 บาท', 'รวม', 'File URL']);
}

export default function Home() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('payment');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  function loadAll() {
    return Promise.all([
      fetchSheet('Payment'),
      fetchSheet('เงินหลังเครื่อง', ['Timestamp (GMT+7)', 'Date', '100 บาท', '50 บาท', '20 บาท', 'รวม', 'File URL']),
      fetchCommonFund(),
    ]).then(([payment, machineCash, commonFund]) => setData({ payment, machineCash, commonFund }));
  }

  useEffect(() => {
    loadAll();
    const onFocus = () => loadAll();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const paymentRows = useMemo(
    () => (data?.payment || []).filter(r => dateInRange(r['Timestamp (GMT+7)'], fromDate, toDate)),
    [data, fromDate, toDate]
  );
  const cashRows = useMemo(
    () => (data?.machineCash || []).filter(r => dateInRange(r['Date'], fromDate, toDate)),
    [data, fromDate, toDate]
  );
  const commonFundRows = useMemo(
    () => (data?.commonFund || []).filter(r => dateInRange(r['DATE'], fromDate, toDate)),
    [data, fromDate, toDate]
  );

  const totalPayment = paymentRows.reduce((s, r) => s + (parseFloat(r['Amount']) || 0), 0);
  const totalCash    = cashRows.reduce((s, r) => s + (parseFloat(r['รวม']) || 0), 0);
  const totalIn      = commonFundRows.reduce((s, r) => s + (parseFloat(r['เงินเข้า']) || 0), 0);
  const totalOut     = commonFundRows.reduce((s, r) => s + (parseFloat(r['ยอดจ่าย']) || 0), 0);
  const balance      = (data?.commonFund || []).reduce((s, r) => s + (parseFloat(r['ยอดรวม']) || 0), 0);

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function openAdd() {
    setModal({ sheet: 'commonFund', mode: 'add', row: null,
      form: { date: todayStr(), moneyIn: '', description: '', moneyOut: '' } });
  }

  function openEdit(r) {
    setModal({ sheet: 'commonFund', mode: 'edit', row: r._row,
      form: {
        date: String(r['DATE'] || '').replace(/\//g, '-').substring(0, 10),
        moneyIn: String(r['เงินเข้า'] || ''),
        description: String(r['รายการจ่าย'] || ''),
        moneyOut: String(r['ยอดจ่าย'] || ''),
      } });
  }

  function openMachineAdd() {
    setModal({ sheet: 'machineCash', mode: 'add', row: null,
      form: { date: todayStr(), hundred: '', fifty: '', twenty: '' } });
  }

  function openMachineEdit(r) {
    setModal({ sheet: 'machineCash', mode: 'edit', row: r._row,
      form: {
        date: String(r['Date'] || '').replace(/\//g, '-').substring(0, 10),
        hundred: String(r['100 บาท'] || ''),
        fifty: String(r['50 บาท'] || ''),
        twenty: String(r['20 บาท'] || ''),
      } });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { mode, row, form, sheet } = modal;
      let payload;
      if (sheet === 'machineCash') {
        payload = { action: mode === 'add' ? 'add' : 'edit', sheet: 'machineCash',
          date: form.date, hundred: form.hundred, fifty: form.fifty, twenty: form.twenty,
          ...(mode === 'edit' && { row }) };
      } else {
        payload = { action: mode === 'add' ? 'add' : 'edit',
          date: form.date, moneyIn: form.moneyIn, description: form.description, moneyOut: form.moneyOut,
          ...(mode === 'edit' && { row }) };
      }
      const result = await callCrud(payload);
      if (result.error) { alert('เกิดข้อผิดพลาด: ' + result.error + (result.detail ? '\n\n' + result.detail : '')); return; }
      if (sheet === 'machineCash') {
        setData(d => ({ ...d, machineCash: null }));
        const updated = await fetchMachineCash();
        setData(d => ({ ...d, machineCash: updated }));
      } else {
        const updated = await fetchCommonFund();
        setData(d => ({ ...d, commonFund: updated }));
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r, sheet) {
    if (!confirm('ลบรายการนี้?')) return;
    const payload = sheet === 'machineCash'
      ? { action: 'delete', sheet: 'machineCash', row: r._row }
      : { action: 'delete', row: r._row };
    const result = await callCrud(payload);
    if (result.error) { alert('เกิดข้อผิดพลาด: ' + result.error); return; }
    if (sheet === 'machineCash') {
      const updated = await fetchMachineCash();
      setData(d => ({ ...d, machineCash: updated }));
    } else {
      const updated = await fetchCommonFund();
      setData(d => ({ ...d, commonFund: updated }));
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h2 className="text-base font-bold text-gray-800 mb-4">
              {modal.mode === 'add' ? 'เพิ่มรายการ' : 'แก้ไขรายการ'}
            </h2>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">วันที่</span>
                <input type="date" value={modal.form.date}
                  onChange={e => setModal(m => ({ ...m, form: { ...m.form, date: e.target.value } }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </label>
              {modal.sheet === 'machineCash' ? (
                <>
                  {[['hundred','100 บาท (฿)'],['fifty','50 บาท (฿)'],['twenty','20 บาท (฿)']].map(([key, label]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">{label}</span>
                      <input type="number" min="0" value={modal.form[key] || ''} placeholder="0"
                        onChange={e => setModal(m => ({ ...m, form: { ...m.form, [key]: e.target.value } }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </label>
                  ))}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">รวม (คำนวณอัตโนมัติ)</span>
                    <p className="text-sm font-bold px-3 py-2 bg-gray-50 rounded-lg text-purple-600">
                      {((parseFloat(modal.form.hundred)||0)+(parseFloat(modal.form.fifty)||0)+(parseFloat(modal.form.twenty)||0))
                        .toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">เงินเข้า (฿)</span>
                    <input type="number" min="0" value={modal.form.moneyIn} placeholder="0"
                      onChange={e => setModal(m => ({ ...m, form: { ...m.form, moneyIn: e.target.value } }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">รายการจ่าย</span>
                    <input type="text" value={modal.form.description} placeholder="—"
                      onChange={e => setModal(m => ({ ...m, form: { ...m.form, description: e.target.value } }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">ยอดจ่าย (฿)</span>
                    <input type="number" min="0" value={modal.form.moneyOut} placeholder="0"
                      onChange={e => setModal(m => ({ ...m, form: { ...m.form, moneyOut: e.target.value } }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </label>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">ยอดรวม (คำนวณอัตโนมัติ)</span>
                    <p className={`text-sm font-bold px-3 py-2 bg-gray-50 rounded-lg ${
                      (parseFloat(modal.form.moneyIn)||0)-(parseFloat(modal.form.moneyOut)||0) >= 0
                        ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {((parseFloat(modal.form.moneyIn)||0)-(parseFloat(modal.form.moneyOut)||0))
                        .toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2 rounded-xl text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="logo" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <h1 className="text-base font-bold text-gray-800">สนุกซักฉะเชิงเทรา</h1>
            <p className="text-gray-400 text-xs">ระบบรายงานการเงิน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={e => setFromDate(e.target.value)}
            className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-gray-400 text-sm shrink-0">–</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={e => setToDate(e.target.value)}
            className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[['payment', '💳 สลิปโอนเงิน'], ['cash', '💵 เงินหลังเครื่อง'], ['common', '🏦 เงินส่วนกลาง']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-2 px-2 rounded-xl text-sm font-medium text-center leading-tight transition-colors ${
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
          {tab === 'cash'    && <CashTable rows={cashRows} onAdd={openMachineAdd} onEdit={openMachineEdit} onDelete={r => handleDelete(r, 'machineCash')} />}
          {tab === 'common'  && <CommonFundTable rows={commonFundRows} onAdd={openAdd} onEdit={openEdit} onDelete={r => handleDelete(r, 'commonFund')} />}
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
    <>
      <div className="divide-y divide-gray-100 sm:hidden">
        {rows.map((r, i) => (
          <div key={i} className="px-4 py-3 flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{r['Date']} · {r['Time']}</p>
              <p className="text-sm font-medium text-gray-800 truncate">{r['Bank Name']}</p>
              <p className="text-xs text-gray-400 truncate">{r['Receiver Name']}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-green-600 whitespace-nowrap">
                {parseFloat(r['Amount'] || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                r['Type'] === 'bill_payment' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {r['Type'] === 'bill_payment' ? 'จ่ายบิล' : 'โอนเงิน'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto">
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
    </>
  );
}

function CashTable({ rows, onAdd, onEdit, onDelete }) {
  return (
    <>
      <div className="px-4 py-3 border-b flex justify-end">
        <button onClick={onAdd}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          + เพิ่มรายการ
        </button>
      </div>
      {!rows.length ? <Empty /> : (
        <>
          <div className="divide-y divide-gray-100 sm:hidden">
            {rows.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500">{r['Date']}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-purple-600 whitespace-nowrap">
                      {parseFloat(r['รวม'] || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </p>
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      100฿ {Number(r['100 บาท']||0).toLocaleString()} · 50฿ {Number(r['50 บาท']||0).toLocaleString()} · 20฿ {Number(r['20 บาท']||0).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => onEdit(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors">✏</button>
                  <button onClick={() => onDelete(r)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">🗑</button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-400 text-xs">
                <tr>
                  {['วันที่', '100 บาท', '50 บาท', '20 บาท', 'รวม (฿)', ''].map(h => (
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
                    <td className="px-2 py-3 whitespace-nowrap">
                      <button onClick={() => onEdit(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="แก้ไข">✏</button>
                      <button onClick={() => onDelete(r)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="ลบ">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function CommonFundTable({ rows, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div className="px-4 py-3 border-b flex justify-end">
        <button onClick={onAdd}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          + เพิ่มรายการ
        </button>
      </div>
      {!rows.length ? <Empty /> : (() => {
        const periodTotal = rows.reduce((s, r) => s + (parseFloat(r['ยอดรวม']) || 0), 0);
        return (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {rows.map((r, i) => {
                const net = parseFloat(r['ยอดรวม'] || 0);
                return (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{r['DATE']}</p>
                      <p className="text-sm text-gray-700 truncate">{r['รายการจ่าย'] || '—'}</p>
                      {parseFloat(r['เงินเข้า'] || 0) > 0 && (
                        <p className="text-xs text-emerald-600">รับเข้า {parseFloat(r['เงินเข้า']).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                      )}
                      {parseFloat(r['ยอดจ่าย'] || 0) > 0 && (
                        <p className="text-xs text-red-400">จ่าย {parseFloat(r['ยอดจ่าย']).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <p className={`text-sm font-bold whitespace-nowrap ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {net.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                      </p>
                      <button onClick={() => onEdit(r)} className="p-1.5 text-gray-400 hover:text-indigo-600">✏</button>
                      <button onClick={() => onDelete(r)} className="p-1.5 text-gray-400 hover:text-red-500">🗑</button>
                    </div>
                  </div>
                );
              })}
              <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">รวมเดือนนี้</span>
                <span className={`text-sm font-bold whitespace-nowrap ${periodTotal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {periodTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                </span>
              </div>
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 text-xs">
                  <tr>
                    {['วันที่', 'เงินเข้า (฿)', 'รายการจ่าย', 'ยอดจ่าย (฿)', 'ยอดรวม (฿)', ''].map(h => (
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
                        <td className="px-2 py-3 whitespace-nowrap">
                          <button onClick={() => onEdit(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="แก้ไข">✏</button>
                          <button onClick={() => onDelete(r)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="ลบ">🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-gray-500 text-xs font-medium" colSpan={4}>รวมเดือนนี้</td>
                    <td className={`px-4 py-3 font-bold whitespace-nowrap ${periodTotal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {periodTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}

function Empty() {
  return <p className="text-center text-gray-300 py-16 text-sm">ไม่มีข้อมูลในเดือนนี้</p>;
}
