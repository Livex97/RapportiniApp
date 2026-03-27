import { useState, useRef, useCallback } from 'react';
import { FileSpreadsheet, Upload, Download, Search, X, Plus, CheckCircle, AlertCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

// Tipi
interface PandettaRow {
  [key: string]: any;
  _status: 'aperta' | 'chiusa' | 'irreparabile';
  _empty: boolean;
  _originalBg?: string | null;
}

type ViewState = 'upload' | 'table';

const COLS = [
  'RICHIESTA INTERVENTO','DATA','CLIENTE','UBICAZIONE',
  'STRUMENTO DA RIPARARE',"TIPO DI ATTIVITA'/GUASTO",
  'DDT RITIRO','DATA RITIRO','GARANZIA (G) - CONTRATTO (C)',
  'N.PREV GT','DATA PREVENTIVO','ACCETTAZIONE PREV GT','DATA ACCETTAZIONE',
  'STATO INTERVENTO','ESITO','DDT CONSEGNA','DATA CONSEGNA',
  'RAPPORTO N.','TECNICO','N.RIF PANDETTA'
];

const COL_LABELS: Record<string, string> = {
  'N.RIF PANDETTA': 'N.RIF',
  'RICHIESTA INTERVENTO': 'Richiesta',
  'DATA': 'Data',
  'CLIENTE': 'Cliente',
  'UBICAZIONE': 'Ubicazione',
  'STRUMENTO DA RIPARARE': 'Strumento',
  "TIPO DI ATTIVITA'/GUASTO": 'Guasto/Attività',
  'DDT RITIRO': 'DDT Ritiro',
  'DATA RITIRO': 'Data Ritiro',
  'GARANZIA (G) - CONTRATTO (C)': 'G/C',
  'N.PREV GT': 'N.Prev GT',
  'DATA PREVENTIVO': 'Data Prev.',
  'ACCETTAZIONE PREV GT': 'Accettazione',
  'DATA ACCETTAZIONE': 'Data Acc.',
  'STATO INTERVENTO': 'Stato Intervento',
  'ESITO': 'Esito',
  'DDT CONSEGNA': 'DDT Consegna',
  'DATA CONSEGNA': 'Data Cons.',
  'RAPPORTO N.': 'Rapporto N.',
  'TECNICO': 'Tecnico'
};

const TABLE_COLS = ['N.RIF PANDETTA', ...COLS.filter(col => col !== 'N.RIF PANDETTA')];

const TECNICO_PALETTE = [
  { name: 'MEZZAPESA',   bg: 'rgba(59,130,246,0.18)', text: '#93c5fd', export: '1e40af' },
  { name: 'ALLEGREZZA',  bg: 'rgba(167,139,250,0.22)', text: '#c4b5fd', export: '7c3aed' },
  { name: 'AMARA',       bg: 'rgba(251,191,36,0.22)', text: '#fbbf24', export: 'b45309' },
];

const DYNAMIC_COLORS = [
  { bg: 'rgba(244,114,182,0.2)', text: '#f472b6', export: 'be185d' },
  { bg: 'rgba(52,211,153,0.2)',  text: '#34d399', export: '065f46' },
  { bg: 'rgba(251,146,60,0.2)',  text: '#fb923c', export: '9a3412' },
  { bg: 'rgba(129,140,248,0.2)', text: '#818cf8', export: '3730a3' },
  { bg: 'rgba(34,211,238,0.2)',  text: '#22d3ee', export: '164e63' },
];

interface PandettaManagerProps {
  className?: string;
}

interface TecnicoColor {
  bg: string;
  text: string;
  export: string;
}

export default function PandettaManager({ className = '' }: PandettaManagerProps) {
  const [view, setView] = useState<ViewState>('upload');
  const [rows, setRows] = useState<PandettaRow[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(false);
   const [filter, setFilter] = useState<'all' | 'aperta' | 'chiusa' | 'irreparabile'>('all');
   const [searchTerm, setSearchTerm] = useState('');
   const [sortCol, setSortCol] = useState<string | null>(null);
   const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [fileName, setFileName] = useState('Pandetta_2026.xlsx');
  const [tecnicoColorMap, setTecnicoColorMap] = useState<Record<string, TecnicoColor>>({});
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Toast function
  const toast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── STATUS DETECTION ──
  const deriveStatus = useCallback((statoVal: any, esitoVal: any, rowBgRgb: string | null): 'aperta' | 'chiusa' | 'irreparabile' => {
    const stato = String(statoVal || '').trim().toUpperCase();
    const esito = String(esitoVal || '').trim().toUpperCase();

    if ((stato === 'CHIUSO' || stato === 'CHIUSA' || stato.includes('CHIUSO') || stato.includes('CHIUSA'))
        && (esito === 'POSITIVO' || esito.includes('POSITIVO'))) {
      return 'chiusa';
    }

    if (stato.includes('ANNULLAT') || stato.includes('FUORI USO')
        || stato.includes('NON RIPARABILE') || stato.includes('IRREPARABILE')
        || esito.includes('ANNULLAT') || esito.includes('FUORI USO')) {
      return 'irreparabile';
    }

    if (rowBgRgb === 'FF00B050' || rowBgRgb === '00B050') return 'chiusa';
    if (rowBgRgb === 'FFFF0000' || rowBgRgb === 'FF0000') return 'irreparabile';

    return 'aperta';
  }, []);

  // ── TECNICO COLOR MAP ──
  const buildTecnicoColorMap = useCallback((allRows: PandettaRow[]) => {
    const seen = new Map<string, {bg: string; text: string; export: string}>();
    TECNICO_PALETTE.forEach(p => seen.set(p.name, p));
    let dynIdx = 0;
    allRows.forEach(row => {
      const t = String(row['TECNICO'] || '').trim().toUpperCase();
      if (t && !seen.has(t)) {
        seen.set(t, DYNAMIC_COLORS[dynIdx % DYNAMIC_COLORS.length]);
        dynIdx++;
      }
    });
    const newMap: Record<string, {bg: string; text: string; export: string}> = {};
    seen.forEach((v, k) => { newMap[k] = v; });
    setTecnicoColorMap(newMap);
  }, []);

  const getTecnicoStyle = useCallback((name: string) => {
    if (!name) return { bg: '', text: '' };
    const key = name.trim().toUpperCase();
    const found = tecnicoColorMap[key];
    if (found) return found;
    return { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', export: '475569' };
  }, [tecnicoColorMap]);

  // ── FILE HANDLING ──
  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellStyles: true, cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        parseSheet(ws);
        setView('table');
        toast(`File caricato: ${file.name}`, 'success');
      } catch (err: any) {
        toast(`Errore nel caricamento: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const cellVal = (ws: any, r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) return null;
    if (cell.t === 'd') return formatDate(cell.v);
    if (cell.v === undefined || cell.v === null) return null;
    return String(cell.v);
  };

  const formatDate = (d: any) => {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${dt.getFullYear()}`;
  };

  const getCellRgb = (ws: any, r: number, c: number) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell || !cell.s) return null;
    const fc = cell.s.fgColor;
    if (!fc) return null;
    if (fc.rgb && typeof fc.rgb === 'string' && fc.rgb.length >= 6) return fc.rgb;
    return null;
  };

  const parseSheet = (ws: any) => {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const newRows: PandettaRow[] = [];

    for (let r = 1; r <= range.e.r; r++) {
      const row: PandettaRow = { _status: 'aperta', _empty: false };
      COLS.forEach((col, ci) => {
        row[col] = cellVal(ws, r, ci);
      });
      const rowBg = getCellRgb(ws, r, 0);
      row._originalBg = rowBg;
      row._status = deriveStatus(row['STATO INTERVENTO'], row['ESITO'], rowBg);

      const hasData = COLS.slice(0, 3).some(c => row[c] && row[c] !== 'null');
      row._empty = !hasData;
      newRows.push(row);
    }

    while (newRows.length > 0 && newRows[newRows.length - 1]._empty) newRows.pop();
    setRows(newRows);
    buildTecnicoColorMap(newRows);
  };

  const getVisibleRows = useCallback(() => {
    let visible = rows.filter(r => !r._empty);
    if (filter !== 'all') visible = visible.filter(r => r._status === filter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      visible = visible.filter(r => COLS.some(c => r[c] && String(r[c]).toLowerCase().includes(s)));
    }
    if (sortCol) {
      visible.sort((a, b) => String(a[sortCol] || '').localeCompare(String(b[sortCol] || '')) * sortDir);
    }
    return visible;
  }, [rows, filter, searchTerm, sortCol, sortDir]);

  const exportXlsx = () => {
    if (rows.length === 0) {
      toast('Nessun dato da esportare', 'error');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const ws: any = {};

      // Header row (row 0)
      const headerColors = ['FF00B050', 'FFB5A39C', 'FFC65917', 'FF3792F7', 'FFB5A39C', 'FFC65917']; // Green, Amber, Dark Blue, Cyan, Amber, Orange for groups
      const headerRgroups = [
        [0, 0], [1, 4], [5, 8], [9, 12], [13, 16], [17, 19]
      ]; // Column groups: N.RIF (0), 1-4, 5-8, 9-12, 13-16, 17-19

      // Write header cells with group colors
      COLS.forEach((col, ci) => {
        const cell: any = { t: 's', v: COL_LABELS[col] || col };
        // Determine group color
        const groupIdx = headerRgroups.findIndex(g => ci >= g[0] && ci <= g[1]);
        if (groupIdx !== -1) {
          const rgb = headerColors[groupIdx];
          cell.s = {
            fill: { fgColor: { rgb } },
            alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
            font: { sz: 10, bold: true, color: { rgb: 'FFFFFFFF' } }
          };
        }
        ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = cell;
      });

      // Data rows
      getVisibleRows().forEach((row, ri) => {
        const r = ri + 1;
        const status = row._status;
        const rowRgb = status === 'chiusa' ? 'FF00B050' : status === 'irreparabile' ? 'FFFF0000' : 'FFFFFF00'; // green, red, yellow

        COLS.forEach((col, ci) => {
          const addr = XLSX.utils.encode_cell({ r, c: ci });
          if (!ws[addr]) ws[addr] = { t: 'z', v: null };

           // Tech column (index 19)
           if (ci === 19) {
            const techName = String(row['TECNICO'] || '').trim().toUpperCase();
            const ts = tecnicoColorMap[techName] || {};
            const techRgb = ts.export ? ts.export.toUpperCase().padStart(6, '0') : rowRgb;
            (ws[addr] as any).s = {
              fill: { fgColor: { rgb: techRgb } },
              alignment: { wrapText: false, vertical: 'center', horizontal: 'center' },
              font: { sz: 10, bold: true }
            };
            ws[addr].v = row['TECNICO'] || '';
            ws[addr].t = 's';
          } else {
            // Regular cell
            const raw = row[col];
            let v: any = raw;
            let t: string = 's';
            if (raw instanceof Date) {
              v = raw.getTime(); t = 'n';
            } else if (typeof raw === 'number') {
              t = 'n';
            } else if (raw === null || raw === undefined) {
              v = ''; t = 's';
            } else {
              v = String(raw);
            }
            ws[addr].v = v;
            ws[addr].t = t;
            // row color fill for non-tech cells (IF original had color, keep it or override?)
            // We'll apply same row color pattern for visual consistency
            if (ci !== 18) {
            (ws[addr] as any).s = {
                fill: { fgColor: { rgb: rowRgb } },
                alignment: { wrapText: false, vertical: 'center', horizontal: 'center' },
                font: { sz: 10 }
              };
            }
          }
        });
      });

      // Create range and assign
      const range = { s: { c: 0, r: 0 }, e: { c: COLS.length - 1, r: getVisibleRows().length } };
      ws['!ref'] = XLSX.utils.encode_range(range);

      XLSX.utils.book_append_sheet(wb, ws, 'Pandetta');
      XLSX.writeFile(wb, `Pandetta_2026_esportata_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast('Excel esportato con successo', 'success');
    } catch (err: any) {
      toast(`Errore esportazione: ${err.message}`, 'error');
    }
  };

  // ── MODAL STATE ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<'aperta' | 'chiusa' | 'irreparabile'>('aperta');
  const [formData, setFormData] = useState<Partial<PandettaRow>>({});

  const openNewRow = () => {
    setEditingIdx(null);
    setIsNew(true);
    const nextRif = Math.max(0, ...rows.filter(r => !r._empty).map(r => parseInt(r['N.RIF PANDETTA']) || 0)) + 1;
    const emptyRow = {
      'N.RIF PANDETTA': nextRif,
      _status: 'aperta',
      _empty: false
    } as Partial<PandettaRow>;
    COLS.forEach(c => {
      if (!(c in emptyRow)) emptyRow[c] = null;
    });
    setFormData(emptyRow);
    setModalStatus('aperta');
    setModalOpen(true);
  };

  const saveRow = () => {
    const newRow: PandettaRow = {
      ...formData as Record<string, any>,
      _status: modalStatus,
      _empty: false
    };

    if (isNew) {
      setRows(prev => {
        const updated = [...prev, newRow];
        buildTecnicoColorMap(updated);
        return updated;
      });
      toast('Nuova riga aggiunta', 'success');
    } else if (editingIdx !== null) {
      setRows(prev => {
        const updated = [...prev];
        updated[editingIdx] = newRow;
        buildTecnicoColorMap(updated);
        return updated;
      });
      toast('Riga aggiornata', 'success');
    }
    setModalOpen(false);
  };

  const deleteRow = (idx: number) => {
    if (!confirm('Eliminare definitivamente questa riga?')) return;
    setRows(prev => prev.filter((_, i) => i !== idx));
    toast('Riga eliminata', 'info');
  };

  const openEdit = (idx: number) => {
    setEditingIdx(idx);
    setIsNew(false);
    const row = rows[idx];
    setFormData({ ...row });
    setModalStatus(row._status);
    setModalOpen(true);
  };

  // ── RENDER HELPERS ──
  // (helpers removed for brevity; will be re-added with table implementation)

  const stats = {
    all: rows.filter(r => !r._empty).length,
    aperta: rows.filter(r => r._status === 'aperta' && !r._empty).length,
    chiusa: rows.filter(r => r._status === 'chiusa' && !r._empty).length,
    irreparabile: rows.filter(r => r._status === 'irreparabile' && !r._empty).length,
  };

  const tecnici = [...new Set(rows.filter(r => !r._empty).map(r => (r['TECNICO'] || '').trim()).filter(Boolean))];
  const visibleRows = getVisibleRows();

  // ── UPLOAD HANDLER ──
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ── UI ──
  if (view === 'upload') {
    return (
      <div className={`min-h-[80vh] flex flex-col items-center justify-center gap-8 p-8 ${className}`}>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-semibold mb-4">
            <FileSpreadsheet className="w-4 h-4" />
            Gestione Assistenze 2026
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">Pandetta 2026</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            Carica il file Excel per iniziare a gestire le assistenze tecniche
          </p>
        </div>

        <div
          className="w-full max-w-md aspect-square max-h-96 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <Upload className="w-16 h-16 text-neutral-400" />
          <div className="text-center">
            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Clicca o trascina il file Excel
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Supporta .xlsx e .xls
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />

        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center max-w-md">
          Compatibile con il formato Pandetta_2026.xlsx • Mantiene colori e layout originali
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full gap-4 ${className}`}>
      {/* Top Bar */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg text-neutral-900 dark:text-white">Pandetta</span>
          <span className="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300">
            {fileName}
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
              {[
                { key: 'all', label: 'Tutte', color: 'text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600' },
                { key: 'aperta', label: 'Aperte', color: 'text-amber-600 border-amber-500' },
                { key: 'chiusa', label: 'Chiuse', color: 'text-emerald-600 border-emerald-500' },
                { key: 'irreparabile', label: 'Irreparabili', color: 'text-red-600 border-red-500' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors ${
                    filter === f.key
                      ? `${f.color} bg-current/10`
                      : 'text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    f.key === 'all' ? 'bg-transparent' :
                    f.key === 'aperta' ? 'bg-amber-500' :
                    f.key === 'chiusa' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  {stats[f.key as keyof typeof stats]} <span className="hidden sm:inline">{f.label}</span>
                </button>
              ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cerca cliente, strumento, stato…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setFilter('all'); }}
            className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600" />

        <button
          onClick={openNewRow}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuova riga
        </button>

        <button
          onClick={exportXlsx}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Esporta Excel
        </button>

        <div className="h-6 w-px bg-neutral-300 dark:border-neutral-600" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Tecnici:</span>
          {tecnici.map(t => {
            const style = getTecnicoStyle(t);
            return (
              <span
                key={t}
                className="px-2 py-1 text-xs font-bold rounded-full"
                style={{ background: style.bg, color: style.text, border: `1px solid ${style.text}40` }}
              >
                {t}
              </span>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-auto">
        <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-700 z-10">
              <tr>
                {TABLE_COLS.map(col => (
                  <th
                    key={col}
                  onClick={() => {
                    if (sortCol === col) {
                      setSortDir(prev => (prev === 1 ? -1 : 1));
                    } else {
                      setSortCol(col);
                      setSortDir(1);
                    }
                  }}
                  className="px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-600 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {COL_LABELS[col] || col}
                    {sortCol === col && (
                      <span className="text-blue-500">{sortDir === 1 ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-600 w-24">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={TABLE_COLS.length + 1} className="px-4 py-12 text-center text-neutral-500">
                  Nessun dato disponibile
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const realIdx = rows.findIndex(r => r === row);
                const status = row._status;
                const rowStyle = status === 'chiusa' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' :
                                 status === 'irreparabile' ? 'bg-red-50/30 dark:bg-red-900/10' :
                                 'bg-amber-50/30 dark:bg-amber-900/10';
                 return (
                   <tr key={realIdx} className={rowStyle}>
                     {TABLE_COLS.map(col => (
                       <td key={col} className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-600 align-top whitespace-nowrap">
                         {String(row[col] || '').trim()}
                       </td>
                     ))}
                    <td className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-600">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(realIdx)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                          title="Modifica"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRow(realIdx)}
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Placeholder */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <h2 className="text-2xl font-bold mb-4">{isNew ? 'Nuova assistenza' : 'Modifica assistenza'}</h2>
            <p className="text-sm text-neutral-500 mb-4">N.RIF {formData['N.RIF PANDETTA'] || '—'}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Stato assistenza</label>
              <div className="flex gap-3">
                {['aperta','chiusa','irreparabile'].map(s => (
                  <button key={s} onClick={() => setModalStatus(s as any)} className={`p-3 border-2 rounded-lg ${modalStatus === s ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-96 overflow-y-auto p-2">
              {COLS.map(col => {
                if (col === 'STATO INTERVENTO') {
                  return (
                    <div key={col}>
                      <label className="block text-xs font-semibold uppercase mb-1 text-neutral-700 dark:text-neutral-300">
                        {COL_LABELS[col] || col}
                      </label>
                      <select
                        value={formData[col] || ''}
                        onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="">Seleziona...</option>
                        {['APERTO', 'CHIUSO', 'ANNULLATO', 'FUORI USO', 'IRREPARABILE', 'NON RIPARABILE'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                } else if (col === 'ESITO') {
                  return (
                    <div key={col}>
                      <label className="block text-xs font-semibold uppercase mb-1 text-neutral-700 dark:text-neutral-300">
                        {COL_LABELS[col] || col}
                      </label>
                      <select
                        value={formData[col] || ''}
                        onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="">Seleziona...</option>
                        {['POSITIVO', 'NEGATIVO', 'ANNULLATO'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                } else if (col === 'TECNICO') {
                  return (
                    <div key={col}>
                      <label className="block text-xs font-semibold uppercase mb-1 text-neutral-700 dark:text-neutral-300">
                        {COL_LABELS[col] || col}
                      </label>
                      <input
                        list="tecnici-datalist"
                        value={formData[col] || ''}
                        onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                      <datalist id="tecnici-datalist">
                        {tecnici.map(t => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                  );
                } else {
                  return (
                    <div key={col}>
                      <label className="block text-xs font-semibold uppercase mb-1 text-neutral-700 dark:text-neutral-300">
                        {COL_LABELS[col] || col}
                      </label>
                      <input
                        type="text"
                        value={formData[col] || ''}
                        onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                  );
                }
              })}
            </div>
            <div className="flex justify-between">
              {!isNew && <button onClick={() => deleteRow(editingIdx!)} className="px-4 py-2 border border-red-500 text-red-500 rounded">Elimina</button>}
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Annulla</button>
                <button onClick={saveRow} className="px-4 py-2 bg-blue-600 text-white rounded">Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border-l-4 ${
            toastMsg.type === 'success' ? 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200' :
            toastMsg.type === 'error' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
            'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
          } transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {toastMsg.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toastMsg.type === 'info' && <Clock className="w-4 h-4" />}
            <span className="text-sm font-medium">{toastMsg.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DATE UTILS ──
// function italianToISO(d: string): string {
//   if (!d || d === '//' || d === '—') return '';
//   const m = String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
//   if (!m) return '';
//   return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
// }

// function ISOToItalian(d: string): string {
//   if (!d) return '';
//   const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
//   if (!m) return d;
//   return `${m[3]}/${m[2]}/${m[1]}`;
// }
