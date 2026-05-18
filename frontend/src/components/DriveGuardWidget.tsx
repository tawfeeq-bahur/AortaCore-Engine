import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HardDrive, Zap, X, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────

type AlertLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

interface DriveStatus {
  percentUsed: number;
  percentFree: number;
  alertLevel: AlertLevel;
  isEmergency: boolean;
  formattedFree: string;
  formattedUsed: string;
}

// ── alert level visual config ────────────────────────────────────────────────

const LEVEL = {
  GREEN:  { dot: '#34d399', bar: '#10b981', border: 'rgba(52,211,153,0.35)',  bg: 'rgba(16,185,129,0.06)',  label: 'Healthy',  textColor: '#34d399' },
  YELLOW: { dot: '#fbbf24', bar: '#f59e0b', border: 'rgba(251,191,36,0.35)',  bg: 'rgba(245,158,11,0.06)',  label: 'Monitor',  textColor: '#fbbf24' },
  ORANGE: { dot: '#fb923c', bar: '#f97316', border: 'rgba(249,115,22,0.4)',   bg: 'rgba(249,115,22,0.07)',  label: 'Warning',  textColor: '#fb923c' },
  RED:    { dot: '#f87171', bar: '#ef4444', border: 'rgba(239,68,68,0.55)',   bg: 'rgba(239,68,68,0.09)',   label: 'Critical', textColor: '#f87171' },
};

const SPARKLINE_POINTS = 24; // number of history ticks

// ── sparkline SVG ─────────────────────────────────────────────────────────────

function Sparkline({ history, color }: { history: number[]; color: string }) {
  const w = 120, h = 32;
  if (history.length < 2) return <svg width={w} height={h} />;

  const max = Math.max(...history, 1);
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const area = `M${pts.join('L')} L${w},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {/* area fill */}
      <path d={area} fill={color} opacity={0.15} />
      {/* line */}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* last dot */}
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]}
        r={2.5} fill={color} />
    </svg>
  );
}

// ── confirmation modal ────────────────────────────────────────────────────────

function ConfirmModal({
  onConfirm, onCancel, loading
}: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 16,
          padding: '28px 32px',
          width: 360,
          boxShadow: '0 0 40px rgba(239,68,68,0.25), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid rgba(239,68,68,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Zap size={22} color="#f87171" />
          </motion.div>
        </div>

        {/* text */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#f1f1f1', marginBottom: 8, letterSpacing: 1 }}>
            ACTIVATE KILLSWITCH?
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            This will <span style={{ color: '#f87171', fontWeight: 600 }}>suspend all non-critical processes</span> consuming C: drive space.
            <br />System processes are always protected.
          </div>
        </div>

        {/* buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', letterSpacing: 1,
            }}
          >
            CANCEL
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: loading ? 'rgba(239,68,68,0.4)' : '#dc2626',
              border: '1px solid rgba(239,68,68,0.5)',
              color: '#fff', fontFamily: 'monospace', fontSize: 12,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              boxShadow: '0 0 16px rgba(239,68,68,0.4)',
            }}
          >
            {loading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
            {loading ? 'KILLING...' : 'KILL IT'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── resume modal ──────────────────────────────────────────────────────────────

function ResumeModal({
  count, onConfirm, onCancel, loading
}: { count: number; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(52,211,153,0.4)',
          borderRadius: 16, padding: '28px 32px', width: 360,
          boxShadow: '0 0 40px rgba(52,211,153,0.2), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(52,211,153,0.12)',
            border: '2px solid rgba(52,211,153,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle size={22} color="#34d399" />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#f1f1f1', marginBottom: 8, letterSpacing: 1 }}>
            RESUME PROCESSES?
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>{count} suspended process{count !== 1 ? 'es' : ''}</span> will
            be resumed and return to normal operation.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', letterSpacing: 1,
            }}
          >
            CANCEL
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: '#059669', border: '1px solid rgba(52,211,153,0.5)',
              color: '#fff', fontFamily: 'monospace', fontSize: 12,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            {loading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
            {loading ? 'RESUMING...' : 'RESUME ALL'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── main widget ───────────────────────────────────────────────────────────────

export default function DriveGuardWidget() {
  const [drive, setDrive]           = useState<DriveStatus | null>(null);
  const [ksActive, setKsActive]     = useState(false);
  const [suspended, setSuspended]   = useState(0);
  const [history, setHistory]       = useState<number[]>(Array(SPARKLINE_POINTS).fill(0));
  const [modal, setModal]           = useState<'kill' | 'resume' | null>(null);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer                  = useRef<ReturnType<typeof setTimeout>>();

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [dRes, kRes] = await Promise.all([
        fetch('http://localhost:8080/api/system/cdrive-status'),
        fetch('http://localhost:8080/api/emergency/status'),
      ]);
      if (dRes.ok) {
        const d: DriveStatus = await dRes.json();
        setDrive(d);
        setHistory(prev => [...prev.slice(1), d.percentUsed]);
      }
      if (kRes.ok) {
        const k = await kRes.json();
        setKsActive(k.active ?? false);
        setSuspended(k.suspendedCount ?? 0);
      }
    } catch { /* backend offline — widget stays quiet */ }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 4000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── actions ───────────────────────────────────────────────────────────────

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const handleKill = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/emergency/killswitch', { method: 'POST' });
      const data = await res.json();
      setKsActive(true);
      setSuspended(data.processesActedOn ?? 0);
      showToast(`✓ ${data.processesActedOn ?? 0} processes suspended`, true);
    } catch {
      showToast('✗ Backend unreachable', false);
    }
    setLoading(false);
    setModal(null);
    await fetchAll();
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/emergency/killswitch/deactivate', { method: 'POST' });
      const data = await res.json();
      setKsActive(false);
      setSuspended(0);
      showToast(`✓ ${data.processesResumed ?? 0} processes resumed`, true);
    } catch {
      showToast('✗ Backend unreachable', false);
    }
    setLoading(false);
    setModal(null);
    await fetchAll();
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const pct   = drive?.percentUsed ?? 0;
  const lvl   = drive?.alertLevel  ?? 'GREEN';
  const cfg   = LEVEL[lvl];
  const isRed = lvl === 'RED' || lvl === 'ORANGE';

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── confirmation modals ── */}
      <AnimatePresence>
        {modal === 'kill'   && <ConfirmModal onConfirm={handleKill}   onCancel={() => setModal(null)} loading={loading} />}
        {modal === 'resume' && <ResumeModal  count={suspended} onConfirm={handleResume} onCancel={() => setModal(null)} loading={loading} />}
      </AnimatePresence>

      {/* ── toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            style={{
              position: 'fixed', bottom: 148, right: 20, zIndex: 9998,
              background: toast.ok ? 'rgba(5,150,105,0.95)' : 'rgba(185,28,28,0.95)',
              color: '#fff', fontFamily: 'monospace', fontSize: 11,
              padding: '8px 14px', borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              fontWeight: 600, letterSpacing: 0.5,
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── the widget card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{
          opacity: 1, scale: 1, y: 0,
          boxShadow: isRed
            ? ['0 0 0px rgba(239,68,68,0)', '0 0 22px rgba(239,68,68,0.5)', '0 0 0px rgba(239,68,68,0)']
            : `0 8px 32px rgba(0,0,0,0.18)`,
        }}
        transition={{
          opacity: { duration: 0.3 },
          scale:   { duration: 0.3 },
          boxShadow: isRed ? { duration: 2, repeat: Infinity } : { duration: 0.3 }
        }}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9997,
          width: 208,
          background: 'rgba(20,20,20,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1.5px solid ${cfg.border}`,
          borderRadius: 14,
          padding: '12px 14px',
          userSelect: 'none',
        }}
      >
        {/* ── header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <motion.div
            animate={isRed ? { rotate: [0, -8, 8, 0] } : {}}
            transition={{ duration: 0.5, repeat: isRed ? Infinity : 0, repeatDelay: 1.5 }}
          >
            <HardDrive size={13} color={cfg.dot} />
          </motion.div>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: cfg.textColor, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            C: Drive
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* live dot */}
            <motion.div
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }}
            />
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 }}>
              {cfg.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── sparkline graph ── */}
        <div style={{ marginBottom: 8, position: 'relative' }}>
          <Sparkline history={history} color={cfg.bar} />
          {/* overlapping % label */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            fontFamily: 'monospace', fontSize: 18, fontWeight: 800,
            color: cfg.textColor, lineHeight: 1,
            textShadow: `0 0 12px ${cfg.bar}`,
          }}>
            {pct.toFixed(0)}<span style={{ fontSize: 10, opacity: 0.6 }}>%</span>
          </div>
        </div>

        {/* ── mini usage bar ── */}
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.08)',
          borderRadius: 2, overflow: 'hidden', marginBottom: 8,
        }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            style={{ height: '100%', background: cfg.bar, borderRadius: 2,
              boxShadow: isRed ? `0 0 6px ${cfg.bar}` : 'none' }}
          />
        </div>

        {/* ── free space ── */}
        <div style={{
          fontFamily: 'monospace', fontSize: 9.5,
          color: 'rgba(255,255,255,0.35)', marginBottom: 10,
        }}>
          <span style={{ color: cfg.textColor, fontWeight: 600 }}>{drive?.formattedFree ?? '—'}</span>
          {' '}free · {drive?.formattedUsed ?? '—'} used
        </div>

        {/* ── killswitch button (always shown, urgency varies) ── */}
        {!ksActive ? (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setModal('kill')}
            style={{
              width: '100%', padding: '7px 0',
              background: isRed ? '#dc2626' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${isRed ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 8,
              color: isRed ? '#fff' : 'rgba(255,255,255,0.45)',
              fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: isRed ? '0 0 14px rgba(239,68,68,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {isRed
              ? <><motion.span animate={{ scale: [1,1.2,1] }} transition={{ duration: 0.7, repeat: Infinity }}><Zap size={10} /></motion.span> KILLSWITCH</>
              : <><Zap size={10} /> Killswitch</>
            }
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setModal('resume')}
            style={{
              width: '100%', padding: '7px 0',
              background: 'rgba(5,150,105,0.2)',
              border: '1px solid rgba(52,211,153,0.4)',
              borderRadius: 8, color: '#34d399',
              fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <CheckCircle size={10} />
            RESUME ({suspended})
          </motion.button>
        )}

        {/* ── active badge ── */}
        <AnimatePresence>
          {ksActive && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 7 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              style={{
                fontFamily: 'monospace', fontSize: 9,
                color: '#34d399', textAlign: 'center', letterSpacing: 0.8,
              }}
            >
              ● {suspended} process{suspended !== 1 ? 'es' : ''} suspended
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* global spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
