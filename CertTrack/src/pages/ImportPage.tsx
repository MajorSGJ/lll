import { useState, useRef } from 'react'
import { api } from '../api'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from 'lucide-react'

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''))
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  })
}

const EMP_TEMPLATE = `first_name;last_name;position;department;email;phone;hire_date
Jan;Kowalski;Spawacz;Hala 1;jan@firma.pl;600100200;2020-01-15
Anna;Nowak;Operator CNC;Produkcja;anna@firma.pl;600100201;2021-03-01`

const CERT_TEMPLATE = `employee_name;category_name;cert_number;issued_date;expiry_date;issuer;notes
Jan Kowalski;Uprawnienia spawalnicze;EN-9606/2024/001;2024-01-15;2026-01-15;UDT;
Anna Nowak;Szkolenie BHP;BHP/2024/055;2024-06-01;2025-06-01;BHP Expert;`

function downloadTemplate(content: string, filename: string) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function ImportPage() {
  const [mode, setMode] = useState<'employees' | 'certificates'>('employees')
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<{ imported: number; errors: string[]; total: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCSV(reader.result as string)
      setPreview(rows)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    if (preview.length === 0) return
    setBusy(true)
    try {
      const res = mode === 'employees'
        ? await api.importEmployees(preview)
        : await api.importCertificates(preview)
      setResult(res)
      setPreview([])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd importu')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const headers = preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import danych (CSV)</h1>
        <p className="text-sm text-slate-500 mt-1">Masowe dodawanie pracowników i uprawnień z pliku CSV</p>
      </div>

      {/* Mode switch */}
      <div className="flex gap-2">
        <button onClick={() => { setMode('employees'); setPreview([]); setResult(null) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'employees' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
          Pracownicy
        </button>
        <button onClick={() => { setMode('certificates'); setPreview([]); setResult(null) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'certificates' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
          Uprawnienia
        </button>
      </div>

      {/* Template download */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Szablon CSV
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          {mode === 'employees'
            ? 'Kolumny: first_name, last_name, position, department, email, phone, hire_date'
            : 'Kolumny: employee_name (imię nazwisko), category_name (dokładna nazwa kategorii), cert_number, issued_date (RRRR-MM-DD), expiry_date, issuer, notes'}
        </p>
        <button onClick={() => downloadTemplate(mode === 'employees' ? EMP_TEMPLATE : CERT_TEMPLATE, `szablon-${mode}.csv`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">
          <Download className="w-3.5 h-3.5" /> Pobierz szablon
        </button>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Wczytaj plik CSV
        </h2>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer" />
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Podgląd ({preview.length} wierszy)</h2>
            <button onClick={handleImport} disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              <Upload className="w-4 h-4" /> {busy ? 'Importowanie...' : `Importuj ${preview.length} rekordów`}
            </button>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {headers.map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-600 border-b">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {headers.map(h => <td key={h} className="px-2 py-1.5 text-slate-700">{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && <div className="text-xs text-slate-400 mt-2 text-center">...i {preview.length - 50} więcej</div>}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-5 ${result.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.errors.length > 0
              ? <AlertTriangle className="w-5 h-5 text-yellow-600" />
              : <CheckCircle className="w-5 h-5 text-green-600" />}
            <span className="font-semibold text-sm">
              Zaimportowano {result.imported} z {result.total} rekordów
            </span>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{err}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
