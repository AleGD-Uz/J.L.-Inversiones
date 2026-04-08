import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Delete, X, Minus, Calculator, ArrowDownToLine, History as HistoryIcon, ChevronLeft } from 'lucide-react';

const STORAGE_KEY = 'jl_calculator_state';

const formatNumber = (num) => {
    if (num === null || isNaN(num)) return '';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
};

const formatExpressionToDisplay = (expression) => {
    if (!expression) return '';
    const tokens = expression.split(/([+\-*/%√()])/);
    return tokens.map(token => {
        if (/^[0-9.]+$/.test(token)) {
            const numParts = token.split('.');
            numParts[0] = numParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return numParts.join(',');
        }
        if (token === '*') return '×';
        if (token === '/') return '÷';
        return token;
    }).join('');
};

const evaluateMath = (expression) => {
    try {
        let sanitized = expression
            .replace(/÷/g, '/')
            .replace(/×/g, '*')
            .trim();
            
        if (!sanitized) return null;

        // LÓGICA DE PORCENTAJES AVANZADA
        // 1. Caso A + B% o A - B% (ej: 101 + 15% -> 101 + (101 * 0.15))
        // Buscamos patrones de un número/paréntesis seguido de + o - y un número con %
        sanitized = sanitized.replace(/((?:\d+(?:\.\d+)?)|(?:\([^()]+\)))\s*([+-])\s*(\d+(?:\.\d+)?)\s*%/g, 
            (_, base, op, perc) => `(${base} ${op} (${base} * (${perc} / 100)))`
        );

        // 2. Caso A % B -> A * (B/100) (ej: 40%20 -> 40 * 0.20 = 8)
        sanitized = sanitized.replace(/(\d+(?:\.\d+)?)\s*%\s*(\d+(?:\.\d+)?)/g, '($1*($2/100))');

        // 3. Caso Número% solo (ej: 15% -> 0.15)
        sanitized = sanitized.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');

        // Resto de la limpieza estándar
        sanitized = sanitized
            .replace(/√\s*([0-9.]+)/g, 'Math.sqrt($1)')
            .replace(/√(?=\()/g, 'Math.sqrt')
            .replace(/[^0-9+\-*/.()%√\s]/g, '');

        let previewStr = sanitized;
        while (/[+\-*/.]$/.test(previewStr)) {
            previewStr = previewStr.slice(0, -1);
        }

        const fn = new Function('return ' + previewStr);
        const result = fn();
        
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return parseFloat(result.toFixed(6));
        }
        return null;
    } catch (e) {
        return null;
    }
};

export default function FloatingCalculator({ onApply, onClose }) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    
    const [expr, setExpr] = useState('');
    const [lastOp, setLastOp] = useState('');
    const [history, setHistory] = useState([]);

    const [pos, setPos] = useState({ x: -1, y: -1 });
    const [size, setSize] = useState({ width: 320, height: 520 });

    const calcRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.expr !== undefined) setExpr(data.expr);
                if (data.lastOp !== undefined) setLastOp(data.lastOp);
                if (data.history !== undefined) setHistory(data.history);
                if (data.pos && data.pos.x !== -1) setPos(data.pos);
                if (data.size) setSize(data.size);
            } catch (e) {
                console.error("Error parsing calc state", e);
            }
        }
        if (!saved || (JSON.parse(saved).pos && JSON.parse(saved).pos.x === -1)) {
            setPos({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 260 });
        }
    }, []);

    useEffect(() => {
        if (pos.x !== -1) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ expr, lastOp, history, pos, size }));
        }
    }, [expr, lastOp, history, pos, size]);

    const onDragStart = (e) => {
        if (e.target.closest('.no-drag')) return;
        const p = e.clientX !== undefined ? e : e.touches[0];
        const startX = p.clientX, startY = p.clientY, initX = pos.x, initY = pos.y;
        const onMove = (me) => {
            const mp = me.clientX !== undefined ? me : me.touches[0];
            setPos({ x: initX + (mp.clientX - startX), y: initY + (mp.clientY - startY) });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp);
        };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp);
    };

    const onResizeStart = (e) => {
        e.stopPropagation();
        const p = e.clientX !== undefined ? e : e.touches[0];
        const startX = p.clientX, startY = p.clientY, initW = size.width, initH = size.height;
        const onMove = (me) => {
            const mp = me.clientX !== undefined ? me : me.touches[0];
            setSize({ width: Math.max(260, initW + (mp.clientX - startX)), height: Math.max(400, initH + (mp.clientY - startY)) });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp);
        };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp);
    };

    const focusInput = () => inputRef.current?.focus();

    const sanitizeExpr = (val) => {
        let clean = val.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/.%√()]/g, '');
        clean = clean.replace(/([+\-*/.%])\1+/g, '$1');
        clean = clean.replace(/[+\-*/%]{2,}/g, (match) => match[match.length - 1]);
        return clean;
    };

    const insertAtCursor = useCallback((str) => {
        const input = inputRef.current;
        if (!input) { setExpr(prev => sanitizeExpr(prev + str)); return; }
        const start = input.selectionStart || 0, end = input.selectionEnd || 0;
        const newExpr = sanitizeExpr(expr.slice(0, start) + str + expr.slice(end));
        setExpr(newExpr);
        setTimeout(() => { input.focus(); input.setSelectionRange(start + 1, start + 1); }, 0);
    }, [expr]);

    const deleteLast = useCallback(() => {
        const input = inputRef.current;
        if (!input) { setExpr(prev => prev.slice(0, -1)); return; }
        const start = input.selectionStart || 0, end = input.selectionEnd || 0;
        if (start === end && start > 0) {
            setExpr(expr.slice(0, start - 1) + expr.slice(end));
            setTimeout(() => { input.focus(); input.setSelectionRange(start - 1, start - 1); }, 0);
        } else if (start !== end) {
            setExpr(expr.slice(0, start) + expr.slice(end));
            setTimeout(() => { input.focus(); input.setSelectionRange(start, start); }, 0);
        }
    }, [expr]);

    const handleEquals = useCallback(() => {
        const res = evaluateMath(expr);
        if (res !== null) {
            setHistory(prev => [{ id: Date.now(), expr, result: res }, ...prev].slice(0, 50));
            setLastOp(formatExpressionToDisplay(expr) + ' =');
            setExpr(String(res));
            setTimeout(() => {
                if (inputRef.current) { inputRef.current.focus(); inputRef.current.setSelectionRange(String(res).length, String(res).length); }
            }, 0);
        }
    }, [expr]);

    const liveResult = evaluateMath(expr);

    if (pos.x === -1) return null;

    if (isMinimized) {
        return (
            <button
                style={{ top: Math.max(0, pos.y), left: Math.max(0, pos.x) }}
                className="fixed z-[100] w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-slate-200 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                onClick={() => { setIsMinimized(false); setTimeout(focusInput, 100); }}
                onMouseDown={onDragStart} onTouchStart={onDragStart}
            ><Calculator size={20} className="text-yellow-600 mb-1 pointer-events-none" /></button>
        );
    }

    return (
        <div 
            ref={calcRef}
            style={{ top: Math.max(0, pos.y), left: Math.max(0, pos.x), width: size.width, height: size.height }}
            className="fixed z-[100] bg-white/95 backdrop-blur-3xl border border-slate-200 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden"
            onClick={focusInput}
        >
            <div className="flex justify-between items-center px-4 py-3 bg-slate-100/50 cursor-move border-b border-slate-200/50" onMouseDown={onDragStart} onTouchStart={onDragStart}>
                <div className="flex items-center gap-2 pointer-events-none"><Calculator size={16} className="text-yellow-600" /><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calculadora Libre</span></div>
                <div className="flex gap-2 no-drag">
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400"><Minus size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-none flex flex-col p-6 pb-2 bg-transparent justify-end">
                <div className="h-5 text-right text-slate-400 text-sm font-medium tracking-wide w-full truncate mb-1">{lastOp}</div>
                <input
                    ref={inputRef}
                    type="text"
                    value={formatExpressionToDisplay(expr)}
                    inputMode="none"
                    onChange={(e) => setExpr(sanitizeExpr(e.target.value))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleEquals(); }
                        else if (e.key === 'Escape') { setExpr(''); setLastOp(''); }
                    }}
                    placeholder="0"
                    autoFocus
                    className="w-full bg-transparent text-right text-slate-800 text-4xl md:text-5xl font-light tracking-tight outline-none no-drag"
                />
                <div className={`h-8 mt-1 text-right transition-opacity duration-200 ${liveResult !== null && String(liveResult) !== expr.trim() ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-slate-400 text-2xl font-medium tracking-tight">= {formatNumber(liveResult)}</span>
                </div>
            </div>

            <div className="px-5 pb-4 flex justify-between bg-transparent no-drag border-b border-slate-100 mb-2 gap-2">
                <button onClick={(e) => { e.stopPropagation(); setShowHistory(!showHistory); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${showHistory ? 'bg-yellow-100 text-yellow-700 border-yellow-200 shadow-inner' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200 shadow-sm'}`}><HistoryIcon size={14} /> Historial</button>
                <button onClick={(e) => { e.stopPropagation(); const final = evaluateMath(expr) ?? Number(expr); if (!isNaN(final)) onApply(final); }} className="flex bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider items-center gap-1.5 shadow-sm active:scale-95 transition-all"><ArrowDownToLine size={14} /> Aplicar</button>
            </div>

            {showHistory ? (
                <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2 no-drag custom-scrollbar bg-slate-50/30">
                    <button onClick={(e) => { e.stopPropagation(); setShowHistory(false); }} className="mb-2 text-slate-500 flex items-center gap-1 text-xs font-bold uppercase hover:text-slate-800 w-full py-2"><ChevronLeft size={16} /> Volver</button>
                    {history.length === 0 ? <p className="text-center text-slate-400 mt-10 text-sm italic">No hay cálculos recientes</p> : history.map(item => (
                        <button key={item.id} onClick={(e) => { e.stopPropagation(); setExpr(String(item.result)); setLastOp(formatExpressionToDisplay(item.expr) + ' ='); setShowHistory(false); setTimeout(focusInput, 50); }} className="w-full text-right p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-yellow-400 hover:shadow-md transition-all active:scale-95">
                            <div className="text-slate-400 text-xs font-medium mb-0.5">{formatExpressionToDisplay(item.expr)}</div>
                            <div className="text-slate-800 font-bold text-xl">= {formatNumber(item.result)}</div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex-1 min-h-[50%] p-4 pt-0 grid grid-cols-4 gap-2 md:gap-3 bg-transparent no-drag">
                    <button onClick={(e) => { e.stopPropagation(); setExpr(''); setLastOp(''); }} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 font-bold text-lg rounded-2xl border border-[#222]">C</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteLast(); }} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 flex items-center justify-center rounded-2xl border border-[#222]"><Delete size={20} /></button>
                    <button onClick={(e) => { e.stopPropagation(); insertAtCursor('%'); }} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 font-medium text-lg rounded-2xl border border-[#222]">%</button>
                    <button onClick={(e) => { e.stopPropagation(); insertAtCursor('÷'); }} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 font-medium text-xl rounded-2xl border border-[#222]">÷</button>
                    {[7,8,9].map(n => <button key={n} onClick={() => insertAtCursor(String(n))} className="bg-white hover:bg-slate-100 text-slate-800 font-medium text-xl rounded-2xl border border-slate-200 shadow-sm">{n}</button>)}
                    <button onClick={() => insertAtCursor('*')} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 font-medium text-xl rounded-2xl border border-[#222]">×</button>
                    {[4,5,6].map(n => <button key={n} onClick={() => insertAtCursor(String(n))} className="bg-white hover:bg-slate-100 text-slate-800 font-medium text-xl rounded-2xl border border-slate-200 shadow-sm">{n}</button>)}
                    <button onClick={() => insertAtCursor('-')} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 font-medium text-xl rounded-2xl border border-[#222]">−</button>
                    {[1,2,3].map(n => <button key={n} onClick={() => insertAtCursor(String(n))} className="bg-white hover:bg-slate-100 text-slate-800 font-medium text-xl rounded-2xl border border-slate-200 shadow-sm">{n}</button>)}
                    <button onClick={() => insertAtCursor('+')} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 font-medium text-xl rounded-2xl border border-[#222]">+</button>
                    <button onClick={() => insertAtCursor('√')} className="bg-[#383838] hover:bg-[#484848] text-yellow-500 font-medium text-lg rounded-2xl border border-[#222] italic flex items-center justify-center">√</button>
                    <button onClick={() => insertAtCursor('0')} className="bg-white hover:bg-slate-100 text-slate-800 font-medium text-xl rounded-2xl border border-slate-200 shadow-sm">0</button>
                    <button onClick={() => insertAtCursor('.')} className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-xl rounded-2xl border border-slate-200 shadow-sm">,</button>
                    <button onClick={handleEquals} className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900 font-bold text-3xl rounded-2xl shadow-lg shadow-yellow-500/30 flex items-center justify-center pb-1">=</button>
                </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize no-drag flex items-end justify-end p-1 z-50 text-slate-300" onMouseDown={onResizeStart} onTouchStart={onResizeStart}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v6m0 0h-6m6 0l-7-7M9 21H3m0 0v-6m0 6l7-7M3 9V3m0 0h6m-6 0l7 7M21 9V3m0 0h-6m6 0l-7 7"/></svg></div>
        </div>
    );
}
