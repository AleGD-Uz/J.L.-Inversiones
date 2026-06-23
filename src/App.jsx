import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    LayoutDashboard, Package, TrendingUp, Plus, Minus, Trash2,
    Save, Search, AlertCircle, Menu, X, DollarSign, UtensilsCrossed, ChefHat,
    Info, Edit, RefreshCw, Settings, AlertTriangle, Calendar, Clock, Sparkles,
    Bot, Loader2, Zap, FileText, Download, Megaphone, ClipboardList, Eye, EyeOff,
    MessageSquare, Calculator, History, ArrowRightLeft, Utensils, Palette, ChevronDown,
    ChevronUp, Wallet, PieChart, ArrowUpCircle, ArrowDownCircle, Lightbulb,
    ShieldCheck, Hash, CreditCard, Receipt, Clock3, Filter, SortAsc, SortDesc,
    Maximize2, Minimize2, CalendarDays, ChevronLeft, ChevronRight, Upload, Database,
    Cloud, Wifi, WifiOff, LogOut, LogIn, Lock, User, Mail, Key, Users, UserPlus, UserMinus,
    CheckCircle, Activity, Link, UserCog, UserCheck, Timer, FileSearch
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import FloatingCalculator from './components/FloatingCalculator';

// --- FIREBASE IMPORTS ---
import { initializeApp, getApp, getApps } from "firebase/app";
import {
    getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
    query, orderBy, writeBatch, serverTimestamp, setDoc, getDocs,
    enableIndexedDbPersistence, initializeFirestore, persistentLocalCache,
    persistentMultipleTabManager
} from "firebase/firestore";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "firebase/auth";

// =========================================================================
// CONFIGURACIÓN (PROYECTO V2)
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyASmobsGPo1PP802HSFioh0iZr0PS1LCo0",
  authDomain: "jl-inversiones-49464.firebaseapp.com",
  projectId: "jl-inversiones-49464",
  storageBucket: "jl-inversiones-49464.firebasestorage.app",
  messagingSenderId: "169074969222",
  appId: "1:169074969222:web:9dfb5535666630b28d9f07"
};

let app;
let db;
let auth;

try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    try {
        db = getFirestore(app);
    } catch (e) {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    }
    auth = getAuth(app);
} catch (error) {
    console.error("Error crítico inicializando Firebase:", error);
}

// --- CONSTANTE DE ID FIJO PARA PERSISTENCIA ---
const ENV_APP_ID = "yuyas-burger-sistema-v1";

// --- GESTIÓN DE TIEMPO FIJO (ZONA HORARIA VENEZUELA) ---
// Esto asegura que toda la aplicación se base en una hora fija sin importar 
// dónde esté el dispositivo o si tiene la hora desconfigurada.
const APP_TIMEZONE = 'America/Caracas';

const getZonedDate = (dateVal = new Date()) => {
    const d = new Date(dateVal);
    const str = d.toLocaleString('en-US', { timeZone: APP_TIMEZONE });
    return new Date(str);
};

const formatDateApp = (dateVal, formatType = 'full') => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (formatType === 'full') {
        return d.toLocaleString('es-VE', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (formatType === 'date') {
        return d.toLocaleDateString('es-VE', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    if (formatType === 'time') {
        return d.toLocaleTimeString('es-VE', { timeZone: APP_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (formatType === 'short-date') {
        return d.toLocaleDateString('es-VE', { timeZone: APP_TIMEZONE, weekday: 'short', month: 'short', day: 'numeric' });
    }
    if (formatType === 'month-year') {
        return d.toLocaleDateString('es-VE', { timeZone: APP_TIMEZONE, month: 'long', year: 'numeric' });
    }
    return d.toLocaleString('es-VE', { timeZone: APP_TIMEZONE });
};

// --- HELPERS ---
const normalizeId = (id) => {
    if (id === null || id === undefined) return "";
    return String(id).trim();
};

const generateSecureId = () => {
    return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
};

// --- PDF GENERATOR UTILS ---
const loadPdfLibs = async () => {
    if (window.jspdf && window.jspdf.jsPDF) return;
    return new Promise((resolve) => {
        const script1 = document.createElement('script');
        script1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js";
            script2.onload = resolve;
            document.head.appendChild(script2);
        };
        document.head.appendChild(script1);
    });
};

const generatePDF = async (title, columns, data, filename = 'reporte.pdf', footerText = '') => {
    await loadPdfLibs();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(13, 148, 136); // Yellow 600
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(16);
    doc.text("Sweet Ink", 14, 13);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(title, 14, 30);
    doc.setFontSize(10);
    doc.text(`Generado: ${formatDateApp(new Date(), 'full')}`, 14, 36);

    doc.autoTable({
        startY: 40,
        head: [columns],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
    });

    if (footerText) {
        doc.text(footerText, 14, doc.lastAutoTable.finalY + 10);
    }
    doc.save(filename);
};

const generateExcel = (title, columns, data, filename = 'reporte.csv') => {
    const BOM = '\uFEFF';
    const header = columns.join(',');
    const rows = data.map(row => row.map(cell => {
        const str = String(cell).replace(/"/g, '""');
        return `"${str}"`;
    }).join(','));
    const csv = BOM + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- HOOK DE INACTIVIDAD ---
const useIdleTimer = (timeout = 1800000, onIdle) => {
    const [isIdle, setIsIdle] = useState(false);

    useEffect(() => {
        let timer;
        const resetTimer = () => {
            setIsIdle(false);
            clearTimeout(timer);
            timer = setTimeout(() => {
                setIsIdle(true);
                if (onIdle) onIdle();
            }, timeout);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('click', resetTimer);
        window.addEventListener('scroll', resetTimer);
        window.addEventListener('touchstart', resetTimer);

        resetTimer();

        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('scroll', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, [timeout, onIdle]);

    return isIdle;
};

// --- HOOK DE SINCRONIZACIÓN DE DATOS ---
const useDataSync = (user, appId, isPublicCatalogMode = false) => {
    const [data, setData] = useState({
        ingredients: [],
        products: [],
        salesHistory: [],
        stockHistory: [],
        otherExpenses: [],
        pendingOrders: [],
        appUsers: [],
        bitacoraLogs: [],
        customers: [],
        config: { exchangeRate: 0 }
    });

    const [status, setStatus] = useState({
        connected: false, error: null, lastSync: null, dbMissing: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ((!user && !isPublicCatalogMode) || !db || !appId) {
            setLoading(false);
            return;
        }

        setStatus(prev => ({ ...prev, connected: true, error: null, dbMissing: false }));
        setLoading(true);

        const publicPath = (col) => collection(db, 'artifacts', appId, 'public', 'data', col);

        const subscribe = (colName, stateKey, orderField = null) => {
            let q = publicPath(colName);
            return onSnapshot(q,
                (snapshot) => {
                    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    setData(prev => ({ ...prev, [stateKey]: items }));
                    setStatus(prev => ({ ...prev, lastSync: new Date() }));
                },
                (error) => {
                    console.error(`Error en ${colName}:`, error);
                    let errMsg = error.message;
                    if (errMsg.includes("code=not-found") || errMsg.includes("project not found")) {
                        setStatus(prev => ({ ...prev, dbMissing: true, error: "Base de datos no encontrada" }));
                    } else {
                        setStatus(prev => ({ ...prev, error: `Error ${colName}: ${errMsg}` }));
                    }
                }
            );
        };

        const unsubs = [];
        if (user) {
            unsubs.push(
                subscribe('ingredients', 'ingredients'),
                subscribe('products', 'products'),
                subscribe('sales', 'salesHistory'),
                subscribe('stock_history', 'stockHistory'),
                subscribe('other_expenses', 'otherExpenses'),
                subscribe('pending_orders', 'pendingOrders'),
                subscribe('users', 'appUsers'),
                subscribe('bitacora', 'bitacoraLogs'),
                subscribe('customers', 'customers')
            );
        } else if (isPublicCatalogMode) {
            unsubs.push(
                subscribe('products', 'products')
            );
        }

        unsubs.push(
            onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'general'), (docSnap) => {
                if (docSnap.exists()) setData(prev => ({ ...prev, config: docSnap.data() }));
            })
        );

        const updatePresence = async () => {
            if (user?.uid) {
                try {
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), {
                        lastActive: new Date().toISOString()
                    });
                } catch (e) { }
            }
        };
        const presenceInterval = setInterval(updatePresence, 60000);
        updatePresence();

        setTimeout(() => setLoading(false), 800);

        return () => {
            unsubs.forEach(unsub => unsub && unsub());
            clearInterval(presenceInterval);
            setStatus(prev => ({ ...prev, connected: false }));
        };
    }, [user, appId, isPublicCatalogMode]);

    return { data, status, loading };
};

// --- ICONOS PERSONALIZADOS ---
const CartIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
);

// --- COMPONENTES UI AUXILIARES ---
const GlassCard = ({ children, className = "", onClick }) => (
    <div onClick={onClick} className={`bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl ${className}`}>
        {children}
    </div>
);

const GlassButton = ({ children, onClick, variant = "primary", className = "", disabled = false, title = "", type = "button", form }) => {
    const baseStyle = "px-3 py-2 md:px-4 md:py-2 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg select-none touch-manipulation text-xs md:text-sm";
    const variants = {
        primary: "bg-gradient-to-br from-teal-400 to-teal-600 text-slate-900 border-none shadow-xl shadow-teal-500/20 active:shadow-none hover:from-teal-400 hover:to-teal-500",
        secondary: "bg-white/50 text-slate-700 hover:bg-white/80 border border-white/40 backdrop-blur-md",
        danger: "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/20",
        success: "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-xl shadow-emerald-500/20",
        info: "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-xl shadow-slate-500/20",
        kitchen: "bg-gradient-to-br from-amber-400 to-teal-500 text-slate-800 border-none shadow-xl shadow-amber-500/10 active:shadow-none",
        expense: "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xl shadow-red-500/20 border border-white/20",
        gemini: "bg-gradient-to-br from-teal-400 via-teal-500 to-slate-700 text-white animate-gradient-xy shadow-xl shadow-teal-500/30 border border-white/10",
    };
    return <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`} form={form}>{children}</button>;
};

const Badge = ({ children, type = "neutral" }) => {
    const styles = {
        neutral: "bg-slate-200/50 text-slate-700 border border-slate-300/30",
        success: "bg-emerald-100/60 text-emerald-800 border border-emerald-200/50",
        warning: "bg-amber-100/60 text-amber-800 border border-amber-200/50",
        danger: "bg-red-100/60 text-red-800 border border-red-200/50",
        info: "bg-blue-100/60 text-blue-800 border border-blue-200/50"
    };
    return <span className={`px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-lg text-[9px] md:text-xs font-bold backdrop-blur-sm whitespace-nowrap ${styles[type]}`}>{children}</span>;
};

const PriceDisplay = ({ amount = 0, className = "", exchangeRate, size = "normal", align = "left", hideSecondary = false }) => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    const safeRate = isNaN(exchangeRate) ? 0 : exchangeRate;
    const formattedBs = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(safeAmount * safeRate);
    const formattedUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeAmount);
    const alignClass = align === 'right' ? 'text-right' : (align === 'center' ? 'text-center' : 'text-left');
    const textSize = size === 'large' ? 'text-lg md:text-2xl' : (size === 'small' ? 'text-xs' : 'text-sm md:text-base');
    
    const isVES = window.__primaryCurrency === 'VES';
    const mainText = isVES ? formattedBs : formattedUsd;
    const secondaryText = isVES ? formattedUsd : formattedBs;

    return (
        <div className={`${className} ${alignClass}`}>
            <div className={`font-bold text-slate-800 leading-none ${textSize}`}>{mainText}</div>
            {!hideSecondary && <div className="text-[9px] md:text-xs text-slate-500 font-mono mt-0.5">{secondaryText}</div>}
        </div>
    );
};

// --- COMPONENTES UI COMPLEJOS ---

const FixedClock = () => {
    const [time, setTime] = useState(formatDateApp(new Date(), 'time'));
    useEffect(() => {
        const timer = setInterval(() => setTime(formatDateApp(new Date(), 'time')), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <div className="text-xs text-slate-400 font-mono mt-1 bg-slate-800/50 px-2 py-1 rounded border border-slate-700 inline-block">
            {formatDateApp(new Date(), 'date')} • {time}
        </div>
    );
};

const PeriodNavigator = ({ currentDate, setCurrentDate, viewMode, setViewMode }) => {
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'daily') newDate.setDate(newDate.getDate() - 1);
        else if (viewMode === 'monthly') newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };
    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'daily') newDate.setDate(newDate.getDate() + 1);
        else if (viewMode === 'monthly') newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const formatDate = () => {
        if (viewMode === 'daily') return formatDateApp(currentDate, 'short-date');
        else if (viewMode === 'monthly') return formatDateApp(currentDate, 'month-year');
        return 'Rango';
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 bg-white/50 p-3 md:p-4 rounded-2xl border border-white/40 shadow-sm mb-6 items-center justify-between">
            <div className="flex bg-slate-200/50 rounded-xl p-1 w-full md:w-auto">
                {[{ id: 'daily', label: 'Día' }, { id: 'monthly', label: 'Mes' }, { id: 'range', label: 'Rango' }].map(m => (
                    <button key={m.id} onClick={() => setViewMode(m.id)} className={`flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${viewMode === m.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{m.label}</button>
                ))}
            </div>
            {viewMode !== 'range' && (
                <div className="flex items-center gap-4 bg-white/60 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-white/50 w-full md:w-auto justify-between md:justify-center">
                    <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={18} /></button>
                    <div className="text-center min-w-[100px] md:min-w-[120px]"><span className="block font-black text-slate-800 capitalize text-base md:text-lg leading-none">{formatDate()}</span></div>
                    <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={18} /></button>
                </div>
            )}
        </div>
    );
};

const DateRangeToolbar = ({ startDate, setStartDate, endDate, setEndDate, onDownloadPdf, title = "Filtrar por Fecha" }) => (
    <div className="flex flex-col md:flex-row gap-3 bg-white/50 p-3 rounded-2xl border border-white/40 shadow-sm mb-4 items-center">
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 whitespace-nowrap"><Calendar size={14} className="text-teal-600" /> <span className="hidden md:inline font-medium">{title}:</span></div>
        <div className="flex gap-2 w-full md:w-auto">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white/80 border border-slate-200 rounded-lg px-2 py-1.5 md:py-2 text-xs w-full focus:outline-none focus:border-teal-500" />
            <span className="text-slate-400 py-2">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white/80 border border-slate-200 rounded-lg px-2 py-1.5 md:py-2 text-xs w-full focus:outline-none focus:border-teal-500" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            {onDownloadPdf && (<GlassButton variant="secondary" onClick={onDownloadPdf} className="flex-1 md:w-auto text-xs py-1.5 md:py-2 h-full"><Download size={14} /> <span className="inline">PDF</span></GlassButton>)}
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-slate-400 hover:text-red-500 underline whitespace-nowrap px-2">Limpiar</button>
        </div>
    </div>
);

const AdvancedToolbar = ({ searchQuery, setSearchQuery, sortConfig, setSortConfig, sortOptions = [], placeholder = "Buscar..." }) => (
    <div className="flex flex-col md:flex-row gap-3 bg-white/50 p-3 rounded-2xl border border-white/40 shadow-sm mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder={placeholder} className="pl-9 pr-4 py-2 md:py-2 rounded-xl border border-slate-200 w-full focus:outline-none focus:ring-2 focus:ring-teal-500/50 bg-white/80 text-xs md:text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        {sortOptions.length > 0 && (<div className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-xl border border-slate-200 overflow-x-auto"><span className="text-slate-400 hidden md:block"><Filter size={16} /></span><select className="bg-transparent py-2 text-xs md:text-sm text-slate-700 focus:outline-none cursor-pointer w-full md:w-auto" value={sortConfig.key} onChange={(e) => setSortConfig({ ...sortConfig, key: e.target.value })}>{sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><button onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="p-2 hover:bg-slate-100 rounded text-slate-500" title={sortConfig.direction === 'asc' ? "Ascendente" : "Descendente"}>{sortConfig.direction === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}</button></div>)}
    </div>
);

const ProductCard = ({ product, ingredients, addToCart, exchangeRate, getProductMaxStock }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxStock = getProductMaxStock(product);
    const isOutOfStock = maxStock <= 0;

    const renderIcon = () => {
        if (!product.image || product.image === "") return <Utensils size={40} className="text-slate-300 opacity-50" />;
        if (String(product.image).startsWith('data:image') || String(product.image).startsWith('http')) {
            return <img src={product.image} alt={product.name} className="w-12 h-12 md:w-16 md:h-16 object-contain rounded-lg shadow-sm" />;
        }
        return <span className="text-4xl md:text-5xl drop-shadow-md">{product.image}</span>;
    };

    return (
        <GlassCard onClick={() => setIsExpanded(!isExpanded)} className={`group relative overflow-hidden transition-all duration-300 hover:shadow-teal-500/20 cursor-pointer select-none touch-manipulation ${isOutOfStock ? 'opacity-60 grayscale' : ''} ${isExpanded ? 'ring-2 ring-teal-400 scale-[1.02] z-10' : 'active:scale-95'}`}>
            <div className="absolute top-0 right-0 p-2 z-10"><Badge type={isOutOfStock ? "danger" : "success"}>{isOutOfStock ? "Agotado" : `${maxStock} disp`}</Badge></div>
            <div className="p-3 md:p-4 flex flex-col items-center text-center h-full">
                <div className="mb-3 flex items-center justify-center min-h-[48px] md:min-h-[64px]">
                    {renderIcon()}
                </div>
                <h3 className="font-bold text-slate-800 leading-tight mb-2 line-clamp-1 text-sm md:text-base">{product.name}</h3>
                <div className={`w-full text-left bg-teal-50/60 rounded-xl mb-3 overflow-hidden border border-teal-100/50 ${isExpanded ? 'p-3' : 'p-2 h-0 opacity-0 hidden'}`}>{isExpanded && (<div><p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-2">Ingredientes:</p><ul className="text-xs text-slate-600 space-y-1">{product.recipe?.map((r, idx) => {
                    const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId));
                    return ing ? <li key={idx} className="flex justify-between border-b border-teal-200/30 pb-1"><span>{ing.name}</span><span className="font-mono font-bold text-teal-600">x{r.qty}</span></li> : <li key={idx} className="text-red-400">Ingrediente no encontrado ({r.ingredientId})</li>;
                    })}</ul></div>)}</div>
                <div className="mb-2 text-slate-300">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                <div className="mb-4"><PriceDisplay amount={product.price} exchangeRate={exchangeRate} size="large" align="center" /></div>
                <GlassButton onClick={(e) => { e.stopPropagation(); addToCart(product); }} disabled={isOutOfStock} className="w-full mt-auto text-xs md:text-sm py-1.5 md:py-2">{isExpanded ? 'Añadir' : 'Agregar'}</GlassButton>
            </div>
        </GlassCard>
    );
};

const PublicCatalogScreen = ({ products, exchangeRate, onGoToLogin, user }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todos");

    const categories = useMemo(() => {
        return ["Todos", ...new Set(products.map(p => p.category).filter(Boolean))];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (p.hidden === true) return false;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans overflow-x-hidden">
            {/* Header */}
            <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50 px-4 py-4 md:px-8 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-teal-400 to-teal-600 p-2 rounded-xl shadow-lg shadow-teal-500/20">
                        <Palette size={20} className="text-slate-900" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black text-white tracking-tight">Catálogo de Productos</h1>
                        <p className="text-[10px] md:text-xs text-slate-400">Sweet Ink</p>
                    </div>
                </div>
                <button 
                    onClick={onGoToLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-lg shadow-teal-500/10 active:scale-95 animate-in fade-in"
                >
                    {user ? <LayoutDashboard size={14} /> : <LogIn size={14} />} {user ? "Administración" : "Personal"}
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-6">
                {/* Search and Category Filter Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 shadow-inner">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar producto..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 text-sm"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {categories.map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setSelectedCategory(cat)} 
                            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
                                selectedCategory === cat 
                                    ? 'bg-teal-500 text-slate-900 shadow-lg shadow-teal-500/10' 
                                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Utensils size={48} className="opacity-20 mb-4 animate-bounce" />
                        <p>No se encontraron productos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map(product => {
                            const priceBs = (product.price || 0) * (exchangeRate || 0);
                            return (
                                <div 
                                    key={product.id} 
                                    className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 flex flex-col gap-4 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 group"
                                >
                                    {/* Image/Emoji area */}
                                    <div className="aspect-square bg-slate-900 rounded-2xl flex items-center justify-center text-5xl overflow-hidden shadow-inner border border-slate-800 relative">
                                        {product.image && (String(product.image).startsWith('data:image') || String(product.image).startsWith('http')) ? (
                                            <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <span className="group-hover:scale-110 transition-transform duration-300 block">{product.image || '🎨'}</span>
                                        )}
                                    </div>

                                    {/* Product Details */}
                                    <div className="flex-1 flex flex-col justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{product.category || 'Otros'}</span>
                                            <h3 className="font-bold text-sm text-white group-hover:text-teal-400 transition-colors line-clamp-2 mt-1">{product.name}</h3>
                                        </div>
                                        <div className="mt-2 pt-3 border-t border-slate-700/50">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Precio</span>
                                            <div className="text-lg font-black text-teal-500 tracking-tight mt-0.5">
                                                {new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(priceBs)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

const LoginScreen = ({ onLogin, onViewPublicCatalog }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(null); setLoading(true);
        try {
            await onLogin(email, password);
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') setError("Usuario no encontrado.");
            else setError("Error de autenticación. Verifica tus datos.");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-md p-8 z-10 relative !bg-white/10 !backdrop-blur-2xl !border-white/10">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-4 overflow-hidden rounded-3xl shadow-2xl border-2 border-white/20">
                        <img 
                            src="/JLlogo.png" 
                            alt="Logo Sweet Ink" 
                            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" 
                        />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Sweet Ink</h1>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (<div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2"><AlertCircle size={16} /> {error}</div>)}
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Correo</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-10 text-white focus:outline-none focus:border-teal-500" placeholder="admin@jl-inversiones.com" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Contraseña</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-10 text-white focus:outline-none focus:border-teal-500" placeholder="••••••••" /></div>
                    <button type="submit" disabled={loading} className="w-full text-slate-900 font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2 bg-gradient-to-r from-teal-400 to-teal-600 hover:shadow-teal-500/30">{loading ? <Loader2 size={20} className="animate-spin" /> : 'Iniciar Sesión'}</button>
                    <div className="text-center mt-4">
                        <p className="text-xs text-slate-400">Acceso restringido a personal autorisado.</p>
                        {onViewPublicCatalog && (
                            <button 
                                type="button" 
                                onClick={onViewPublicCatalog} 
                                className="mt-4 text-xs font-black text-teal-500 hover:text-teal-400 hover:underline uppercase tracking-wider block mx-auto transition-all duration-300"
                            >
                                Ver Catálogo de Productos
                            </button>
                        )}
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};

const DEFAULT_PERMISSIONS_BY_ROLE = {
    'Gerente': {},
    'Cajero': {
        dashboard: { view: true, edit: false },
        pos: { view: true, edit: true },
        pending: { view: true, edit: true },
        history: { view: true, edit: false },
        products: { view: true, edit: false },
        inventory: { view: true, edit: false },
        inventory_history: { view: false, edit: false },
        customers: { view: true, edit: true },
        balance: { view: false, edit: false },
        reports: { view: false, edit: false },
        bitacora: { view: false, edit: false },
        settings: { view: false, edit: false }
    },
    'Diseñador': {
        dashboard: { view: true, edit: false },
        pos: { view: false, edit: false },
        pending: { view: true, edit: true },
        history: { view: false, edit: false },
        products: { view: true, edit: true },
        inventory: { view: true, edit: false },
        inventory_history: { view: false, edit: false },
        customers: { view: false, edit: false },
        balance: { view: false, edit: false },
        reports: { view: false, edit: false },
        bitacora: { view: false, edit: false },
        settings: { view: false, edit: false }
    },
    'Empleado': {
        dashboard: { view: true, edit: false },
        pos: { view: false, edit: false },
        pending: { view: true, edit: false },
        history: { view: false, edit: false },
        products: { view: true, edit: false },
        inventory: { view: true, edit: false },
        inventory_history: { view: false, edit: false },
        customers: { view: false, edit: false },
        balance: { view: false, edit: false },
        reports: { view: false, edit: false },
        bitacora: { view: false, edit: false },
        settings: { view: false, edit: false }
    },
    'Encargado': {
        dashboard: { view: true, edit: true },
        pos: { view: true, edit: true },
        pending: { view: true, edit: true },
        history: { view: true, edit: true },
        products: { view: true, edit: true },
        inventory: { view: true, edit: true },
        inventory_history: { view: true, edit: true },
        customers: { view: true, edit: true },
        balance: { view: true, edit: false },
        reports: { view: true, edit: false },
        bitacora: { view: false, edit: false },
        settings: { view: false, edit: false }
    }
};

// --- GESTIÓN DE USUARIOS ---
const UserManagement = ({ appUsers, onCreateUser, onEditUser, onDeleteUser, currentUserId }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [newEmail, setNewEmail] = useState("");
    const [newPass, setNewPass] = useState("");
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState("Empleado");

    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState("");
    const [editPermissions, setEditPermissions] = useState({});
    const [loading, setLoading] = useState(false);

    const handlePermissionChange = (sectionId, type, checked) => {
        setEditPermissions(prev => ({
            ...prev,
            [sectionId]: {
                ...(prev[sectionId] || { view: true, edit: false }),
                [type]: checked
            }
        }));
    };

    const totalUsers = appUsers.length;
    const adminCount = appUsers.filter(u => u.role === 'Gerente').length;
    const employeeCount = appUsers.filter(u => u.role !== 'Gerente').length;

    const isOnline = (dateStr) => {
        if (!dateStr) return false;
        const diff = new Date() - new Date(dateStr);
        return diff < 300000;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onCreateUser(newEmail, newPass, newName, newRole);
            setIsCreating(false); setNewEmail(""); setNewPass(""); setNewName("");
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onEditUser(editingUser.uid, { 
                name: editName, 
                role: editRole, 
                permissions: editRole === 'Gerente' ? {} : editPermissions 
            });
            setEditingUser(null);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg shadow-slate-200">
                    <p className="text-slate-400 text-xs font-bold uppercase">Total</p>
                    <p className="text-xl md:text-2xl font-black">{totalUsers}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase">Admin</p>
                    <p className="text-xl md:text-2xl font-black text-slate-800">{adminCount}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-400 text-xs font-bold uppercase">Staff</p>
                    <p className="text-xl md:text-2xl font-black text-slate-800">{employeeCount}</p>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-teal-600" /> Personal
                </h3>
                <GlassButton onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "primary"}>
                    {isCreating ? <X size={16} /> : <UserPlus size={16} />} <span className="hidden md:inline">{isCreating ? "Cancelar" : "Nuevo Usuario"}</span>
                </GlassButton>
            </div>

            {isCreating && (
                <GlassCard className="p-6 border-l-4 border-teal-500 bg-teal-50/50 animate-in slide-in-from-top-4 mb-6">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2"><UserPlus size={18} /> Nuevo Acceso</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Nombre Completo</label>
                                <input required type="text" placeholder="Ej. Juan Pérez" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl focus:border-teal-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Rol</label>
                                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl bg-white focus:border-teal-500 outline-none">
                                    <option>Gerente</option><option>Encargado</option><option>Cajero</option><option>Diseñador</option><option>Empleado</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Correo Electrónico</label>
                                <input required type="email" placeholder="juan@jl-inversiones.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl focus:border-teal-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Contraseña Inicial</label>
                                <input required type="password" placeholder="Mínimo 6 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl focus:border-teal-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <GlassButton type="submit" disabled={loading} variant="info" className="w-full md:w-auto">
                                {loading ? <Loader2 className="animate-spin" /> : 'Registrar'}
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>
            )}

            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-[#e2e8f0]/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] w-full max-w-md p-8 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto text-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-wide uppercase">
                                <Edit size={22} className="text-purple-600" /> Editar Usuario
                            </h4>
                            <button onClick={() => setEditingUser(null)} className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nombre / Alias</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={editName} 
                                    onChange={e => setEditName(e.target.value)} 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-bold text-slate-800 shadow-inner" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Rol en el Sistema</label>
                                <select 
                                    value={editRole} 
                                    onChange={e => {
                                        const newRole = e.target.value;
                                        setEditRole(newRole);
                                        setEditPermissions(DEFAULT_PERMISSIONS_BY_ROLE[newRole] || {});
                                    }} 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-bold text-slate-800 shadow-inner cursor-pointer"
                                >
                                    <option>Gerente</option>
                                    <option>Encargado</option>
                                    <option>Cajero</option>
                                    <option>Diseñador</option>
                                    <option>Empleado</option>
                                </select>
                            </div>

                            {editRole !== 'Gerente' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Permisos por Apartado</label>
                                    <div className="max-h-60 overflow-y-auto pr-1 space-y-2 rounded-2xl bg-slate-50/50 p-2 border border-slate-200/60 custom-scrollbar">
                                        {[
                                            { id: 'dashboard', label: 'Dashboard' },
                                            { id: 'pos', label: 'Ventas / POS' },
                                            { id: 'pending', label: 'Pending' },
                                            { id: 'history', label: 'History' },
                                            { id: 'products', label: 'Menu' },
                                            { id: 'inventory', label: 'Inventory' },
                                            { id: 'inventory_history', label: 'Kardex' },
                                            { id: 'customers', label: 'Clientes' },
                                            { id: 'balance', label: 'Balance' },
                                            { id: 'reports', label: 'Reportes' },
                                            { id: 'bitacora', label: 'Bitácora' },
                                            { id: 'settings', label: 'Configuración' }
                                        ].map(sec => {
                                            const p = editPermissions[sec.id] || { view: true, edit: false };
                                            return (
                                                <div key={sec.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                    <span className="font-bold text-xs text-slate-700">{sec.label}</span>
                                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <span>Ver</span>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={p.view !== false} 
                                                                onChange={e => handlePermissionChange(sec.id, 'view', e.target.checked)}
                                                                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                                                            />
                                                        </label>
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <span>Editar</span>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={p.edit === true} 
                                                                onChange={e => handlePermissionChange(sec.id, 'edit', e.target.checked)}
                                                                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingUser(null)} 
                                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors px-4 py-2"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="bg-purple-100 text-purple-700 border border-purple-300 rounded-full px-6 py-2.5 font-bold hover:bg-purple-200 active:scale-95 transition-all text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/10 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appUsers.map(u => {
                    const online = isOnline(u.lastActive);
                    return (
                        <div key={u.id || Math.random()} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className={`h-2 w-full ${u.role === 'Gerente' ? 'bg-teal-500' : (u.role === 'Diseñador' ? 'bg-amber-400' : 'bg-slate-300')}`}></div>
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-slate-800 shadow-lg ${u.role === 'Gerente' ? 'bg-gradient-to-br from-teal-400 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                                                {typeof u.name === 'string' ? u.name.charAt(0).toUpperCase() : <User size={24} />}
                                            </div>
                                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} title={online ? "En línea" : "Desconectado"}></div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 leading-tight">{u.name || "Sin Nombre"}</p>
                                            <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[120px]" title={u.email}>{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge type={u.role === 'Gerente' ? 'info' : 'neutral'}>{u.role}</Badge>
                                        {u.uid === currentUserId && <Badge type="success">Tú</Badge>}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {online ? '● Activo ahora' : '○ Desconectado'}
                                    </span>
                                    <div className="flex gap-1">
                                        {u.uid !== currentUserId ? (
                                            <>
                                                <button onClick={() => { 
                                                    setEditingUser(u); 
                                                    setEditName(u.name || ""); 
                                                    setEditRole(u.role || "Empleado"); 
                                                    setEditPermissions(u.permissions || DEFAULT_PERMISSIONS_BY_ROLE[u.role || "Empleado"] || {});
                                                }} className="p-3 md:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => onDeleteUser(u)} className="p-3 md:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => { 
                                                setEditingUser(u); 
                                                setEditName(u.name || ""); 
                                                setEditRole(u.role || "Empleado"); 
                                                setEditPermissions(u.permissions || DEFAULT_PERMISSIONS_BY_ROLE[u.role || "Empleado"] || {});
                                            }} className="p-3 md:p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Editar mi perfil">
                                                <UserCheck size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};



// --- COMPONENTE PRINCIPAL APP ---
export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [currencyMode, setCurrencyMode] = useState(() => localStorage.getItem('currencyMode') || 'USD');
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isPublicCatalogMode, setIsPublicCatalogMode] = useState(false);

    const [currentAppId, setCurrentAppId] = useState(ENV_APP_ID);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            if (window.location.hash === '#/catalogo') {
                setIsPublicCatalogMode(true);
            } else if (window.location.hash === '#/login') {
                setIsPublicCatalogMode(false);
            }
        };
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        localStorage.setItem('currencyMode', currencyMode);
    }, [currencyMode]);

    const handleLogout = useCallback(() => signOut(auth).then(() => {
        setUser(null);
    }), []);

    const isIdle = useIdleTimer(1800000, () => {
        if (user) {
            handleLogout();
            alert("Tu sesión ha sido cerrada por seguridad debido a inactividad.");
        }
    });

    const { data, status: connectionStatus, loading: dataLoading } = useDataSync(user, currentAppId, isPublicCatalogMode);
    const { ingredients, products, salesHistory, stockHistory, otherExpenses, pendingOrders, appUsers, bitacoraLogs, config, customers = [] } = data;
    const exchangeRate = config?.exchangeRate || 0;

    window.__primaryCurrency = currencyMode;
    window.__exchangeRate = exchangeRate;

    const currentUserData = useMemo(() => {
        if (!user || !appUsers?.length) return null;
        return appUsers.find(u => u.uid === user.uid);
    }, [user, appUsers]);

    const PERMISSION_SECTIONS = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'pos', label: 'Ventas / POS' },
        { id: 'pending', label: 'Pending' },
        { id: 'history', label: 'History' },
        { id: 'products', label: 'Menu' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'inventory_history', label: 'Kardex' },
        { id: 'customers', label: 'Clientes' },
        { id: 'balance', label: 'Balance' },
        { id: 'reports', label: 'Reportes' },
        { id: 'bitacora', label: 'Bitácora' },
        { id: 'settings', label: 'Configuración' }
    ];

    const hasPermission = (tabId, type = 'view') => {
        if (!user) return false;
        if (!currentUserData) return true; // Default to true while loading
        if (currentUserData.role === 'Gerente') return true;
        
        const perms = currentUserData.permissions || {};
        const tabPerms = perms[tabId] || {};
        
        if (type === 'view') {
            return tabPerms.view !== false; // Default to true if undefined
        }
        if (type === 'edit') {
            return tabPerms.edit === true;  // Default to false if undefined
        }
        return false;
    };

    // Redirección si no tiene permisos de ver el tab activo
    useEffect(() => {
        if (currentUserData && currentUserData.role !== 'Gerente') {
            const currentTabPerm = (currentUserData.permissions || {})[activeTab];
            const isAllowed = currentTabPerm?.view !== false;
            if (!isAllowed) {
                const firstAllowedTab = PERMISSION_SECTIONS.find(t => {
                    const p = (currentUserData.permissions || {})[t.id];
                    return p?.view !== false;
                });
                if (firstAllowedTab) {
                    setActiveTab(firstAllowedTab.id);
                }
            }
        }
    }, [activeTab, currentUserData]);

    // --- CÁLCULOS DEL DASHBOARD ---
    const todaySales = useMemo(() => {
        return salesHistory.filter(s => {
            if (!s.date) return false;
            const d = getZonedDate(s.date);
            const today = getZonedDate(new Date());
            return d.getDate() === today.getDate() &&
                   d.getMonth() === today.getMonth() &&
                   d.getFullYear() === today.getFullYear();
        });
    }, [salesHistory]);

    const dailyIncome = useMemo(() => {
        return todaySales.reduce((acc, s) => acc + s.total, 0);
    }, [todaySales]);

    const dailyOrdersCount = todaySales.length;

    const averageOrderCost = useMemo(() => {
        return dailyOrdersCount > 0 ? dailyIncome / dailyOrdersCount : 0;
    }, [dailyIncome, dailyOrdersCount]);

    const hourlySalesData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => {
            const period = i >= 12 ? 'PM' : 'AM';
            const hour12 = i % 12 === 0 ? 12 : i % 12;
            return {
                hour: i,
                label: `${hour12} ${period}`,
                Monto: 0,
                ventas: 0
            };
        });
        
        todaySales.forEach(s => {
            if (!s.date) return;
            const d = getZonedDate(s.date);
            const hour = d.getHours();
            if (hours[hour]) {
                hours[hour].Monto += s.total;
                hours[hour].ventas += 1;
            }
        });
        
        return hours.filter(h => h.Monto > 0 || (h.hour >= 7 && h.hour <= 22));
    }, [todaySales]);

    const weeklyBalanceData = useMemo(() => {
        const today = getZonedDate(new Date());
        const dataList = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            d.setHours(0, 0, 0, 0);
            
            const dailySales = salesHistory.filter(s => {
                if (!s.date) return false;
                const sd = getZonedDate(s.date);
                return sd.getDate() === d.getDate() &&
                       sd.getMonth() === d.getMonth() &&
                       sd.getFullYear() === d.getFullYear();
            });
            
            const dailyExpenses = otherExpenses.filter(e => {
                if (!e.date) return false;
                const ed = getZonedDate(e.date);
                return ed.getDate() === d.getDate() &&
                       ed.getMonth() === d.getMonth() &&
                       ed.getFullYear() === d.getFullYear();
            });
            
            const stockExpenses = stockHistory.filter(l => {
                if (!l.date) return false;
                if (l.type !== 'ADD' || l.reason.includes('Cancelación')) return false;
                const ld = getZonedDate(l.date);
                return ld.getDate() === d.getDate() &&
                       ld.getMonth() === d.getMonth() &&
                       ld.getFullYear() === d.getFullYear();
            });
            
            const income = dailySales.reduce((sum, s) => sum + s.total, 0);
            const expense = dailyExpenses.reduce((sum, e) => sum + e.amount, 0) +
                            stockExpenses.reduce((sum, l) => sum + (l.totalValue || 0), 0);
            
            const name = d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', timeZone: APP_TIMEZONE });
            
            dataList.push({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                Ingresos: Number(income.toFixed(2)),
                Gastos: Number(expense.toFixed(2))
            });
        }
        return dataList;
    }, [salesHistory, otherExpenses, stockHistory]);

    const topSellingProducts = useMemo(() => {
        const productQuantities = {};
        salesHistory.forEach(sale => {
            sale.items?.forEach(item => {
                if (!productQuantities[item.id]) {
                    productQuantities[item.id] = {
                        id: item.id,
                        name: item.name,
                        image: item.image,
                        price: item.price,
                        qty: 0,
                        totalSales: 0
                    };
                }
                productQuantities[item.id].qty += item.qty;
                productQuantities[item.id].totalSales += item.price * item.qty;
            });
        });
        return Object.values(productQuantities)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [salesHistory]);

    const criticalStockProducts = useMemo(() => {
        return ingredients
            .filter(ing => (ing.stock || 0) <= (ing.minStock || 0))
            .sort((a, b) => {
                const ratioA = a.minStock > 0 ? (a.stock / a.minStock) : 0;
                const ratioB = b.minStock > 0 ? (b.stock / b.minStock) : 0;
                return ratioA - ratioB;
            })
            .slice(0, 5);
    }, [ingredients]);

    const recentOrdersWithStatus = useMemo(() => {
        const pending = pendingOrders.map(o => ({
            ...o,
            type: 'pending',
            statusLabel: 'Pendiente',
            badgeType: 'warning',
            rawDate: o.date
        }));
        const completed = salesHistory.map(s => ({
            ...s,
            type: 'completed',
            statusLabel: 'Completado',
            badgeType: 'success',
            rawDate: s.date
        }));
        
        return [...pending, ...completed]
            .sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0))
            .slice(0, 10);
    }, [pendingOrders, salesHistory]);

    // --- ESTADOS CORE ---
    const [notification, setNotification] = useState(null);
    const [expandedKardexId, setExpandedKardexId] = useState(null);
    const [tempKardexObs, setTempKardexObs] = useState("");
    const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);
    const [productIconPreview, setProductIconPreview] = useState(null);
    const fileInputRef = useRef(null);

    // --- FUNCIONES CORE ---
    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(isNaN(amount) ? 0 : amount);
    const formatBs = (amountUsd) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format((isNaN(amountUsd) ? 0 : amountUsd) * (isNaN(exchangeRate) ? 0 : exchangeRate));
    const showNotification = (msg, type = "success") => { 
        setNotification({ msg, type }); 
        setTimeout(() => setNotification(null), 3000); 
    };

    // --- COMPRESIÓN DE IMAGEN PARA FIRESTORE ---
    // Redimensiona y comprime la imagen para que quepa en el límite de 1MB de Firestore
    const compressImageForFirestore = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const MAX_SIZE = 128; // 128px máx — garantiza < 20KB en Firestore
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > height) {
                        if (width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.5)); // JPEG 50% — ~8-15KB
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const [cart, setCart] = useState([]);
    const [saleDescription, setSaleDescription] = useState("");
    const [orderDeliveryDate, setOrderDeliveryDate] = useState("");
    const [orderDesignLink, setOrderDesignLink] = useState("");
    const [showMermaForm, setShowMermaForm] = useState(false);
    const [mermaIngredientId, setMermaIngredientId] = useState("");
    const [mermaQty, setMermaQty] = useState("");
    const [mermaReason, setMermaReason] = useState("");
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [selectedSale, setSelectedSale] = useState(null);
    const [observationText, setObservationText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentDateView, setCurrentDateView] = useState(new Date());
    const [viewMode, setViewMode] = useState('daily');
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState("");
    const [editingIngredient, setEditingIngredient] = useState(null);
    const [showIngredientForm, setShowIngredientForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [profitMargin, setProfitMargin] = useState(30);
    const [confirmation, setConfirmation] = useState({ show: false, message: '', onConfirm: null });
    const [aiModal, setAiModal] = useState({ show: false, title: '', content: '', loading: false });
    const [receiptModal, setReceiptModal] = useState({ show: false, sale: null });
    const [tempIngredientId, setTempIngredientId] = useState("");
    const [tempIngredientQty, setTempIngredientQty] = useState("1");
    const [bitacoraFilter, setBitacoraFilter] = useState("Todos");
    const [ivaPercent, setIvaPercent] = useState(0);
    const [tempCost, setTempCost] = useState(0);
    const [formCurrency, setFormCurrency] = useState('USD');
    const [isIvaApplied, setIsIvaApplied] = useState(false);
    const [baseCostBeforeIva, setBaseCostBeforeIva] = useState(0);
    const [showCalculator, setShowCalculator] = useState(false);
    const [expensesLimit, setExpensesLimit] = useState(10);
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [showCustomerForm, setShowCustomerForm] = useState(false);

    const [expenseCurrency, setExpenseCurrency] = useState('USD');
    const [tempExpenseAmount, setTempExpenseAmount] = useState(0);
    const [productCurrency, setProductCurrency] = useState('USD');
    const [tempProductPrice, setTempProductPrice] = useState(0);

    useEffect(() => {
        if (showExpenseForm) {
            setExpenseCurrency(currencyMode);
            setTempExpenseAmount(editingExpense ? editingExpense.amount : 0);
        }
    }, [showExpenseForm, editingExpense, currencyMode]);

    useEffect(() => {
        if (showProductForm) {
            setProductCurrency(currencyMode);
            setTempProductPrice(editingProduct ? editingProduct.price || 0 : 0);
        }
    }, [showProductForm, editingProduct, currencyMode]);

    useEffect(() => {
        if (!showIngredientForm && !showProductForm) {
            setShowCalculator(false);
        }
    }, [showIngredientForm, showProductForm]);
    
    // Resetear filtros y orden al cambiar de pestaña para evitar desajustes
    useEffect(() => {
        setSearchQuery("");
        setSelectedCategory("Todos");
        setExpensesLimit(10);
        if (['inventory', 'products', 'pos', 'reports', 'customers'].includes(activeTab)) {
            setSortConfig({ key: 'name', direction: 'asc' });
        } else if (['history', 'bitacora', 'inventory_history', 'pending'].includes(activeTab)) {
            setSortConfig({ key: 'date', direction: 'desc' });
        }
    }, [activeTab]);

    // --- SISTEMA DE BITÁCORA (LOG DE ACCIONES) ---
    const logActivity = async (actionType, detailsText) => {
        if (!user || !db) return;
        const logId = generateSecureId();
        const currentUserObj = appUsers.find(u => u.uid === user.uid);
        const userName = currentUserObj ? currentUserObj.name : user.email;

        const logEntry = {
            id: logId,
            date: new Date().toISOString(),
            userId: user.uid,
            userName: userName,
            action: actionType,
            details: detailsText
        };
        try {
            await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'bitacora', logId), logEntry);
        } catch (e) { console.error("Error saving log:", e); }
    };

    const handleLogin = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const handleCreateUserSystem = async (email, password, name, role) => {
        try {
            let secondaryApp;
            try { secondaryApp = getApp("SecondaryApp"); } catch (e) { secondaryApp = initializeApp(firebaseConfig, "SecondaryApp"); }
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const newUser = userCredential.user;
            const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[role] || {};
            await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'users', newUser.uid), { 
                uid: newUser.uid, 
                name: name, 
                email: email, 
                role: role, 
                permissions: defaultPerms, 
                createdAt: new Date().toISOString() 
            });
            await signOut(secondaryAuth);
            logActivity('Sistema', `Usuario creado: ${name} (${role})`);
            showNotification(`Usuario ${name} creado exitosamente`);
        } catch (error) {
            console.error("Error creando usuario:", error);
            if (error.code === 'auth/email-already-in-use') showNotification("El correo ya está registrado", "error");
            else showNotification("Error al crear usuario: " + error.message, "error");
        }
    };

    const handleEditUserSystem = async (uid, newData) => {
        try {
            await updateDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'users', uid), newData);
            logActivity('Sistema', `Usuario actualizado: ${newData.name}`);
            showNotification("Usuario actualizado correctamente");
        } catch (error) { console.error(error); showNotification("Error al actualizar usuario", "error"); }
    };

    const handleDeleteUserSystem = (userToDelete) => {
        setConfirmation({
            show: true, message: `¿Eliminar a ${userToDelete.name} de la lista?`, onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'users', userToDelete.uid));
                    logActivity('Sistema', `Usuario eliminado: ${userToDelete.name}`);
                    showNotification("Usuario eliminado de la lista");
                    setConfirmation({ show: false });
                } catch (error) { console.error(error); showNotification("Error al eliminar", "error"); }
            }
        });
    };

    const saveToDB = async (collectionName, data, id = null) => {
        if (!db) return;
        const docId = id ? id.toString() : (data.id ? data.id.toString() : generateSecureId());
        await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', collectionName, docId), data);
    };
    const deleteFromDB = async (collectionName, id) => {
        if (!db) return;
        await deleteDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', collectionName, id.toString()));
    };

    const getProductMaxStock = (product) => {
        if (!product.recipe?.length) return 999;
        return Math.min(...product.recipe.map(item => {
            const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(item.ingredientId));
            return ing && ing.stock > 0 ? Math.floor(ing.stock / item.qty) : 0;
        }));
    };

    const addToCart = (product) => {
        if (!hasPermission('pos', 'edit')) { showNotification("No tienes permisos para interactuar con la orden", "error"); return; }
        if (cart.find(c => c.id === product.id)?.qty >= getProductMaxStock(product)) { showNotification(`¡Stock insuficiente!`, "error"); return; }
        setCart(prev => {
            const ex = prev.find(i => i.id === product.id);
            return ex ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...product, qty: 1 }];
        });
        if (window.innerWidth < 1024 && cart.length === 0) setIsCartOpenMobile(true);
    };

    const handleDirectCharge = async () => {
        if (cart.length === 0) return;
        const orderId = generateSecureId();
        const desc = saleDescription || "Cliente POS";
        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

        // Descontar stock directamente
        for (const item of cart) {
            item.recipe?.forEach(r => {
                const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId));
                if (ing) {
                    const qtyToDeduct = r.qty * item.qty;
                    const newStock = ing.stock - qtyToDeduct;
                    saveToDB('ingredients', { ...ing, stock: newStock }, ing.id);

                    const log = {
                        id: generateSecureId(),
                        date: new Date().toISOString(),
                        type: 'SUB',
                        ingredientName: ing.name,
                        ingredientId: ing.id,
                        qtyChange: -qtyToDeduct,
                        costPerUnit: ing.cost || 0,
                        totalValue: qtyToDeduct * (ing.cost || 0),
                        previousStock: ing.stock,
                        newStock: newStock,
                        reason: `Venta Directa #${String(orderId).slice(-4)}`
                    };
                    saveToDB('stock_history', log, log.id);
                }
            });
        }

        const sale = { id: orderId, date: new Date().toISOString(), items: cart, total: total, description: desc, observation: "" };
        await saveToDB('sales', sale, orderId);
        logActivity('Venta', `Venta directa realizada: ${desc} - ${formatCurrency(total)}`);
        showNotification("Venta procesada exitosamente");
        setReceiptModal({ show: true, sale });
        setCart([]); setSaleDescription(""); setOrderDeliveryDate(""); setOrderDesignLink(""); setIsCartOpenMobile(false);
    };

    const handleSaveToPending = async () => {
        if (cart.length === 0) return;
        const isUpdate = editingOrderId !== null;
        const orderId = isUpdate ? editingOrderId : generateSecureId();
        const desc = saleDescription || "Cliente General";
        const order = { id: orderId, date: new Date().toISOString(), items: cart, total: cart.reduce((s, i) => s + i.price * i.qty, 0), description: desc, status: 'pending', deliveryDate: orderDeliveryDate, designLink: orderDesignLink };

        // Calculamos la diferencia neta de inventario a descontar/devolver
        const stockDeductions = {};
        cart.forEach(item => {
            item.recipe?.forEach(r => {
                const id = normalizeId(r.ingredientId);
                stockDeductions[id] = (stockDeductions[id] || 0) + (r.qty * item.qty);
            });
        });

        if (isUpdate) {
            const originalOrder = pendingOrders.find(o => o.id === editingOrderId);
            if (originalOrder) {
                originalOrder.items.forEach(item => {
                    item.recipe?.forEach(r => {
                        const id = normalizeId(r.ingredientId);
                        stockDeductions[id] = (stockDeductions[id] || 0) - (r.qty * item.qty);
                    });
                });
            }
        }

        for (const [ingId, netQty] of Object.entries(stockDeductions)) {
            if (netQty === 0) continue;
            const ing = ingredients.find(i => normalizeId(i.id) === ingId);
            if (ing) {
                const newStock = ing.stock - netQty;
                saveToDB('ingredients', { ...ing, stock: newStock }, ing.id);

                const log = {
                    id: generateSecureId(),
                    date: new Date().toISOString(),
                    type: netQty > 0 ? 'SUB' : 'ADD',
                    ingredientName: ing.name,
                    ingredientId: ing.id,
                    qtyChange: -netQty,
                    costPerUnit: ing.cost || 0,
                    totalValue: Math.abs(netQty) * (ing.cost || 0),
                    previousStock: ing.stock,
                    newStock: newStock,
                    reason: isUpdate ? `Modif #${String(orderId).slice(-4)}` : `Venta Comanda`
                };
                saveToDB('stock_history', log, log.id);
            }
        }

        saveToDB('pending_orders', order, order.id);
        logActivity('Pedido', `Orden ${isUpdate ? 'actualizada' : 'enviada a pendientes'}: ${desc}`);
        showNotification(isUpdate ? "Orden actualizada" : "Enviada a pendientes");
        setCart([]); setSaleDescription(""); setOrderDeliveryDate(""); setOrderDesignLink(""); setEditingOrderId(null); setIsCartOpenMobile(false); if (isUpdate) setActiveTab('pending');
    };

    const handleCancelPendingOrder = (order) => {
        setConfirmation({
            show: true, message: "¿Cancelar y devolver stock?", onConfirm: () => {
                order.items.forEach(item => item.recipe?.forEach(r => {
                    const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId));
                    if (ing) {
                        const qty = r.qty * item.qty;
                        const newStock = ing.stock + qty;
                        saveToDB('ingredients', { ...ing, stock: newStock }, ing.id);
                        const log = {
                            id: generateSecureId(),
                            date: new Date().toISOString(),
                            type: 'ADD',
                            ingredientName: ing.name,
                            ingredientId: ing.id,
                            qtyChange: qty,
                            costPerUnit: ing.cost || 0,
                            totalValue: qty * (ing.cost || 0),
                            previousStock: ing.stock,
                            newStock: newStock,
                            reason: `Cancelación #${String(order.id).slice(-4)}`
                        };
                        saveToDB('stock_history', log, log.id);
                    }
                }));
                deleteFromDB('pending_orders', order.id);
                logActivity('Cancelación', `Pedido cancelado: ${order.description}`);
                setConfirmation({ show: false });
                showNotification("Orden cancelada");
            }
        });
    };

    
    const handleGenerateQuotation = () => {
        if (cart.length === 0) return;
        const isVES = currencyMode === 'VES';
        const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
        const data = cart.map(item => [item.qty, `${item.name}${item.variantDetails ? ` (${item.variantDetails})` : ''}`, formatVal(item.price), formatVal(item.price * item.qty)]);
        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        data.push(['', 'TOTAL', '', formatVal(total)]);
        generatePDF('Cotización', ['Cant', 'Descripción', 'Unit', 'Subtotal'], data, `cotizacion_${new Date().getTime()}.pdf`, `Cliente: ${saleDescription || 'A quien corresponda'}\nValidez: 15 días`);
    };

    const handleReportMerma = (e) => {
        e.preventDefault();
        const ing = ingredients.find(i => i.id === mermaIngredientId);
        if (!ing || !mermaQty || isNaN(mermaQty)) return;
        const qtyToDeduct = parseFloat(mermaQty);
        if (qtyToDeduct > ing.stock) { showNotification('Stock insuficiente', 'error'); return; }
        
        const newStock = ing.stock - qtyToDeduct;
        saveToDB('ingredients', { ...ing, stock: newStock }, ing.id);
        const log = {
            id: generateSecureId(),
            date: new Date().toISOString(),
            type: 'LOSS',
            ingredientName: ing.name,
            ingredientId: ing.id,
            qtyChange: -qtyToDeduct,
            costPerUnit: ing.cost || 0,
            totalValue: -qtyToDeduct * (ing.cost || 0),
            previousStock: ing.stock,
            newStock: newStock,
            reason: `Merma/Daño: ${mermaReason}`
        };
        saveToDB('stock_history', log, log.id);
        logActivity('Sistema', `Merma reportada: ${qtyToDeduct} ${ing.unit} de ${ing.name} (${mermaReason})`);
        showNotification('Merma registrada', 'warning');
        setShowMermaForm(false);
        setMermaIngredientId(''); setMermaQty(''); setMermaReason('');
    };

    // FUNCIONES DE PDF
    const handleDownloadReceipt = (sale) => {
        const isVES = currencyMode === 'VES';
        const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
        const data = sale.items.map(item => [item.qty, `${item.name}${item.variantDetails || item.details ? ` (${item.variantDetails || item.details})` : ''}`, formatVal(item.price), formatVal(item.price * item.qty)]);
        data.push(['', 'TOTAL', '', formatVal(sale.total)]);
        generatePDF(`Recibo #${String(sale.id).slice(-6)}`, ["Cant", "Item", "Unit", "Subtotal"], data, `recibo_${sale.id}.pdf`, `Cliente: ${sale.description || 'Consumidor Final'}`);
    };

    const handleDownloadReport = (data) => {
        const isVES = currencyMode === 'VES';
        const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
        const rows = data.map(s => [formatDateApp(s.date, 'full'), s.description || '-', formatVal(s.total)]);
        generatePDF('Reporte de Ventas', ["Fecha", "Cliente", "Total"], rows, 'reporte_ventas.pdf');
    };

    const handleDownloadMenu = () => {
        const isVES = currencyMode === 'VES';
        const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
        const rows = products.map(p => [p.name, p.category, formatVal(p.price)]);
        generatePDF('Catálogo de Productos', ["Nombre", "Categoría", "Precio"], rows, 'catalogo.pdf');
    };

    const handleCobrar = (order) => {
        const sale = { ...order, status: 'completed', date: new Date().toISOString() };
        saveToDB('sales', sale, sale.id);
        deleteFromDB('pending_orders', order.id);
        logActivity('Venta', `Cobro exitoso: ${sale.description} ($${sale.total.toFixed(2)})`);
        setReceiptModal({ show: true, sale: sale });
    };

    const handleUpdateObservation = () => {
        if (!selectedSale) return;
        saveToDB('sales', { ...selectedSale, observation: observationText }, selectedSale.id);
        logActivity('Venta', `Nota añadida a venta de: ${selectedSale.description}`);
        setSelectedSale(prev => ({ ...prev, observation: observationText }));
        showNotification("Observación guardada");
    };

    const handleSaveKardexObservation = (id) => {
        const log = stockHistory.find(l => l.id === id);
        if (log) {
            saveToDB('stock_history', { ...log, observation: tempKardexObs }, id);
            logActivity('Inventario', `Nota en Kardex editada: ${log.ingredientName}`);
            showNotification("Nota guardada en Kardex");
        }
    };

    const handleSaveExpense = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const isEdit = editingExpense !== null;
        const id = isEdit ? editingExpense.id : generateSecureId();
        const date = isEdit ? editingExpense.date : new Date().toISOString();
        const expense = { id, date, description: fd.get('description'), amount: tempExpenseAmount, category: fd.get('category') };
        saveToDB('other_expenses', expense, id);
        logActivity('Gasto', `Gasto ${isEdit ? 'editado' : 'registrado'}: ${expense.description} ($${tempExpenseAmount.toFixed(2)})`);
        setShowExpenseForm(false);
        setEditingExpense(null);
        showNotification(isEdit ? "Gasto actualizado" : "Gasto registrado");
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const isNew = !editingProduct?.id;
        let finalImage = fd.get('image') || "";

        if (productIconPreview) {
            finalImage = productIconPreview;
        }

        // Guard: Firestore doc limit ~1MB — block oversized images
        if (finalImage && String(finalImage).startsWith('data:image')) {
            const sizeBytes = Math.ceil((finalImage.length * 3) / 4);
            if (sizeBytes > 800000) { // 800KB safe limit
                showNotification("Imagen demasiado grande. Usa una imagen más pequeña.", "error");
                return;
            }
        }

        const d = { id: editingProduct?.id || generateSecureId(), name: fd.get('name'), price: tempProductPrice, category: fd.get('category'), image: finalImage, recipe: editingProduct?.recipe || [] };
        saveToDB('products', d, d.id);
        logActivity('Catálogo', `Producto ${isNew ? 'creado' : 'editado'}: ${d.name}`);
        setShowProductForm(false);
        setProductIconPreview(null);
        showNotification("Producto guardado");
    };

    const handleDeleteProduct = (prod) => {
        deleteFromDB('products', prod.id);
        logActivity('Catálogo', `Producto eliminado: ${prod.name}`);
        showNotification("Producto eliminado");
    };

    const handleDeleteExpense = (expense) => {
        setConfirmation({
            show: true,
            message: `¿Eliminar gasto "${expense.description}"?`,
            onConfirm: async () => {
                await deleteFromDB('other_expenses', expense.id);
                logActivity('Gasto', `Gasto eliminado: ${expense.description} ($${expense.amount.toFixed(2)})`);
                setConfirmation({ show: false });
                showNotification("Gasto eliminado");
            }
        });
    };

    const handleSaveIngredient = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const isNew = !editingIngredient?.id;
        const d = {
            id: editingIngredient?.id || generateSecureId(),
            name: fd.get('name'),
            unit: fd.get('unit'),
            cost: tempCost || 0,
            stock: parseFloat(fd.get('stock')),
            ivaPercent: ivaPercent,
            minStock: parseFloat(fd.get('minStock')) || 0
        };
        if (isNew) {
            const log = {
                id: generateSecureId(),
                date: new Date().toISOString(),
                type: 'ADD',
                ingredientName: d.name,
                qtyChange: d.stock,
                reason: 'Inicio',
                newStock: d.stock,
                totalValue: d.stock * d.cost
            };
            saveToDB('stock_history', log, log.id);
        }
        saveToDB('ingredients', d, d.id);
        logActivity('Inventario', `Material ${isNew ? 'creado' : 'editado'}: ${d.name}`);
        setShowIngredientForm(false);
    };

    const handleSaveCustomer = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const isNew = !editingCustomer?.id;
        const d = {
            id: editingCustomer?.id || generateSecureId(),
            name: fd.get('name'),
            phone: fd.get('phone'),
            email: fd.get('email'),
            address: fd.get('address')
        };
        saveToDB('customers', d, d.id);
        logActivity('Clientes', `Cliente ${isNew ? 'creado' : 'editado'}: ${d.name}`);
        setShowCustomerForm(false);
        setEditingCustomer(null);
        showNotification(`Cliente ${isNew ? 'creado' : 'editado'} exitosamente`);
    };

    const handleDeleteCustomer = (customer) => {
        setConfirmation({
            show: true,
            message: `¿Estás seguro de eliminar a ${customer.name}?`,
            onConfirm: async () => {
                try {
                    await deleteFromDB('customers', customer.id);
                    logActivity('Clientes', `Cliente eliminado: ${customer.name}`);
                    showNotification("Cliente eliminado correctamente");
                    setConfirmation({ show: false });
                } catch (e) {
                    console.error("Error al eliminar cliente:", e);
                    showNotification("Error al eliminar cliente", "error");
                }
            }
        });
    };

    const handleUpdateExchangeRate = (val) => {
        if (db) setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'config', 'general'), { exchangeRate: val });
        logActivity('Sistema', `Tasa de cambio actualizada a Bs ${val}`);
    };



    const calculateRecipeCost = (recipe) => { if (!recipe) return 0; return recipe.reduce((total, r) => { const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId)); return total + (ing ? (ing.cost || 0) * r.qty : 0); }, 0); };

    // CORRECCIÓN ESTRICTA DE ZONA HORARIA Y FILTRO DE FECHAS
    const isWithinRange = (dateString) => {
        if (!dateString) return false;
        if (!startDate && !endDate) return true;

        const d = getZonedDate(dateString);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dStr = `${yyyy}-${mm}-${dd}`;

        if (startDate && endDate) {
            return dStr >= startDate && dStr <= endDate;
        } else if (startDate) {
            return dStr >= startDate;
        } else if (endDate) {
            return dStr <= endDate;
        }
        return true;
    };

    const isWithinPeriod = (dateString) => {
        if (viewMode === 'range') return isWithinRange(dateString);
        const d = getZonedDate(dateString);
        const target = getZonedDate(currentDateView);
        if (viewMode === 'daily') return d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
        else if (viewMode === 'monthly') return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
        return true;
    };

    const filterAndSort = (data, fieldsToCheck = [], useDateFilter = false, usePeriodFilter = false) => {
        let processed = [...data];
        if (useDateFilter) processed = processed.filter(item => isWithinRange(item.date));
        if (usePeriodFilter) processed = processed.filter(item => isWithinPeriod(item.date));
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            processed = processed.filter(item => fieldsToCheck.some(field => item[field] && String(item[field]).toLowerCase().includes(q)));
        }
        processed.sort((a, b) => {
            let valA = a[sortConfig.key], valB = b[sortConfig.key];
            if (sortConfig.key === 'date' || sortConfig.key === 'id') { valA = new Date(a.date || 0).getTime(); valB = new Date(b.date || 0).getTime(); }
            if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
            return sortConfig.direction === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
        });
        return processed;
    };

    const callGeminiAI = async (prompt, title) => { setAiModal({ show: true, title, content: '', loading: true }); try { const apiKey = "AIzaSyDQfb1krfzT_4LKyqPmYH-7zXedNd-hzHc"; const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }); const data = await response.json(); setAiModal(prev => ({ ...prev, loading: false, content: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta." })); } catch (error) { setAiModal(prev => ({ ...prev, loading: false, content: `Error: ${error.message}.` })); } };

    // --- RESTAURACIÓN DE BACKUP MEJORADA (BORRA DATOS ANTIGUOS) ---
    const handleImportData = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsedData = JSON.parse(event.target.result);
                setConfirmation({
                    show: true,
                    message: `⚠ ATENCIÓN: Esta acción BORRARÁ TODOS los datos actuales y restaurará los del archivo. ¿Continuar?`,
                    onConfirm: async () => {
                        setConfirmation({ show: false });
                        setIsRestoring(true);
                        setRestoreStatus("Limpiando base de datos...");

                        try {
                            const collectionsMap = { ingredients: 'ingredients', products: 'products', salesHistory: 'sales', stockHistory: 'stock_history', otherExpenses: 'other_expenses', pendingOrders: 'pending_orders', bitacoraLogs: 'bitacora' };

                            // 1. Borrar datos existentes
                            for (const colName of Object.values(collectionsMap)) {
                                const q = query(collection(db, 'artifacts', currentAppId, 'public', 'data', colName));
                                const snapshot = await getDocs(q);
                                if (!snapshot.empty) {
                                    const batch = writeBatch(db);
                                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                                    await batch.commit();
                                }
                            }

                            // 2. Insertar nuevos datos
                            let totalItems = 0;
                            for (const [jsonKey, collectionName] of Object.entries(collectionsMap)) {
                                if (parsedData[jsonKey] && Array.isArray(parsedData[jsonKey])) {
                                    setRestoreStatus(`Restaurando ${jsonKey}...`);
                                    const items = parsedData[jsonKey];
                                    const batchSize = 400; // Firestore batch limit
                                    for (let i = 0; i < items.length; i += batchSize) {
                                        const chunk = items.slice(i, i + batchSize);
                                        const batch = writeBatch(db);
                                        chunk.forEach(item => {
                                            if (item.id) {
                                                const ref = doc(db, 'artifacts', currentAppId, 'public', 'data', collectionName, item.id.toString());
                                                batch.set(ref, item);
                                                totalItems++;
                                            }
                                        });
                                        await batch.commit();
                                    }
                                }
                            }

                            logActivity('Sistema', 'Restauración de base de datos desde copia local completa.');
                            showNotification(`Restauración completada: Base de datos limpia y ${totalItems} registros importados.`, "success");
                        } catch (err) { console.error(err); showNotification("Error crítico al restaurar: " + err.message, "error"); } finally { setIsRestoring(false); setRestoreStatus(""); }
                    }
                });
            } catch (err) { console.error(err); showNotification("Error al leer archivo de respaldo", "error"); }
        };
        reader.readAsText(file); e.target.value = null;
    };

    const handleExportData = () => {
        const dataStr = JSON.stringify({ ingredients, products, salesHistory, stockHistory, otherExpenses, pendingOrders, bitacoraLogs }, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_yuyas_${formatDateApp(new Date(), 'date').replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logActivity('Sistema', 'Respaldo de datos descargado');
    };

    const handleLoadSublimationDemoData = () => {
        setConfirmation({
            show: true,
            message: "¿Estás seguro de que quieres cargar el catálogo demo de Sublimados? Esto BORRARÁ permanentemente todos tus datos actuales de Firestore.",
            onConfirm: async () => {
                setConfirmation({ show: false });
                setIsRestoring(true);
                setRestoreStatus("Inicializando base de datos de Sublimación...");
                try {
                    const collectionsMap = {
                        ingredients: 'ingredients',
                        products: 'products',
                        salesHistory: 'sales',
                        stockHistory: 'stock_history',
                        otherExpenses: 'other_expenses',
                        pendingOrders: 'pending_orders',
                        bitacoraLogs: 'bitacora'
                    };

                    // 1. Limpiar colecciones
                    for (const colName of Object.values(collectionsMap)) {
                        const q = query(collection(db, 'artifacts', currentAppId, 'public', 'data', colName));
                        const snapshot = await getDocs(q);
                        if (!snapshot.empty) {
                            const batch = writeBatch(db);
                            snapshot.docs.forEach(doc => batch.delete(doc.ref));
                            await batch.commit();
                        }
                    }

                    // 2. Materiales demo
                    const demoIngredients = [
                        { id: 'mat-taza-blanca', name: 'Taza Blanca de Cerámica 11oz', unit: 'Unid', cost: 1.20, stock: 150, minStock: 24, ivaPercent: 0 },
                        { id: 'mat-taza-magica', name: 'Taza Mágica de Cerámica 11oz', unit: 'Unid', cost: 2.50, stock: 50, minStock: 12, ivaPercent: 0 },
                        { id: 'mat-camiseta-m', name: 'Camiseta Poliéster Blanca M', unit: 'Unid', cost: 3.00, stock: 80, minStock: 15, ivaPercent: 0 },
                        { id: 'mat-camiseta-l', name: 'Camiseta Poliéster Blanca L', unit: 'Unid', cost: 3.20, stock: 60, minStock: 15, ivaPercent: 0 },
                        { id: 'mat-gorra-base', name: 'Gorra Trucker Base', unit: 'Unid', cost: 1.80, stock: 40, minStock: 10, ivaPercent: 0 },
                        { id: 'mat-mousepad-base', name: 'Mousepad Neopreno Base', unit: 'Unid', cost: 1.00, stock: 100, minStock: 20, ivaPercent: 0 },
                        { id: 'mat-papel-a4', name: 'Papel Sublimación A4', unit: 'Unid', cost: 0.15, stock: 500, minStock: 50, ivaPercent: 0 },
                        { id: 'mat-tinta-ml', name: 'Tinta Sublimación CMYK', unit: 'ml', cost: 0.05, stock: 1000, minStock: 200, ivaPercent: 0 },
                        { id: 'mat-cinta-thermal', name: 'Cinta Térmica Sublimación', unit: 'm', cost: 0.10, stock: 100, minStock: 10, ivaPercent: 0 }
                    ];

                    const batchIngredients = writeBatch(db);
                    demoIngredients.forEach(ing => {
                        const ref = doc(db, 'artifacts', currentAppId, 'public', 'data', 'ingredients', ing.id);
                        batchIngredients.set(ref, ing);
                    });
                    await batchIngredients.commit();

                    // 3. Productos demo
                    const demoProducts = [
                        {
                            id: 'prod-taza-blanca',
                            name: 'Taza Blanca Personalizada',
                            price: 5.00,
                            category: 'Tazas',
                            image: '☕',
                            recipe: [
                                { ingredientId: 'mat-taza-blanca', qty: 1 },
                                { ingredientId: 'mat-papel-a4', qty: 0.25 },
                                { ingredientId: 'mat-tinta-ml', qty: 2 },
                                { ingredientId: 'mat-cinta-thermal', qty: 0.05 }
                            ]
                        },
                        {
                            id: 'prod-taza-magica',
                            name: 'Taza Mágica Personalizada',
                            price: 8.50,
                            category: 'Tazas',
                            image: '✨',
                            recipe: [
                                { ingredientId: 'mat-taza-magica', qty: 1 },
                                { ingredientId: 'mat-papel-a4', qty: 0.25 },
                                { ingredientId: 'mat-tinta-ml', qty: 2 },
                                { ingredientId: 'mat-cinta-thermal', qty: 0.05 }
                            ]
                        },
                        {
                            id: 'prod-camiseta-m',
                            name: 'Camiseta Sublimada Talla M',
                            price: 12.00,
                            category: 'Telas',
                            image: '👕',
                            recipe: [
                                { ingredientId: 'mat-camiseta-m', qty: 1 },
                                { ingredientId: 'mat-papel-a4', qty: 1 },
                                { ingredientId: 'mat-tinta-ml', qty: 5 },
                                { ingredientId: 'mat-cinta-thermal', qty: 0.1 }
                            ]
                        },
                        {
                            id: 'prod-camiseta-l',
                            name: 'Camiseta Sublimada Talla L',
                            price: 13.00,
                            category: 'Telas',
                            image: '👕',
                            recipe: [
                                { ingredientId: 'mat-camiseta-l', qty: 1 },
                                { ingredientId: 'mat-papel-a4', qty: 1 },
                                { ingredientId: 'mat-tinta-ml', qty: 5 },
                                { ingredientId: 'mat-cinta-thermal', qty: 0.1 }
                            ]
                        },
                        {
                            id: 'prod-gorra-trucker',
                            name: 'Gorra Trucker Sublimada',
                            price: 6.00,
                            category: 'Accesorios',
                            image: '🧢',
                            recipe: [
                                { ingredientId: 'mat-gorra-base', qty: 1 },
                                { ingredientId: 'mat-papel-a4', qty: 0.12 },
                                { ingredientId: 'mat-tinta-ml', qty: 1 },
                                { ingredientId: 'mat-cinta-thermal', qty: 0.03 }
                            ]
                        },
                        {
                            id: 'prod-mousepad',
                            name: 'Mousepad Personalizado',
                            price: 4.50,
                            category: 'Accesorios',
                            image: '🖱️',
                            recipe: [
                                { ingredientId: 'mat-mousepad-base', qty: 1 },
                                { ingredientId: 'mat-papel-a4', qty: 0.25 },
                                { ingredientId: 'mat-tinta-ml', qty: 1.5 },
                                { ingredientId: 'mat-cinta-thermal', qty: 0.05 }
                            ]
                        }
                    ];

                    const batchProducts = writeBatch(db);
                    demoProducts.forEach(prod => {
                        const ref = doc(db, 'artifacts', currentAppId, 'public', 'data', 'products', prod.id);
                        batchProducts.set(ref, prod);
                    });
                    await batchProducts.commit();

                    // 4. Kardex inicial
                    const batchLogs = writeBatch(db);
                    demoIngredients.forEach(ing => {
                        const logId = generateSecureId();
                        const logRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'stock_history', logId);
                        batchLogs.set(logRef, {
                            id: logId,
                            date: new Date().toISOString(),
                            type: 'ADD',
                            ingredientName: ing.name,
                            qtyChange: ing.stock,
                            reason: 'Carga de Catálogo Demo',
                            newStock: ing.stock,
                            totalValue: ing.stock * ing.cost
                        });
                    });
                    await batchLogs.commit();

                    // Log activity in bitacora
                    const logId = generateSecureId();
                    await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'bitacora', logId), {
                        id: logId,
                        date: new Date().toISOString(),
                        userName: user.email,
                        action: 'Sistema',
                        details: 'Inicializado catálogo demo de Sublimación y Diseño.'
                    });

                    showNotification("Catálogo demo cargado con éxito.", "success");
                } catch (err) {
                    console.error("Error al cargar demo:", err);
                    showNotification("Error: " + err.message, "error");
                } finally {
                    setIsRestoring(false);
                    setRestoreStatus("");
                }
            }
        });
    };

    // --- CALCULOS FINANCIEROS MEMOIZADOS ---
    const inventoryValue = useMemo(() => ingredients.reduce((sum, ing) => sum + (ing.stock * (ing.cost || 0)), 0), [ingredients]);
    const financialData = useMemo(() => {
        const activeSales = filterAndSort(salesHistory, [], false, true);
        const activeStock = filterAndSort(stockHistory, [], false, true);
        const activeExpenses = filterAndSort(otherExpenses, [], false, true);
        
        const income = activeSales.reduce((acc, sale) => acc + sale.total, 0);
        let cogs = 0;
        activeSales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (product && product.recipe) {
                    const unitCost = product.recipe.reduce((sum, r) => {
                        const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId));
                        return sum + (ing ? (ing.cost || 0) * r.qty : 0);
                    }, 0);
                    cogs += unitCost * item.qty;
                }
            });
        });
        
        const activeLosses = activeStock.filter(l => l.type === 'LOSS');
        const lossCost = activeLosses.reduce((acc, l) => acc + Math.abs(l.totalValue || 0), 0);
        
        const grossProfit = income - cogs;
        const invExp = activeStock.filter(l => l.type === 'ADD' && !l.reason.includes('Cancelación')).reduce((acc, l) => acc + (l.totalValue || 0), 0);
        const otherExp = activeExpenses.reduce((acc, e) => acc + e.amount, 0);
        
        return { 
            income, 
            cogs, 
            grossProfit, 
            lossCost, 
            expenses: invExp + otherExp, 
            netCashFlow: income - (invExp + otherExp) 
        };
    }, [salesHistory, stockHistory, otherExpenses, viewMode, currentDateView, products, ingredients]);
 
    const handleDownloadBalance = () => {
        const isVES = currencyMode === 'VES';
        const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
        const data = [
            ['Ventas Totales', formatVal(financialData.income)],
            ['Costo de Ventas', formatVal(financialData.cogs)],
            ['Costo de Mermas', formatVal(financialData.lossCost)],
            ['Ganancia Bruta Ajustada', formatVal(financialData.grossProfit - financialData.lossCost)],
            ['Gastos Operativos', formatVal(financialData.expenses)],
            ['Flujo Neto', formatVal(financialData.netCashFlow)]
        ];
        generatePDF('Balance Financiero', ["Concepto", "Monto"], data, 'balance.pdf');
    };

    // --- RENDERIZADO PRINCIPAL ---
    if (authLoading || ((user || isPublicCatalogMode) && dataLoading)) { return (<div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 size={48} className="animate-spin text-teal-500" /><p className="ml-3 text-slate-400">Sincronizando con la nube...</p></div>); }

    if (isPublicCatalogMode) {
        return (
            <PublicCatalogScreen 
                products={products} 
                exchangeRate={exchangeRate} 
                user={user}
                onGoToLogin={() => {
                    if (user) {
                        window.location.hash = '#/dashboard';
                        setIsPublicCatalogMode(false);
                    } else {
                        window.location.hash = '#/login';
                        setIsPublicCatalogMode(false);
                    }
                }} 
            />
        );
    }

    if (!user) {
        return (
            <LoginScreen 
                onLogin={handleLogin} 
                onViewPublicCatalog={() => {
                    window.location.hash = '#/catalogo';
                    setIsPublicCatalogMode(true);
                }} 
            />
        );
    }

    return (
        <div className="flex h-[100dvh] bg-slate-100 font-sans text-slate-800 overflow-hidden text-xs md:text-sm lg:text-base">
            <aside className={`fixed z-40 inset-y-0 left-0 w-72 bg-slate-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col`}>
                <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
                    <div className="w-12 h-12 rounded-xl border border-slate-700 overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-lg"><img src="/JLlogo.png" alt="Logo" className="w-full h-full object-cover" /></div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white">Sweet Ink</h1>
                        <FixedClock />
                    </div>
                    <button className="md:hidden ml-auto p-2" onClick={() => setIsMobileMenuOpen(false)}><X /></button>
                </div>

                <div className="px-6 py-2">
                    <div className={`text-xs px-2 py-1 rounded flex items-center gap-2 border ${connectionStatus.error ? 'bg-red-900/50 text-red-200 border-red-800' : 'bg-slate-800 text-teal-500 border-slate-700'}`}>
                        {connectionStatus.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                        <span className="truncate">{connectionStatus.error ? 'Error de Conexión' : user.email}</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                    {(() => {
                        const items = [
                            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
                            { id: 'pos', label: 'Punto de Venta', icon: <CartIcon size={20} /> },
                            { id: 'pending', label: 'Pedidos', icon: <Clock3 size={20} />, count: pendingOrders.length },
                            { id: 'history', label: 'Historial', icon: <ClipboardList size={20} /> },
                            { id: 'customers', label: 'Clientes', icon: <Users size={20} /> },
                        ].filter(item => hasPermission(item.id, 'view'));
                        if (items.length === 0) return null;
                        return (
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-3 mb-1">Operaciones</div>
                                {items.map(item => (
                                    <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-teal-500 text-slate-900 shadow-xl shadow-teal-500/10' : 'text-slate-400 hover:bg-slate-800'}`}>
                                        {item.icon} <span className="truncate">{item.label}</span>
                                        {item.count > 0 && <span className="ml-auto bg-slate-800 text-teal-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.count}</span>}
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    {(() => {
                        const items = [
                            { id: 'products', label: 'Catálogo', icon: <Palette size={20} /> },
                            { id: 'inventory', label: 'Inventario', icon: <Package size={20} /> },
                            { id: 'inventory_history', label: 'Entrada/Salida', icon: <ArrowRightLeft size={20} /> },
                        ].filter(item => hasPermission(item.id, 'view'));
                        if (items.length === 0) return null;
                        return (
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-3 mb-1">Catálogo</div>
                                {items.map(item => (
                                    <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-teal-500 text-slate-900 shadow-xl shadow-teal-500/10' : 'text-slate-400 hover:bg-slate-800'}`}>
                                        {item.icon} <span className="truncate">{item.label}</span>
                                        {item.count > 0 && <span className="ml-auto bg-slate-800 text-teal-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.count}</span>}
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    {(() => {
                        const items = [
                            { id: 'balance', label: 'Balance', icon: <Wallet size={20} /> },
                            { id: 'reports', label: 'Reportes', icon: <TrendingUp size={20} /> },
                            { id: 'bitacora', label: 'Bitácora', icon: <FileSearch size={20} /> },
                            { id: 'settings', label: 'Configuración', icon: <Settings size={20} /> },
                        ].filter(item => hasPermission(item.id, 'view'));
                        if (items.length === 0) return null;
                        return (
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-3 mb-1">Administración</div>
                                {items.map(item => (
                                    <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-teal-500 text-slate-900 shadow-xl shadow-teal-500/10' : 'text-slate-400 hover:bg-slate-800'}`}>
                                        {item.icon} <span className="truncate">{item.label}</span>
                                        {item.count > 0 && <span className="ml-auto bg-slate-800 text-teal-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.count}</span>}
                                    </button>
                                ))}
                            </div>
                        );
                    })()}
                </nav>
                <div className="p-4 border-t border-slate-700/50 bg-slate-800/50 space-y-3"><div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700"><DollarSign size={16} className="text-green-400" /><input type="number" value={exchangeRate} onChange={(e) => handleUpdateExchangeRate(parseFloat(e.target.value))} className="bg-transparent w-full text-white font-mono text-right focus:outline-none" /><span className="text-slate-500 text-xs">Bs</span></div><button onClick={() => handleLogout()} className="w-full flex items-center gap-2 p-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><LogOut size={16} /> Cerrar Sesión</button></div>
            </aside>

            <main className="flex-1 overflow-y-auto relative p-4 md:p-6 lg:p-8 bg-slate-100">
                <button className="md:hidden absolute top-4 left-4 z-20 bg-white p-2 rounded-full shadow-lg" onClick={() => setIsMobileMenuOpen(true)}><Menu className="text-slate-700" /></button>

                {/* Switch de moneda global */}
                <div className={`absolute top-4 z-20 flex items-center gap-2 transition-all duration-300 ${activeTab === 'pos' ? 'right-4 md:right-6 lg:right-[calc(33.333333%+3rem)]' : 'right-4 md:right-6 lg:right-8'}`}>
                    <div className="bg-white/80 backdrop-blur-md border border-white/40 shadow-lg rounded-2xl p-1 flex items-center gap-1 select-none">
                        <button 
                            type="button"
                            onClick={() => setCurrencyMode('USD')}
                            className={`px-3 py-1.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-wider ${currencyMode === 'USD' ? 'bg-teal-500 text-slate-900 shadow-md shadow-teal-500/10' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                            $ USD
                        </button>
                        <button 
                            type="button"
                            onClick={() => setCurrencyMode('VES')}
                            className={`px-3 py-1.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-wider ${currencyMode === 'VES' ? 'bg-teal-500 text-slate-900 shadow-md shadow-teal-500/10' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                            Bs VES
                        </button>
                    </div>
                </div>

                {/* --- DASHBOARD --- */}
                {activeTab === 'dashboard' && (
                    <div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0 pb-20">
                        {/* Cabecera */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 md:p-6 rounded-2xl border border-white/40 shadow-sm">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                    <LayoutDashboard className="text-teal-500" /> Dashboard General
                                </h2>
                                <p className="text-slate-500 text-xs mt-1">Resumen del estado actual del negocio en tiempo real</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Actualizado en vivo</span>
                            </div>
                        </div>

                        {/* Tarjetas de Indicadores (KPIs) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <GlassCard className="p-6 border-l-4 border-emerald-500 transition-all hover:scale-[1.01]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos del Día</p>
                                        <div className="mt-2">
                                            <PriceDisplay amount={dailyIncome} exchangeRate={exchangeRate} size="large" />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                                        <DollarSign size={24} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 font-medium">Ventas acumuladas hoy ({todaySales.length} transacciones)</p>
                            </GlassCard>

                            <GlassCard className="p-6 border-l-4 border-teal-500 transition-all hover:scale-[1.01]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Órdenes del Día</p>
                                        <h3 className="text-3xl font-black text-slate-800 mt-2 font-mono">{dailyOrdersCount}</h3>
                                    </div>
                                    <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                                        <Zap size={24} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 font-medium">Pedidos concretados y cobrados hoy</p>
                            </GlassCard>

                            <GlassCard className="p-6 border-l-4 border-indigo-500 transition-all hover:scale-[1.01]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Promedio</p>
                                        <div className="mt-2">
                                            <PriceDisplay amount={averageOrderCost} exchangeRate={exchangeRate} size="large" />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                        <Calculator size={24} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 font-medium">Costo promedio de orden facturada hoy</p>
                            </GlassCard>
                        </div>

                        {/* Gráficos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gráfico de flujo de ventas de hoy */}
                            <GlassCard className="p-6 flex flex-col">
                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <TrendingUp size={18} className="text-teal-500" /> Flujo de Ventas (Hoy)
                                    </h3>
                                    <p className="text-xs text-slate-400">Distribución de ingresos por hora en el día actual</p>
                                </div>
                                <div style={{ height: '260px' }} className="w-full flex-1">
                                    {todaySales.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <TrendingUp size={48} className="opacity-25 mb-2 animate-pulse" />
                                            <p className="text-sm">No hay ventas registradas el día de hoy.</p>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={hourlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                                                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => currencyMode === 'VES' ? `Bs ${(val * exchangeRate).toFixed(0)}` : `$${val}`} />
                                                <Tooltip 
                                                    formatter={(value) => [currencyMode === 'VES' ? `Bs ${(value * exchangeRate).toFixed(2)}` : `$${value.toFixed(2)}`, 'Vendido']}
                                                    labelClassName="font-bold text-slate-700"
                                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }} 
                                                />
                                                <Area type="monotone" dataKey="Monto" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMonto)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </GlassCard>

                            {/* Gráfico de balance semanal */}
                            <GlassCard className="p-6 flex flex-col">
                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <BarChart size={18} className="text-teal-500" /> Balance Semanal (Gastos vs Ingresos)
                                    </h3>
                                    <p className="text-xs text-slate-400">Comparativa histórica de ingresos y egresos de los últimos 7 días</p>
                                </div>
                                <div style={{ height: '260px' }} className="w-full flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyBalanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => currencyMode === 'VES' ? `Bs ${(val * exchangeRate).toFixed(0)}` : `$${val}`} />
                                            <Tooltip 
                                                formatter={(value, name) => [currencyMode === 'VES' ? `Bs ${(value * exchangeRate).toFixed(2)}` : `$${value.toFixed(2)}`, name]}
                                                labelClassName="font-bold text-slate-700"
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }} 
                                            />
                                            <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                                            <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Listas y Alertas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top productos más vendidos */}
                            <GlassCard className="p-6 flex flex-col h-[380px]">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <Sparkles size={18} className="text-teal-500" /> Top Productos Más Vendidos
                                </h3>
                                <div className="overflow-y-auto flex-1 custom-scrollbar pr-1 space-y-3">
                                    {topSellingProducts.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                            <Utensils size={40} className="opacity-20 mb-2" />
                                            <p className="text-xs">No hay datos de ventas.</p>
                                        </div>
                                    ) : (
                                        topSellingProducts.map((p, idx) => (
                                            <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100/60 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-black text-slate-400 text-sm w-5">{idx + 1}</span>
                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-2xl border shadow-inner overflow-hidden shrink-0">
                                                        {p.image && (String(p.image).startsWith('data:image') || String(p.image).startsWith('http')) ? (
                                                            <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            p.image || '🎨'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-xs md:text-sm text-slate-800">{p.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">Uds. vendidas: <span className="font-bold text-slate-600">{p.qty}</span></p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <PriceDisplay amount={p.totalSales} exchangeRate={exchangeRate} size="small" align="right" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </GlassCard>

                            {/* Alertas de stock crítico */}
                            <GlassCard className="p-6 flex flex-col h-[380px]">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <AlertTriangle size={18} className="text-rose-500 animate-pulse" /> Materiales de Stock Crítico
                                </h3>
                                <div className="overflow-y-auto flex-1 custom-scrollbar pr-1 space-y-3">
                                    {criticalStockProducts.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-emerald-500 py-10 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200">
                                            <CheckCircle size={40} className="mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-wider">Inventario Saludable</p>
                                            <p className="text-[10px] text-emerald-600/70 mt-1">Todos los materiales están por encima del stock mínimo.</p>
                                        </div>
                                    ) : (
                                        criticalStockProducts.map((ing) => {
                                            const stockPercent = ing.minStock > 0 ? Math.min((ing.stock / ing.minStock) * 100, 100) : 0;
                                            return (
                                                <div key={ing.id} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100/60 hover:bg-slate-50 transition-colors">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-xs md:text-sm text-slate-800">{ing.name}</h4>
                                                            <p className="text-[10px] text-slate-400 font-medium">Mínimo requerido: <span className="font-bold">{ing.minStock} {ing.unit}</span></p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-xs font-black font-mono ${ing.stock === 0 ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'} px-2 py-0.5 rounded-lg border border-current`}>
                                                                {ing.stock} {ing.unit}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Barra de progreso */}
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border">
                                                        <div 
                                                            className={`h-full rounded-full ${ing.stock === 0 ? 'bg-red-500' : 'bg-amber-500'}`} 
                                                            style={{ width: `${Math.max(stockPercent, 5)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </GlassCard>
                        </div>

                        {/* Historial de pedidos más recientes en tiempo real */}
                        <GlassCard className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <History size={18} className="text-teal-500" /> Historial de Pedidos Recientes
                                    </h3>
                                    <p className="text-xs text-slate-400">Últimas 10 transacciones (pendientes y cobradas) en tiempo real</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setActiveTab('pos')} 
                                        className="px-3 py-1.5 bg-teal-500 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/10 hover:bg-teal-400 transition-colors"
                                    >
                                        <Plus size={14} /> Nueva Venta
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('history')} 
                                        className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
                                    >
                                        Ver Todo
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[600px]">
                                    <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-xs">
                                        <tr>
                                            <th className="p-3">Fecha y Hora</th>
                                            <th className="p-3">Cliente / Detalle</th>
                                            <th className="p-3 text-center">Items</th>
                                            <th className="p-3 text-right">Monto</th>
                                            <th className="p-3 text-center">Estado</th>
                                            <th className="p-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {recentOrdersWithStatus.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-slate-400">
                                                    No se han registrado transacciones aún.
                                                </td>
                                            </tr>
                                        ) : (
                                            recentOrdersWithStatus.map((order) => (
                                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-3 text-xs font-mono text-slate-500">
                                                        {formatDateApp(order.rawDate, 'full')}
                                                    </td>
                                                    <td className="p-3 font-bold text-xs md:text-sm">
                                                        {order.description || (order.type === 'completed' ? 'Consumidor Final' : 'Cliente General')}
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-xs md:text-sm">
                                                        {order.items?.reduce((acc, curr) => acc + curr.qty, 0) || 0}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <PriceDisplay amount={order.total} exchangeRate={exchangeRate} size="small" align="right" />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Badge type={order.badgeType}>{order.statusLabel}</Badge>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {order.type === 'completed' ? (
                                                                <button 
                                                                    onClick={() => { setSelectedSale(order); setObservationText(order.observation || ""); }} 
                                                                    className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                                                                    title="Ver Detalle de Venta"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => setActiveTab('pending')} 
                                                                    className="p-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
                                                                    title="Gestionar Pedido Pendiente"
                                                                >
                                                                    <Zap size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* --- POS --- */}
                {activeTab === 'pos' && (<div className="flex flex-col lg:flex-row gap-6 h-full pb-20 lg:pb-0"><div className="lg:w-[73%] space-y-4 fade-in"><header className="flex flex-col gap-2 mt-10 md:mt-0"><h2 className="text-2xl md:text-3xl font-black text-slate-800">{editingOrderId ? `Editando Venta` : 'Punto de Venta'}</h2><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{ value: 'name', label: 'Nombre' }, { value: 'price', label: 'Precio' }, { value: 'category', label: 'Categoría' }]} placeholder="Buscar producto..." /></header><div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar ">{['Todos', ...new Set(products.map(p => p.category))].map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold ${selectedCategory === cat ? 'bg-teal-500 text-slate-900' : 'bg-white text-slate-600 shadow-sm'}`}>{cat}</button>))}</div><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 items-start pb-24 md:pb-0">{filterAndSort(products, ['name', 'category']).filter(p => selectedCategory === 'Todos' || p.category === selectedCategory).map(product => (<ProductCard key={product.id} product={product} ingredients={ingredients} addToCart={addToCart} exchangeRate={exchangeRate} getProductMaxStock={getProductMaxStock} />))}</div></div><div className={`fixed inset-x-0 bottom-0 z-30 lg:relative lg:w-[27%] lg:h-auto lg:block transition-transform duration-300 ${isCartOpenMobile ? 'translate-y-0' : 'translate-y-[calc(100%-85px)]'} lg:translate-y-0`}><GlassCard className="h-[80vh] lg:h-[calc(100vh-4rem)] flex flex-col rounded-b-none lg:rounded-2xl border-b-0 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"><div onClick={() => window.innerWidth < 1024 && setIsCartOpenMobile(!isCartOpenMobile)} className={`p-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl cursor-pointer lg:cursor-default ${editingOrderId ? 'bg-teal-100' : 'bg-white'}`}><div className="flex items-center gap-2"><h3 className="font-bold text-lg flex items-center gap-2"><CartIcon size={20} /> Orden</h3><Badge>{cart.reduce((a, c) => a + c.qty, 0)} items</Badge></div><div className="lg:hidden text-slate-400 flex items-center gap-2"><span className="font-bold text-teal-600"><PriceDisplay amount={cart.reduce((s, i) => s + i.price * i.qty, 0)} exchangeRate={exchangeRate} size="small" /></span>{isCartOpenMobile ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</div></div><div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white/50">{cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400"><Palette size={48} className="opacity-20 mb-4" /><p>Vacío</p></div> : cart.map(item => (<div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100"><div className="flex items-center gap-3">{item.image && (String(item.image).startsWith('data:image') || String(item.image).startsWith('http')) ? <img src={item.image} alt="" className="w-8 h-8 object-contain rounded" /> : <span className="text-xl">{item.image || '🎨'}</span>}<div className="flex-1"> <p className="font-bold text-sm leading-none">{item.name}</p><PriceDisplay amount={item.price} exchangeRate={exchangeRate} size="small" /><input type="text" placeholder="Talla, Color, Detalles..." value={item.variantDetails || ''} onChange={(e) => setCart(prev => prev.map(p => p.id === item.id ? {...p, variantDetails: e.target.value} : p))} className="text-xs p-1 mt-1 bg-slate-50 border border-slate-200 rounded outline-none focus:border-teal-500 w-full"/></div></div><div className="flex items-center gap-2"><button onClick={() => setCart(prev => prev.map(p => p.id === item.id ? { ...p, qty: p.qty - 1 } : p).filter(p => p.qty > 0))} className="p-2 bg-slate-100 rounded hover:bg-slate-200"><Minus size={14} /></button><span className="font-bold w-6 text-center text-sm">{item.qty}</span><button onClick={() => addToCart(item)} className="p-2 bg-slate-100 rounded hover:bg-slate-200"><Plus size={14} /></button></div></div>))}</div><div className="p-4 bg-white border-t border-slate-100 space-y-3 pb-8 lg:pb-4"><div className="flex justify-between font-black text-xl"><span>Total</span><div className="text-right"><PriceDisplay amount={cart.reduce((s, i) => s + i.price * i.qty, 0)} exchangeRate={exchangeRate} align="right" size="large" /></div></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha de Entrega (Prometida)</label><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha de Entrega (Prometida)</label><input type="date" value={orderDeliveryDate} onChange={(e) => setOrderDeliveryDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none shadow-inner text-slate-500" /></div></div><input type="url" value={orderDesignLink} onChange={(e) => setOrderDesignLink(e.target.value)} placeholder="Enlace del Diseño (Drive, Canva, etc)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none shadow-inner" /><input type="text" value={saleDescription} onChange={(e) => setSaleDescription(e.target.value)} placeholder="Cliente / Nota..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-500 outline-none shadow-inner" /><div className="grid grid-cols-3 gap-2">{orderDesignLink && <a href={orderDesignLink} target="_blank" rel="noreferrer" className="col-span-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:bg-indigo-100 transition-colors"><Link size={14}/> Ver Diseño Original</a>}
                                <GlassButton variant="secondary" onClick={() => { setCart([]); setEditingOrderId(null); setIsCartOpenMobile(false); }} disabled={!hasPermission('pos', 'edit')} title="Vaciar carrito"><Trash2 size={16} /></GlassButton>
                                <GlassButton onClick={handleSaveToPending} disabled={cart.length === 0 || !hasPermission('pos', 'edit')} variant="kitchen" title="Enviar a pendientes">{editingOrderId ? 'Actualizar' : 'Pendientes'}</GlassButton>
                                <GlassButton onClick={handleDirectCharge} disabled={cart.length === 0 || !hasPermission('pos', 'edit')} variant="primary" title="Cobrar inmediatamente">Cobrar</GlassButton>
                                </div></div></GlassCard></div></div>)}

                {/* --- PENDIENTES --- */}
                {activeTab === 'pending' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 md:p-6 rounded-2xl border border-white/40 shadow-sm"><div><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Clock3 className="text-teal-600" /> Pendientes</h2></div><div className="w-full md:w-auto"><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{ value: 'date', label: 'Fecha' }]} /></div></header><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 pb-20">{filterAndSort(pendingOrders, ['description', 'id']).map(order => (<GlassCard key={order.id} className="border-l-4 border-teal-500 p-0 flex flex-col"><div className="p-4 bg-teal-50 flex justify-between"><div><h3 className="font-bold text-lg">{order.description}</h3><p className="text-xs text-slate-500">{formatDateApp(order.date, 'time')} {order.deliveryDate && <span className="text-red-500 font-bold ml-2">Entrega: {order.deliveryDate}</span>}</p></div><Badge type="warning">Pendiente</Badge></div><div className="p-4 flex-1 space-y-1">{order.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm"><span className="text-slate-600"><b>{i.qty}</b> {i.name} {i.variantDetails ? <span className="text-xs text-indigo-500">({i.variantDetails})</span> : ""}</span></div>)}</div><div className="p-4 bg-white border-t flex flex-col gap-3"><div className="flex justify-between items-end">
                                            <span className="text-xs text-slate-400">Total</span>
                                            <PriceDisplay amount={order.total} exchangeRate={exchangeRate} align="right" />
                                        </div>
                                            {hasPermission('pending', 'edit') ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button onClick={() => { setCart(order.items); setSaleDescription(order.description); setOrderDeliveryDate(order.deliveryDate || ""); setOrderDesignLink(order.designLink || ""); setEditingOrderId(order.id); setActiveTab('pos'); }} className="py-3 md:py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex justify-center items-center gap-1 touch-manipulation hover:bg-slate-200 transition-colors">
                                                        <Edit size={14} /> Editar
                                                    </button>
                                                    <button onClick={() => handleCancelPendingOrder(order)} className="py-3 md:py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex justify-center items-center gap-1 touch-manipulation hover:bg-red-100 transition-colors">
                                                        <Trash2 size={14} /> Cancelar
                                                    </button>
                                                    <button onClick={() => handleCobrar(order)} className="py-3 md:py-2 bg-gradient-to-br from-teal-400 to-teal-600 text-slate-900 rounded-lg text-xs font-bold flex justify-center items-center gap-1 touch-manipulation shadow-lg shadow-teal-500/20 active:shadow-none transition-all">
                                                        <Zap size={14} /> Cobrar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center text-xs text-slate-400 italic py-2">Solo Lectura</div>
                                            )}
                                        </div></GlassCard>))}</div></div>)}

                {/* --- MENÚ / PRODUCTOS --- */}
                {activeTab === 'products' && (
                    <div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-2xl border border-white/40 shadow-sm">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Catálogo</h2>
                                <p className="text-slate-500">Gestión de productos</p>
                            </div>
                            <div className="flex w-full md:w-auto gap-2">
                                <GlassButton onClick={handleDownloadMenu} variant="secondary" className="flex-1 md:flex-none">
                                    <Download size={16} /> PDF
                                </GlassButton>
                                {hasPermission('products', 'edit') && (
                                    <GlassButton onClick={() => { setEditingProduct({ recipe: [] }); setProductIconPreview(null); setShowProductForm(true); }} className="flex-1 md:flex-none">
                                        <Plus size={18} /> Nuevo
                                    </GlassButton>
                                )}
                            </div>
                        </div>
                        <AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{ value: 'name', label: 'Nombre' }, { value: 'price', label: 'Precio' }, { value: 'category', label: 'Categoría' }]} />
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar ">
                            {['Todos', ...new Set(products.map(p => p.category))].map(cat => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold ${selectedCategory === cat ? 'bg-teal-500 text-slate-900' : 'bg-white text-slate-600 shadow-sm'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-4 pb-20">
                            {filterAndSort(products, ['name', 'category']).filter(p => selectedCategory === 'Todos' || p.category === selectedCategory).map(prod => (
                                <GlassCard key={prod.id} className="p-4 flex flex-col md:flex-row items-center gap-4 md:gap-6">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="w-16 h-16 flex items-center justify-center shrink-0">
                                            {!prod.image || prod.image === "" ? <Utensils size={32} className="text-slate-300" /> : (String(prod.image).startsWith('data:image') || String(prod.image).startsWith('http') ? <img src={prod.image} alt="" className="w-14 h-14 object-contain rounded-lg shadow-sm" /> : <span className="text-4xl">{prod.image}</span>)}
                                        </div>
                                        <div className="md:hidden flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="font-bold text-sm uppercase tracking-tight leading-tight">{prod.name}</h4>
                                                {prod.hidden && <Badge type="danger">Oculto</Badge>}
                                            </div>
                                            <PriceDisplay amount={prod.price} exchangeRate={exchangeRate} size="small" />
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center md:text-left hidden md:block">
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <h4 className="font-bold text-lg">{prod.name}</h4>
                                            {prod.hidden && <Badge type="danger">Oculto</Badge>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                                            {prod.recipe?.map((r, i) => (
                                                <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                    {ingredients.find(ing => normalizeId(ing.id) === normalizeId(r.ingredientId))?.name || `ID:${r.ingredientId}`} x{r.qty}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-right w-full md:w-auto">
                                        <div className="hidden md:block">
                                            <PriceDisplay amount={prod.price} exchangeRate={exchangeRate} size="large" align="right" />
                                        </div>
                                        <div className="flex gap-2 justify-between md:justify-end mt-1 w-full">
                                            <button onClick={() => callGeminiAI(`Optimiza componentes: ${prod.name}`, "Optimización")} className="p-3 md:p-2 text-teal-500 hover:bg-teal-50 rounded-xl flex-1 md:flex-none flex justify-center border border-slate-100 md:border-transparent transition-colors" title="AI">
                                                <Lightbulb size={18} />
                                            </button>
                                            {hasPermission('products', 'edit') ? (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            const updatedProd = { ...prod, hidden: !prod.hidden };
                                                            saveToDB('products', updatedProd, prod.id);
                                                            logActivity('Catálogo', `${updatedProd.hidden ? 'Ocultado' : 'Mostrado'} en catálogo público: ${prod.name}`);
                                                        }} 
                                                        className={`p-3 md:p-2 rounded-xl flex-1 md:flex-none flex justify-center border border-slate-100 md:border-transparent transition-colors ${prod.hidden ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-teal-600 hover:text-teal-700 hover:bg-teal-50'}`}
                                                        title={prod.hidden ? "Mostrar en catálogo público" : "Ocultar en catálogo público"}
                                                    >
                                                        {prod.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                    <button onClick={() => { setEditingProduct(prod); setProductIconPreview(null); setShowProductForm(true); }} className="p-3 md:p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl flex-1 md:flex-none flex justify-center border border-slate-100 md:border-transparent transition-colors">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteProduct(prod)} className="p-3 md:p-2 text-red-500 hover:bg-red-50 rounded-xl flex-1 md:flex-none flex justify-center border border-slate-100 md:border-transparent transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic flex items-center px-2">Lectura</span>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- HISTORIAL (VENTAS) --- */}
                {activeTab === 'history' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><ClipboardList className="text-teal-500" /> Historial de Ventas</h2><GlassButton variant="gemini" onClick={() => callGeminiAI(`Analiza ventas: ${JSON.stringify(salesHistory.slice(0, 10))}`, "Tendencias")}>Analizar AI</GlassButton></div><div className="bg-white/60 border border-teal-200 p-4 rounded-xl text-sm flex items-center gap-3 text-slate-700 shadow-sm"><Info size={24} className="text-teal-500 shrink-0" /><p>Mostrando las ventas de las fechas seleccionadas. Si borraste el filtro, verás <b>todas</b> las ventas registradas.</p></div><DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onDownloadPdf={() => handleDownloadReport(filterAndSort(salesHistory, [], true))} title="Filtrar Ventas" /><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{ value: 'date', label: 'Fecha' }, { value: 'total', label: 'Total' }]} /><GlassCard className="overflow-hidden"><div className="overflow-x-auto "><table className="w-full text-left text-sm min-w-[600px]"><thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4">Fecha exacta</th><th className="p-4">Cliente</th><th className="p-4 text-center">Items</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{filterAndSort(salesHistory, ['description'], true).map(sale => (<tr key={sale.id} onClick={() => { setSelectedSale(sale); setObservationText(sale.observation || ""); }} className="hover:bg-slate-50 cursor-pointer active:bg-slate-100"><td className="p-4">{formatDateApp(sale.date, 'full')}</td><td className="p-4 font-bold">{sale.description}</td><td className="p-4 text-center">{sale.items.reduce((a, b) => a + b.qty, 0)}</td><td className="p-4 text-right"><PriceDisplay amount={sale.total} exchangeRate={exchangeRate} align="right" size="small" /></td><td className="p-4 text-center"><button className="p-2 bg-white border rounded hover:bg-slate-100"><Eye size={16} /></button></td></tr>))}</tbody></table>{filterAndSort(salesHistory, ['description'], true).length === 0 && <div className="p-8 text-center text-slate-400">No hay ventas registradas en este rango de fechas.</div>}</div></GlassCard></div>)}

                {/* --- BITÁCORA --- */}
                {activeTab === 'bitacora' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><FileSearch className="text-teal-600" /> Registro de Actividades</h2></div><div className="bg-white/60 border border-teal-200 p-4 rounded-xl text-sm flex items-center gap-3 text-slate-800 shadow-sm"><Activity size={24} className="text-teal-500 shrink-0" /><p>Aquí queda registrado <b>absolutamente todo</b> lo que ocurre en el sistema. Quién lo hizo, a qué hora y el detalle exacto.</p></div><DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} title="Filtrar Bitácora" /><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{ value: 'date', label: 'Fecha' }]} placeholder="Buscar por usuario o detalle..." /><div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar ">{['Todos', 'Venta', 'Inventario', 'Catálogo', 'Sistema', 'Gasto', 'Pedido', 'Cancelación'].map(cat => (<button key={cat} onClick={() => setBitacoraFilter(cat)} className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold ${bitacoraFilter === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>{cat}</button>))}</div><GlassCard className="overflow-hidden"><div className="overflow-x-auto "><table className="w-full text-left text-sm min-w-[800px]"><thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4 w-40">Fecha y Hora</th><th className="p-4 w-32">Usuario</th><th className="p-4 w-32">Módulo</th><th className="p-4">Detalle de la acción</th></tr></thead><tbody className="divide-y divide-slate-100">{filterAndSort(bitacoraLogs, ['userName', 'details'], true).filter(log => bitacoraFilter === 'Todos' || log.action === bitacoraFilter).map(log => (<tr key={log.id} className="hover:bg-slate-50"><td className="p-4 text-xs font-mono text-slate-500 whitespace-nowrap">{formatDateApp(log.date, 'full')}</td><td className="p-4 font-bold text-slate-700">{log.userName}</td><td className="p-4"><Badge type={log.action === 'Sistema' ? 'danger' : (log.action === 'Venta' ? 'success' : 'info')}>{log.action}</Badge></td><td className="p-4 text-slate-600">{log.details}</td></tr>))}</tbody></table>{filterAndSort(bitacoraLogs, ['userName', 'details'], true).filter(log => bitacoraFilter === 'Todos' || log.action === bitacoraFilter).length === 0 && <div className="p-8 text-center text-slate-400">No se encontraron registros de actividad.</div>}</div></GlassCard></div>)}

                {/* --- INVENTARIO --- */}
                {activeTab === 'inventory' && (
                    <div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <GlassCard className="p-6 bg-gradient-to-br from-teal-400 to-teal-600 text-slate-900 border-none shadow-xl shadow-teal-500/20">
                                <p className="text-sm opacity-80 font-bold">Valor Neto Inventario</p>
                                <h3 className="text-3xl font-black mt-1">{formatCurrency(inventoryValue)}</h3>
                                <p className="text-xs font-mono opacity-70 mt-1">{formatBs(inventoryValue)}</p>
                            </GlassCard>
                            <div className="md:col-span-2 flex flex-col justify-end gap-2 items-end">
                                <div className="flex w-full md:w-auto gap-2">
                                    <GlassButton onClick={() => callGeminiAI(`Tengo ${ingredients.filter(i => i.stock < i.minStock).length} materiales bajos.`, "Compras AI")} variant="secondary" className="flex-1 md:flex-none">
                                        <Sparkles size={16} /> AI
                                    </GlassButton>
                                    {hasPermission('inventory', 'edit') && (
                                        <>
                                            <GlassButton onClick={() => setShowMermaForm(true)} variant="gemini" className="flex-1 md:flex-none">
                                                <AlertTriangle size={16} /> Merma
                                            </GlassButton>
                                            <GlassButton onClick={() => { setEditingIngredient(null); setIvaPercent(0); setTempCost(0); setFormCurrency('USD'); setIsIvaApplied(false); setBaseCostBeforeIva(0); setShowIngredientForm(true); }} className="flex-1 md:flex-none">
                                                <Plus size={16} /> Nuevo
                                            </GlassButton>
                                        </>
                                    )}
                                    <GlassButton onClick={() => generatePDF('Inventario', ['Nombre', 'Stock', 'Unidad'], filterAndSort(ingredients).map(i => [i.name, i.stock, i.unit]), 'inventario.pdf')} variant="secondary" className="flex-1 md:flex-none">
                                        <Download size={16} /> PDF
                                    </GlassButton>
                                </div>
                                <AdvancedToolbar 
                                    searchQuery={searchQuery} 
                                    setSearchQuery={setSearchQuery} 
                                    sortConfig={sortConfig} 
                                    setSortConfig={setSortConfig} 
                                    sortOptions={[{ value: 'name', label: 'Nombre' }, { value: 'stock', label: 'Stock' }]} 
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Desktop View Table */}
                            <div className="hidden md:block overflow-x-auto ">
                                <GlassCard className="overflow-hidden">
                                    <table className="w-full text-left text-sm min-w-[700px]">
                                        <thead className="bg-slate-50 text-slate-500 font-medium uppercase">
                                            <tr><th className="p-4">Material</th><th className="p-4">Costo Unit.</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Valor Total</th><th className="p-4 text-center">Acciones</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">{filterAndSort(ingredients, ['name']).map(ing => {
                                            const isAssociated = products.some(p => p.recipe?.some(r => normalizeId(r.ingredientId) === normalizeId(ing.id)));
                                            const totalVal = (ing.stock || 0) * (ing.cost || 0);
                                            return (
                                                <tr key={ing.id}><td className="p-4 font-bold">{ing.name}</td><td className="p-4"><div className="flex flex-col"><PriceDisplay amount={ing.cost || 0} exchangeRate={exchangeRate} size="small" />{ing.ivaPercent > 0 && <span className="text-[9px] text-emerald-600 font-black">+{ing.ivaPercent}% IVA</span>}</div></td><td className="p-4 text-center"><span className={`font-bold ${ing.stock <= ing.minStock ? 'text-red-500' : ''}`}>{ing.stock} {ing.unit}</span></td><td className="p-4 text-right"><PriceDisplay amount={totalVal} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                    <td className="p-4 text-center">
                                                        {hasPermission('inventory', 'edit') ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => { if (isAssociated) { alert("El item ya está agregado."); } else { setConfirmation({ show: true, message: "¿Quieres agregar este producto al catálogo?", onConfirm: () => { setConfirmation({ show: false }); setActiveTab('products'); const suggestedPrice = (ing.cost || 0) * 1.30; setEditingProduct({ name: ing.name, price: Number(suggestedPrice.toFixed(2)), category: '', recipe: [{ ingredientId: ing.id, qty: 1 }] }); setProductIconPreview(null); setProfitMargin(30); setShowProductForm(true); } }); } }} className={`p-3 md:p-2 rounded ${isAssociated ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'}`} title="Añadir al catálogo"><Utensils size={16} /></button>
                                                                <button onClick={() => { setEditingIngredient(ing); setIvaPercent(ing.ivaPercent || 0); setTempCost(ing.cost || 0); setFormCurrency('USD'); setIsIvaApplied(false); setBaseCostBeforeIva(0); setShowIngredientForm(true); }} className="p-3 md:p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Editar"><Edit size={16} /></button>
                                                                <button onClick={() => setConfirmation({
                                                                    show: true,
                                                                    message: `¿Eliminar "${ing.name}" del inventario?`,
                                                                    onConfirm: () => {
                                                                        deleteFromDB('ingredients', ing.id);
                                                                        logActivity('Inventario', `Material eliminado: ${ing.name}`);
                                                                        setConfirmation({ show: false });
                                                                        showNotification("Material eliminado");
                                                                    }
                                                                })} className="p-3 md:p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500" title="Eliminar"><Trash2 size={16} /></button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Lectura</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}</tbody>
                                    </table>
                                </GlassCard>
                            </div>

                            {/* Mobile View Cards */}
                            <div className="md:hidden flex flex-col gap-4 pb-20">
                                {filterAndSort(ingredients, ['name']).map(ing => {
                                    const isAssociated = products.some(p => p.recipe?.some(r => normalizeId(r.ingredientId) === normalizeId(ing.id)));
                                    const totalValue = (ing.stock || 0) * (ing.cost || 0);
                                    return (
                                        <GlassCard key={ing.id} className="p-5 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight pr-4">{ing.name}</h4>
                                                <Badge type={ing.stock <= ing.minStock ? "danger" : "success"}>{ing.stock} {ing.unit}</Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo Unitario {ing.ivaPercent > 0 && <span className="text-emerald-600">+{ing.ivaPercent}%</span>}</p>
                                                    <PriceDisplay amount={ing.cost || 0} exchangeRate={exchangeRate} size="small" />
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total</p>
                                                    <PriceDisplay amount={totalValue} exchangeRate={exchangeRate} size="small" align="right" />
                                                </div>
                                            </div>

                                            {hasPermission('inventory', 'edit') ? (
                                                <div className="flex gap-2 pt-2">
                                                    <GlassButton 
                                                        onClick={() => { if (isAssociated) { alert("El item ya está agregado."); } else { setConfirmation({ show: true, message: "¿Quieres agregar este producto al catálogo?", onConfirm: () => { setConfirmation({ show: false }); setActiveTab('products'); const suggestedPrice = (ing.cost || 0) * 1.30; setEditingProduct({ name: ing.name, price: Number(suggestedPrice.toFixed(2)), category: '', recipe: [{ ingredientId: ing.id, qty: 1 }] }); setProductIconPreview(null); setProfitMargin(30); setShowProductForm(true); } }); } }}
                                                        variant="success" 
                                                        disabled={isAssociated}
                                                        className={`flex-1 text-[10px] py-3 ${isAssociated ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                                                    >
                                                        <Utensils size={14} /> CATÁLOGO
                                                    </GlassButton>
                                                    <GlassButton 
                                                        onClick={() => { setEditingIngredient(ing); setIvaPercent(ing.ivaPercent || 0); setTempCost(ing.cost || 0); setFormCurrency('USD'); setIsIvaApplied(false); setBaseCostBeforeIva(0); setShowIngredientForm(true); }}
                                                        variant="secondary" 
                                                        className="flex-1 text-[10px] py-3 text-indigo-600 font-black border-indigo-100"
                                                    >
                                                        <Edit size={14} /> EDITAR
                                                    </GlassButton>
                                                    <GlassButton 
                                                        onClick={() => setConfirmation({
                                                            show: true,
                                                            message: `¿Eliminar "${ing.name}" del inventario?`,
                                                            onConfirm: () => {
                                                                deleteFromDB('ingredients', ing.id);
                                                                logActivity('Inventario', `Material eliminado: ${ing.name}`);
                                                                setConfirmation({ show: false });
                                                                showNotification("Material eliminado");
                                                            }
                                                        })}
                                                        variant="danger" 
                                                        className="flex-1 text-[10px] py-3"
                                                    >
                                                        <Trash2 size={14} /> BORRAR
                                                    </GlassButton>
                                                </div>
                                            ) : (
                                                <div className="text-center text-xs text-slate-400 italic pt-2 bg-slate-50/50 border rounded-xl py-2">Lectura</div>
                                            )}
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- KARDEX (Entrada/Salida) --- */}
                {activeTab === 'inventory_history' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex justify-between items-center"><h2 className="text-2xl font-black">Entrada/Salida</h2></div><DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onDownloadPdf={() => generatePDF('Kardex', ['Fecha', 'Material', 'Tipo', 'Cant'], filterAndSort(stockHistory, [], true).map(l => [formatDateApp(l.date, 'date'), l.ingredientName, l.type, l.qtyChange]), 'kardex.pdf')} title="Filtrar Movimientos" /><GlassCard className="overflow-hidden"><div className="overflow-x-auto "><table className="w-full text-left text-sm min-w-[800px]"><thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4">Fecha</th><th className="p-4">Item</th><th className="p-4 text-center">Mov</th><th className="p-4 text-right">Cant</th><th className="p-4 text-right">Saldo</th></tr></thead><tbody className="divide-y divide-slate-100">{filterAndSort(stockHistory, ['ingredientName', 'reason'], true).slice(0, 100).map(log => (<React.Fragment key={log.id}><tr onClick={() => { setExpandedKardexId(expandedKardexId === log.id ? null : log.id); setTempKardexObs(log.observation || ""); }} className={`cursor-pointer transition-colors ${expandedKardexId === log.id ? 'bg-teal-50' : 'hover:bg-slate-50'} active:bg-slate-100`}><td className="p-4 text-slate-500">{formatDateApp(log.date, 'full')}</td><td className="p-4 font-bold">{log.ingredientName}</td><td className="p-4 text-center"><Badge type={log.type === 'ADD' ? 'success' : 'danger'}>{log.type === 'ADD' ? 'Entrada' : 'Salida'}</Badge></td><td className="p-4 text-right font-mono font-bold">{log.qtyChange}</td><td className="p-4 text-right text-slate-500">{log.newStock}</td></tr>{expandedKardexId === log.id && (<tr className="bg-teal-50/50"><td colSpan="5" className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1"><p className="text-xs font-bold text-slate-500 uppercase">Razón</p><p className="text-sm bg-white p-2 rounded border border-teal-100">{log.reason}</p></div><div className="flex-1"><p className="text-xs font-bold text-slate-500 uppercase">Valor Movimiento</p><PriceDisplay amount={log.totalValue || 0} exchangeRate={exchangeRate} size="small" /></div><div className="flex-1"><p className="text-xs font-bold text-slate-500 uppercase">Nota</p><div className="flex gap-2"><input className="flex-1 p-2 text-sm border rounded" value={tempKardexObs} onChange={e => setTempKardexObs(e.target.value)} /><button onClick={() => handleSaveKardexObservation(log.id)} className="bg-teal-600 text-white p-2 rounded"><Save size={14} /></button></div></div></div></td></tr>)}</React.Fragment>))}</tbody></table></div></GlassCard></div>)}

                {/* --- BALANCE --- */}
                {activeTab === 'balance' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-2xl font-black text-slate-800">Balance Financiero</h2>
                        <GlassButton onClick={handleDownloadBalance} variant="secondary">
                            <Download size={16} /> PDF Balance
                        </GlassButton>
                    </div>
                    <PeriodNavigator currentDate={currentDateView} setCurrentDate={setCurrentDateView} viewMode={viewMode} setViewMode={setViewMode} />
                    {viewMode === 'range' && <DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} title="Rango Personalizado" />}
                    
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Rentabilidad de Ventas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <GlassCard className="p-6 border-l-4 border-emerald-500">
                            <p className="text-sm text-slate-500 font-bold mb-1">Ventas Totales</p>
                            <PriceDisplay amount={financialData.income} exchangeRate={exchangeRate} size="large" />
                            <p className="text-xs text-slate-400 mt-2">Ingreso Bruto</p>
                        </GlassCard>
                        <GlassCard className="p-6 border-l-4 border-amber-500">
                            <p className="text-sm text-slate-500 font-bold mb-1">Costo de Materiales (Ventas)</p>
                            <PriceDisplay amount={financialData.cogs} exchangeRate={exchangeRate} size="large" />
                            <p className="text-xs text-slate-400 mt-2">Costo Proveedor de materiales de lo vendido</p>
                        </GlassCard>
                        <GlassCard className="p-6 border-l-4 border-rose-500 bg-rose-50/10">
                            <p className="text-sm text-rose-800 font-bold mb-1">Pérdidas por Merma</p>
                            <PriceDisplay amount={financialData.lossCost} exchangeRate={exchangeRate} size="large" />
                            <p className="text-xs text-slate-400 mt-2">Costo de material perdido</p>
                        </GlassCard>
                        <GlassCard className="p-6 border-l-4 border-teal-500 bg-teal-50/50">
                            <p className="text-sm text-teal-800 font-bold mb-1">Ganancia Ajustada</p>
                            <PriceDisplay amount={financialData.grossProfit - financialData.lossCost} exchangeRate={exchangeRate} size="large" />
                            <p className="text-xs text-slate-400 mt-2">Ventas - Costos - Mermas</p>
                        </GlassCard>
                    </div>

                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-4">Flujo de Caja (Dinero Real)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GlassCard className="p-6 border-l-4 border-red-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-slate-500 font-bold mb-1">Gastos Totales (Salidas)</p>
                                    <PriceDisplay amount={financialData.expenses} exchangeRate={exchangeRate} size="large" />
                                    <p className="text-xs text-slate-400 mt-2">Compras Inventario + Gastos Op.</p>
                                </div>
                                <GlassButton variant="expense" onClick={() => setShowExpenseForm(true)} className="text-xs py-1">
                                    <CreditCard size={14} /> Registrar Gasto
                                </GlassButton>
                            </div>
                        </GlassCard>
                        <GlassCard className={`p-6 border-l-4 ${financialData.netCashFlow >= 0 ? 'border-teal-500' : 'border-rose-500'}`}>
                            <p className="text-sm text-slate-500 font-bold mb-1">Flujo Neto</p>
                            <PriceDisplay amount={financialData.netCashFlow} exchangeRate={exchangeRate} size="large" />
                            <p className="text-xs text-slate-400 mt-2">Entradas - Salidas Reales</p>
                        </GlassCard>
                    </div>

                    {/* --- LISTA DE GASTOS REGISTRADOS (MOVIDO ARRIBA) --- */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-8">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lista de Gastos Registrados</h3>
                        <div className="flex gap-2">
                            <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => {
                                const activeExpenses = filterAndSort(otherExpenses, [], false, true);
                                const isVES = currencyMode === 'VES';
                                const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
                                const data = activeExpenses.map(e => [formatDateApp(e.date, 'full'), e.description, e.category, formatVal(e.amount)]);
                                generatePDF('Lista de Gastos - Balance', ['Fecha', 'Descripción', 'Categoría', 'Monto'], data, 'gastos_balance.pdf');
                            }}>
                                <Download size={14} /> PDF
                            </GlassButton>
                            <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => {
                                const activeExpenses = filterAndSort(otherExpenses, [], false, true);
                                const data = activeExpenses.map(e => [formatDateApp(e.date, 'full'), e.description, e.category, e.amount.toFixed(2), `Bs ${(e.amount * exchangeRate).toFixed(2)}`]);
                                generateExcel('Lista de Gastos', ['Fecha', 'Descripción', 'Categoría', 'Monto ($)', 'Monto (Bs)'], data, 'gastos_balance.csv');
                            }}>
                                <FileText size={14} /> Excel
                            </GlassButton>
                        </div>
                    </div>
                    <GlassCard className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead className="bg-slate-50 text-slate-500 font-medium uppercase">
                                    <tr>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Descripción</th>
                                        <th className="p-4">Categoría</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                        const activeExpenses = filterAndSort(otherExpenses, [], false, true);
                                        if (activeExpenses.length === 0) return <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay gastos registrados en este período.</td></tr>;
                                        return activeExpenses.slice(0, expensesLimit).map((expense) => (
                                            <tr key={expense.id} className="hover:bg-slate-50">
                                                <td className="p-4 text-slate-500 text-xs">{formatDateApp(expense.date, 'full')}</td>
                                                <td className="p-4 font-bold">{expense.description}</td>
                                                <td className="p-4"><Badge type="neutral">{expense.category}</Badge></td>
                                                <td className="p-4 text-right"><PriceDisplay amount={expense.amount} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button 
                                                            onClick={() => { 
                                                                setEditingExpense(expense); 
                                                                setShowExpenseForm(true); 
                                                            }} 
                                                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                                            title="Editar Gasto"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteExpense(expense)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Gasto">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                    {(() => {
                        const activeExpenses = filterAndSort(otherExpenses, [], false, true);
                        return activeExpenses.length > expensesLimit && (
                            <div className="flex justify-center mt-2">
                                <GlassButton variant="secondary" onClick={() => setExpensesLimit(prev => prev + 10)}>
                                    Mostrar más
                                </GlassButton>
                            </div>
                        );
                    })()}

                    {/* --- GRÁFICO COMPARATIVA (BAJO LA LISTA DE GASTOS) --- */}
                    <div style={{height: '280px'}} className="w-full bg-white/50 rounded-2xl p-4 border border-white/40 mt-4">
                        <h4 className="text-xs font-bold text-slate-400 mb-2">Comparativa Rentabilidad vs Flujo</h4>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={[
                                { name: 'Ventas', val: currencyMode === 'VES' ? financialData.income * exchangeRate : financialData.income, fill: '#10b981' }, 
                                { name: 'Costo Venta', val: currencyMode === 'VES' ? financialData.cogs * exchangeRate : financialData.cogs, fill: '#f59e0b' }, 
                                { name: 'Mermas', val: currencyMode === 'VES' ? financialData.lossCost * exchangeRate : financialData.lossCost, fill: '#f43f5e' },
                                { name: 'Ganancia', val: currencyMode === 'VES' ? (financialData.grossProfit - financialData.lossCost) * exchangeRate : (financialData.grossProfit - financialData.lossCost), fill: '#fbbf24' }, 
                                { name: 'Gastos Reales', val: currencyMode === 'VES' ? financialData.expenses * exchangeRate : financialData.expenses, fill: '#ef4444' }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => currencyMode === 'VES' ? `Bs ${val.toFixed(0)}` : `$${val.toFixed(0)}`} />
                                <Tooltip formatter={(value) => [currencyMode === 'VES' ? `Bs ${value.toFixed(2)}` : `$${value.toFixed(2)}`, 'Monto']} />
                                <Bar dataKey="val" radius={[8, 8, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* --- DESGLOSE POR PRODUCTO --- */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-8">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Desglose por Producto</h3>
                        <div className="flex gap-2">
                            <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => {
                                const periodSales = filterAndSort(salesHistory, [], false, true);
                                const productMap = {};
                                periodSales.forEach(sale => { sale.items.forEach(item => { if (!productMap[item.id]) { const prod = products.find(p => p.id === item.id); const rc = prod ? calculateRecipeCost(prod.recipe) : 0; productMap[item.id] = { name: item.name, qty: 0, revenue: 0, unitCost: rc, price: item.price }; } productMap[item.id].qty += item.qty; productMap[item.id].revenue += item.price * item.qty; }); });
                                const rows = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
                                const isVES = currencyMode === 'VES';
                                const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
                                const data = rows.map(r => [
                                    r.name, 
                                    r.qty, 
                                    formatVal(r.unitCost), 
                                    formatVal(r.price), 
                                    formatVal(r.revenue), 
                                    formatVal(r.unitCost * r.qty), 
                                    formatVal(r.revenue - r.unitCost * r.qty)
                                ]);
                                generatePDF('Desglose por Producto - Balance', ['Producto', 'Vendidos', 'Costo Unit.', 'Precio Venta', 'Ingreso', 'Costo Total', 'Ganancia'], data, 'desglose_balance.pdf');
                            }}><Download size={14} /> PDF</GlassButton>
                            <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => {
                                const periodSales = filterAndSort(salesHistory, [], false, true);
                                const productMap = {};
                                periodSales.forEach(sale => { sale.items.forEach(item => { if (!productMap[item.id]) { const prod = products.find(p => p.id === item.id); const rc = prod ? calculateRecipeCost(prod.recipe) : 0; productMap[item.id] = { name: item.name, qty: 0, revenue: 0, unitCost: rc, price: item.price }; } productMap[item.id].qty += item.qty; productMap[item.id].revenue += item.price * item.qty; }); });
                                const rows = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
                                const data = rows.map(r => { const tc = r.unitCost * r.qty; return [r.name, r.qty, r.unitCost.toFixed(2), r.price.toFixed(2), r.revenue.toFixed(2), tc.toFixed(2), (r.revenue - tc).toFixed(2), `Bs ${(r.revenue * exchangeRate).toFixed(2)}`, `Bs ${(tc * exchangeRate).toFixed(2)}`, `Bs ${((r.revenue - tc) * exchangeRate).toFixed(2)}`]; });
                                generateExcel('Desglose por Producto', ['Producto', 'Vendidos', 'Costo Unit. ($)', 'Precio ($)', 'Ingreso ($)', 'Costo Total ($)', 'Ganancia ($)', 'Ingreso (Bs)', 'Costo Total (Bs)', 'Ganancia (Bs)'], data, 'desglose_balance.csv');
                            }}><FileText size={14} /> Excel</GlassButton>
                        </div>
                    </div>
                    <GlassCard className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm min-w-[700px]">
                                <thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4">Producto</th><th className="p-4 text-center">Vendidos</th><th className="p-4 text-right">Costo Unit.</th><th className="p-4 text-right">Precio Venta</th><th className="p-4 text-right">Ingreso</th><th className="p-4 text-right">Costo Total</th><th className="p-4 text-right">Ganancia</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                        const periodSales = filterAndSort(salesHistory, [], false, true);
                                        const productMap = {};
                                        periodSales.forEach(sale => {
                                            sale.items.forEach(item => {
                                                if (!productMap[item.id]) {
                                                    const prod = products.find(p => p.id === item.id);
                                                    const recipeCost = prod ? calculateRecipeCost(prod.recipe) : 0;
                                                    productMap[item.id] = { name: item.name, qty: 0, revenue: 0, unitCost: recipeCost, price: item.price };
                                                }
                                                productMap[item.id].qty += item.qty;
                                                productMap[item.id].revenue += item.price * item.qty;
                                            });
                                        });
                                        const rows = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
                                        if (rows.length === 0) return <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay ventas en este período.</td></tr>;
                                        return rows.map((r, i) => {
                                            const totalCost = r.unitCost * r.qty;
                                            const profit = r.revenue - totalCost;
                                            return (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="p-4 font-bold">{r.name}</td>
                                                    <td className="p-4 text-center font-mono font-bold">{r.qty}</td>
                                                    <td className="p-4 text-right"><PriceDisplay amount={r.unitCost} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                    <td className="p-4 text-right"><PriceDisplay amount={r.price} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                    <td className="p-4 text-right"><PriceDisplay amount={r.revenue} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                    <td className="p-4 text-right"><PriceDisplay amount={totalCost} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                    <td className="p-4 text-right"><div className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}><PriceDisplay amount={profit} exchangeRate={exchangeRate} size="small" align="right" /></div></td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>)}

                {/* --- CLIENTES --- */}
                {activeTab === 'customers' && (
                    <div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0 pb-20">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-2xl border border-white/40 shadow-sm">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                    <Users className="text-teal-600" /> Clientes
                                </h2>
                                <p className="text-slate-500 text-xs mt-1">Gestión de clientes y datos de contacto en tiempo real</p>
                            </div>
                            <div className="flex w-full md:w-auto gap-2">
                                {hasPermission('customers', 'edit') ? (
                                    <GlassButton onClick={() => { setEditingCustomer({ name: '', phone: '', email: '', address: '' }); setShowCustomerForm(true); }} className="flex-1 md:flex-none">
                                        <Plus size={18} /> Nuevo Cliente
                                    </GlassButton>
                                ) : (
                                    <span className="text-xs text-slate-400 italic bg-white/40 border border-white/20 p-2.5 rounded-xl font-bold uppercase tracking-wider">Solo Lectura</span>
                                )}
                            </div>
                        </div>

                        <AdvancedToolbar 
                            searchQuery={searchQuery} 
                            setSearchQuery={setSearchQuery} 
                            sortConfig={sortConfig} 
                            setSortConfig={setSortConfig} 
                            sortOptions={[{ value: 'name', label: 'Nombre' }]} 
                            placeholder="Buscar cliente por nombre, teléfono o correo..."
                        />

                        <GlassCard className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[700px]">
                                    <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-xs">
                                        <tr>
                                            <th className="p-4">Nombre / Razón Social</th>
                                            <th className="p-4">Teléfono</th>
                                            <th className="p-4">Correo Electrónico</th>
                                            <th className="p-4">Dirección / Notas</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {filterAndSort(customers, ['name', 'phone', 'email', 'address']).length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-400">
                                                    No se encontraron clientes registrados.
                                                </td>
                                            </tr>
                                        ) : (
                                            filterAndSort(customers, ['name', 'phone', 'email', 'address']).map((cust) => (
                                                <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 font-bold text-slate-800">
                                                        {cust.name}
                                                    </td>
                                                    <td className="p-4 font-mono text-xs">
                                                        {cust.phone || '-'}
                                                    </td>
                                                    <td className="p-4 text-xs font-mono text-slate-500">
                                                        {cust.email || '-'}
                                                    </td>
                                                    <td className="p-4 text-xs text-slate-600 max-w-xs truncate" title={cust.address}>
                                                        {cust.address || '-'}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {hasPermission('customers', 'edit') ? (
                                                                <>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => { setEditingCustomer(cust); setShowCustomerForm(true); }} 
                                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                                                                        title="Editar Cliente"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleDeleteCustomer(cust)} 
                                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                                        title="Eliminar Cliente"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">Lectura</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* --- REPORTES --- */}
                {activeTab === 'reports' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0 pb-20">
                    {(() => {
                        const reportSortOptions = [{ value: 'name', label: 'Nombre' }, { value: 'revenue', label: 'Ingreso' }, { value: 'qty', label: 'Vendidos' }];
                        const periodSales = viewMode === 'range' ? filterAndSort(salesHistory, [], true) : filterAndSort(salesHistory, [], false, true);
                        const totalRevenue = periodSales.reduce((sum, s) => sum + s.total, 0);
                        const totalItemsSold = periodSales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.qty, 0), 0);
                        const buildProductMap = () => {
                            const productMap = {};
                            periodSales.forEach(sale => { sale.items.forEach(item => { if (!productMap[item.id]) { const prod = products.find(p => p.id === item.id); const rc = prod ? calculateRecipeCost(prod.recipe) : 0; productMap[item.id] = { name: item.name, qty: 0, revenue: 0, unitCost: rc, category: prod?.category || '-' }; } productMap[item.id].qty += item.qty; productMap[item.id].revenue += item.price * item.qty; }); });
                            return Object.values(productMap).filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => { let valA = a[sortConfig.key], valB = b[sortConfig.key]; if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); } return sortConfig.direction === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1); });
                        };
                        return (<>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><TrendingUp className="text-teal-600" /> Reportes</h2>
                                <GlassButton variant="gemini" onClick={() => callGeminiAI(`Analiza estas ventas y dame recomendaciones: ${JSON.stringify(salesHistory.slice(0, 15))}`, "Análisis de Ventas")}>Analizar AI</GlassButton>
                            </div>
                            <PeriodNavigator currentDate={currentDateView} setCurrentDate={setCurrentDateView} viewMode={viewMode} setViewMode={setViewMode} />
                            {viewMode === 'range' && <DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onDownloadPdf={() => handleDownloadReport(filterAndSort(salesHistory, [], true))} title="Filtrar Reportes" />}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <GlassCard className="p-4 border-l-4 border-slate-400"><p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Transacciones</p><p className="text-xl md:text-2xl font-black text-slate-800 mt-1">{periodSales.length}</p></GlassCard>
                                <GlassCard className="p-4 border-l-4 border-blue-400"><p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Unidades Vendidas</p><p className="text-xl md:text-2xl font-black text-slate-800 mt-1">{totalItemsSold}</p></GlassCard>
                                <GlassCard className="p-4 border-l-4 border-emerald-400"><p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Ingreso Total</p><PriceDisplay amount={totalRevenue} exchangeRate={exchangeRate} size="normal" /></GlassCard>
                                <GlassCard className="p-4 border-l-4 border-teal-400"><p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Ticket Promedio</p><PriceDisplay amount={periodSales.length > 0 ? totalRevenue / periodSales.length : 0} exchangeRate={exchangeRate} size="normal" /></GlassCard>
                            </div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><PieChart size={16} className="text-teal-600" /> Rendimiento por Producto</h3>
                                    <p className="text-[10px] text-slate-400">Ordenado por {reportSortOptions.find(o => o.value === sortConfig.key)?.label || 'Nombre'}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={reportSortOptions} placeholder="Buscar en tabla..." />
                                    <div className="flex gap-2">
                                        <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => { 
                                            const rows = buildProductMap(); 
                                            const isVES = currencyMode === 'VES';
                                            const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
                                            const data = rows.map(r => { 
                                                const tc = r.unitCost * r.qty; 
                                                const pr = r.revenue - tc; 
                                                const mg = r.revenue > 0 ? ((pr / r.revenue) * 100).toFixed(1) + '%' : '0%'; 
                                                return [
                                                    r.name, 
                                                    r.category, 
                                                    r.qty, 
                                                    formatVal(r.revenue), 
                                                    formatVal(tc), 
                                                    formatVal(pr), 
                                                    mg, 
                                                    pr > 0 ? 'Sí' : 'No'
                                                ]; 
                                            }); 
                                            generatePDF('Rendimiento por Producto', ['Producto', 'Categoría', 'Uds.', 'Ingreso', 'Costo', 'Ganancia', 'Margen', 'Rentable'], data, 'rendimiento_productos.pdf'); 
                                        }}><Download size={14} /> PDF</GlassButton>
                                        <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => { const rows = buildProductMap(); const data = rows.map(r => { const tc = r.unitCost * r.qty; const pr = r.revenue - tc; const mg = r.revenue > 0 ? ((pr / r.revenue) * 100).toFixed(1) : '0'; return [r.name, r.category, r.qty, r.revenue.toFixed(2), tc.toFixed(2), pr.toFixed(2), mg, pr > 0 ? 'Sí' : 'No', `Bs ${(r.revenue * exchangeRate).toFixed(2)}`, `Bs ${(tc * exchangeRate).toFixed(2)}`, `Bs ${(pr * exchangeRate).toFixed(2)}`]; }); generateExcel('Rendimiento por Producto', ['Producto', 'Categoría', 'Uds.', 'Ingreso ($)', 'Costo ($)', 'Ganancia ($)', 'Margen %', 'Rentable', 'Ingreso (Bs)', 'Costo (Bs)', 'Ganancia (Bs)'], data, 'rendimiento_productos.csv'); }}><FileText size={14} /> Excel</GlassButton>
                                    </div>
                                </div>
                            </div>
                            <GlassCard className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm min-w-[850px]">
                                        <thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4">Producto</th><th className="p-4 text-center">Uds.</th><th className="p-4 text-right">Ingreso</th><th className="p-4 text-right">Costo Prod.</th><th className="p-4 text-right">Ganancia</th><th className="p-4 text-center">Margen</th><th className="p-4 text-center">Rentable</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(() => {
                                                const rows = buildProductMap();
                                                if (rows.length === 0) return <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay datos de ventas en este período.</td></tr>;
                                                let totalRev = 0, totalCostAll = 0, totalProfAll = 0, totalQtyAll = 0;
                                                const rendered = rows.map((r, i) => {
                                                    const tc = r.unitCost * r.qty;
                                                    const pr = r.revenue - tc;
                                                    const mg = r.revenue > 0 ? ((pr / r.revenue) * 100) : 0;
                                                    totalRev += r.revenue; totalCostAll += tc; totalProfAll += pr; totalQtyAll += r.qty;
                                                    return (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="p-4"><div><span className="font-bold">{r.name}</span><span className="block text-[10px] text-slate-400">{r.category}</span></div></td>
                                                            <td className="p-4 text-center font-mono font-bold text-lg">{r.qty}</td>
                                                            <td className="p-4 text-right"><PriceDisplay amount={r.revenue} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                            <td className="p-4 text-right"><PriceDisplay amount={tc} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                            <td className="p-4 text-right"><div className={pr >= 0 ? 'text-emerald-600' : 'text-red-500'}><PriceDisplay amount={pr} exchangeRate={exchangeRate} size="small" align="right" /></div></td>
                                                            <td className="p-4 text-center"><div className="flex flex-col items-center gap-1"><span className={`text-xs font-black ${mg >= 30 ? 'text-emerald-600' : mg >= 15 ? 'text-amber-600' : 'text-red-500'}`}>{mg.toFixed(1)}%</span><div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${mg >= 30 ? 'bg-emerald-500' : mg >= 15 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${Math.min(mg, 100)}%`}}></div></div></div></td>
                                                            <td className="p-4 text-center"><Badge type={pr > 0 ? 'success' : 'danger'}>{pr > 0 ? 'Sí' : 'No'}</Badge></td>
                                                        </tr>
                                                    );
                                                });
                                                rendered.push(
                                                    <tr key="totals" className="bg-slate-100 font-black text-slate-800 border-t-2 border-slate-300">
                                                        <td className="p-4 uppercase text-xs tracking-wider">Totales</td>
                                                        <td className="p-4 text-center font-mono text-lg">{totalQtyAll}</td>
                                                        <td className="p-4 text-right"><PriceDisplay amount={totalRev} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                        <td className="p-4 text-right"><PriceDisplay amount={totalCostAll} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                        <td className="p-4 text-right"><div className={totalProfAll >= 0 ? 'text-emerald-600' : 'text-red-500'}><PriceDisplay amount={totalProfAll} exchangeRate={exchangeRate} size="small" align="right" /></div></td>
                                                        <td className="p-4 text-center"><span className="text-xs font-black">{totalRev > 0 ? ((totalProfAll / totalRev) * 100).toFixed(1) : 0}%</span></td>
                                                        <td className="p-4"></td>
                                                    </tr>
                                                );
                                                return rendered;
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-8">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Alertas de Stock (Bajo / Agotado)</h3>
                                <div className="flex gap-2">
                                    <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => { const lowStock = ingredients.filter(ing => (ing.stock || 0) <= (ing.minStock || 0)); const data = lowStock.map(ing => [ing.name, `${ing.stock} ${ing.unit}`, `${ing.minStock} ${ing.unit}`, (ing.stock || 0) === 0 ? 'AGOTADO' : 'BAJO STOCK']); generatePDF('Alertas de Stock', ['Material', 'Stock Actual', 'Stock Mínimo', 'Estado'], data, 'alertas_stock.pdf'); }}><Download size={14} /> PDF</GlassButton>
                                    <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => { const lowStock = ingredients.filter(ing => (ing.stock || 0) <= (ing.minStock || 0)); const data = lowStock.map(ing => [ing.name, ing.stock, ing.minStock, (ing.stock || 0) === 0 ? 'AGOTADO' : 'BAJO STOCK', ing.unit]); generateExcel('Alertas de Stock', ['Material', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Unidad'], data, 'alertas_stock.csv'); }}><FileText size={14} /> Excel</GlassButton>
                                </div>
                            </div>
                            <GlassCard className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm min-w-[600px]">
                                        <thead className="bg-slate-50 text-slate-500 font-medium uppercase">
                                            <tr><th className="p-4">Material</th><th className="p-4 text-center">Stock Actual</th><th className="p-4 text-center">Mínimo</th><th className="p-4 text-center">Estado</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(() => {
                                                const lowStock = ingredients.filter(ing => (ing.stock || 0) <= (ing.minStock || 0)).sort((a,b) => (a.stock || 0) - (b.stock || 0));
                                                if (lowStock.length === 0) return <tr><td colSpan="4" className="p-8 text-center text-slate-400">No hay alertas de stock en este momento.</td></tr>;
                                                return lowStock.map((ing, i) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="p-4 font-bold">{ing.name}</td>
                                                        <td className="p-4 text-center font-mono font-bold text-lg">{(ing.stock || 0)} {ing.unit}</td>
                                                        <td className="p-4 text-center text-slate-500">{(ing.minStock || 0)} {ing.unit}</td>
                                                        <td className="p-4 text-center"><Badge type={(ing.stock || 0) === 0 ? 'danger' : 'warning'}>{(ing.stock || 0) === 0 ? 'AGOTADO' : 'BAJO STOCK'}</Badge></td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <GlassCard className="p-6"><h3 className="font-bold mb-4 flex gap-2"><TrendingUp className="text-teal-600" /> Ventas Recientes</h3><div style={{height: '240px'}}><ResponsiveContainer width="100%" height={240}><AreaChart data={(() => { const s = viewMode === 'range' ? filterAndSort(salesHistory, [], true) : filterAndSort(salesHistory, [], false, true); return s.slice(0, 7).map(ss => ({ name: formatDateApp(ss.date, 'short-date'), total: ss.total })); })()}><Area type="monotone" dataKey="total" stroke="#fbbf24" fill="#fef3c7" /></AreaChart></ResponsiveContainer></div></GlassCard>
                                <GlassCard className="p-6 flex flex-col justify-center items-center text-center"><Bot size={48} className="text-teal-500 mb-4" /><h3 className="font-bold text-lg">Asistente Inteligente</h3><p className="text-slate-500 text-sm mb-4">Genera estrategias de venta o análisis de catálogo.</p><GlassButton variant="gemini" onClick={() => callGeminiAI("Dame estrategias de venta", "Marketing AI")}>Consultar AI</GlassButton></GlassCard>
                            </div>

                            {/* --- HISTORIAL DE LA MERMA --- */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-8">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-red-500" /> Historial de la Merma
                                </h3>
                                <div className="flex gap-2">
                                    <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => {
                                        const activeStock = viewMode === 'range' ? filterAndSort(stockHistory, [], true) : filterAndSort(stockHistory, [], false, true);
                                        const activeLosses = activeStock.filter(l => l.type === 'LOSS');
                                        const isVES = currencyMode === 'VES';
                                        const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;
                                        const rows = activeLosses.map(l => {
                                            const unitCost = Math.abs((l.totalValue || 0) / (l.qtyChange || 1));
                                            const totalValue = Math.abs(l.totalValue || 0);
                                            return [
                                                formatDateApp(l.date, 'full'),
                                                l.ingredientName,
                                                `${l.qtyChange} Unid`,
                                                formatVal(unitCost),
                                                formatVal(totalValue),
                                                l.reason
                                            ];
                                        });
                                        generatePDF('Historial de Mermas', ['Fecha', 'Material', 'Cantidad', 'Costo Unit.', 'Costo Total', 'Motivo'], rows, 'mermas_historial.pdf');
                                    }}>
                                        <Download size={14} /> PDF
                                    </GlassButton>
                                    <GlassButton variant="secondary" className="text-xs py-1.5" onClick={() => {
                                        const activeStock = viewMode === 'range' ? filterAndSort(stockHistory, [], true) : filterAndSort(stockHistory, [], false, true);
                                        const activeLosses = activeStock.filter(l => l.type === 'LOSS');
                                        const rows = activeLosses.map(l => [
                                            formatDateApp(l.date, 'full'),
                                            l.ingredientName,
                                            l.qtyChange,
                                            Math.abs((l.totalValue || 0) / (l.qtyChange || 1)).toFixed(2),
                                            Math.abs(l.totalValue || 0).toFixed(2),
                                            l.reason,
                                            `Bs ${(Math.abs(l.totalValue || 0) * exchangeRate).toFixed(2)}`
                                        ]);
                                        generateExcel('Historial de Mermas', ['Fecha', 'Material', 'Cantidad', 'Costo Unit. ($)', 'Costo Total ($)', 'Motivo', 'Costo Total (Bs)'], rows, 'mermas_historial.csv');
                                    }}>
                                        <FileText size={14} /> Excel
                                    </GlassButton>
                                </div>
                            </div>
                            <GlassCard className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm min-w-[700px]">
                                        <thead className="bg-slate-50 text-slate-500 font-medium uppercase">
                                            <tr>
                                                <th className="p-4">Fecha</th>
                                                <th className="p-4">Material</th>
                                                <th className="p-4 text-center">Cantidad</th>
                                                <th className="p-4 text-right">Costo Unit.</th>
                                                <th className="p-4 text-right">Costo Total</th>
                                                <th className="p-4">Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(() => {
                                                const activeStock = viewMode === 'range' ? filterAndSort(stockHistory, [], true) : filterAndSort(stockHistory, [], false, true);
                                                const activeLosses = activeStock.filter(l => l.type === 'LOSS');
                                                if (activeLosses.length === 0) return <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay mermas registradas en este período.</td></tr>;
                                                return activeLosses.map((l, i) => {
                                                    const unitCost = Math.abs((l.totalValue || 0) / (l.qtyChange || 1));
                                                    const totalCost = Math.abs(l.totalValue || 0);
                                                    return (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="p-4 text-slate-500 text-xs">{formatDateApp(l.date, 'full')}</td>
                                                            <td className="p-4 font-bold">{l.ingredientName}</td>
                                                            <td className="p-4 text-center font-mono font-bold">{l.qtyChange}</td>
                                                            <td className="p-4 text-right"><PriceDisplay amount={unitCost} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                            <td className="p-4 text-right"><PriceDisplay amount={totalCost} exchangeRate={exchangeRate} size="small" align="right" /></td>
                                                            <td className="p-4 text-slate-600">{l.reason}</td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </>);
                    })()}
                </div>)}


                {/* --- CONFIGURACIÓN --- */}
                {activeTab === 'settings' && (<div className="max-w-4xl mx-auto space-y-8 fade-in mt-10 md:mt-0 pb-10"><header className="flex items-center gap-4 bg-white/50 p-6 rounded-2xl border border-white/40 shadow-sm"><div className="p-3 bg-slate-200 rounded-xl"><Settings className="text-slate-700" size={32} /></div><div><h2 className="text-2xl font-black text-slate-800">Configuración Global</h2><p className="text-slate-500">Usuarios, Respaldos y Nube</p></div></header>

                    {/* 1. SECCIÓN DE USUARIOS (ACTUALIZADA) */}<UserManagement appUsers={appUsers} onCreateUser={handleCreateUserSystem} onEditUser={handleEditUserSystem} onDeleteUser={handleDeleteUserSystem} currentUserId={user.uid} />

                    {/* 2. GESTIÓN DE RESPALDOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><GlassCard className="p-6 space-y-4 border-l-4 border-blue-500"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Download size={24} /></div><h3 className="font-bold text-lg">Exportar Copia Local</h3></div><p className="text-sm text-slate-600">Descarga un archivo JSON con todos los datos actuales del negocio.</p><GlassButton onClick={handleExportData} variant="info" className="w-full">Descargar Respaldo</GlassButton></GlassCard><GlassCard className="p-6 space-y-4 border-l-4 border-rose-500"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-rose-100 rounded-lg text-rose-600"><Upload size={24} /></div><h3 className="font-bold text-lg">Restaurar Copia</h3></div><p className="text-sm text-slate-600">⚠ CUIDADO: Esto <b>BORRARÁ todos los datos actuales</b> antes de restaurar.</p><div className="relative"><input type="file" ref={fileInputRef} onClick={(e) => e.target.value = null} onChange={handleImportData} accept=".json" className="hidden" /><GlassButton onClick={() => fileInputRef.current.click()} variant="danger" disabled={isRestoring} className="w-full justify-center">{isRestoring ? <><Loader2 className="animate-spin" size={16} /> {restoreStatus}</> : "Seleccionar Archivo y Restaurar"}</GlassButton></div></GlassCard></div></div>)}
            </main>

            {/* --- MODALES --- */}
            {receiptModal.show && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"><GlassCard className="p-8 max-w-sm w-full text-center slide-up max-h-[90vh] overflow-y-auto"><div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500"><ShieldCheck size={32} /></div><h3 className="text-2xl font-black text-slate-800 mb-2">¡Venta Exitosa!</h3><div className="flex flex-col gap-3 mt-6"><GlassButton onClick={() => handleDownloadReceipt(receiptModal.sale)} variant="primary" className="w-full justify-center"><Receipt size={18} /> Descargar Recibo</GlassButton><GlassButton onClick={() => setReceiptModal({ show: false, sale: null })} variant="secondary" className="w-full justify-center">Cerrar</GlassButton></div></GlassCard></div>)}
            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <GlassCard className="w-full max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh] slide-up">
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                            <div><h3 className="font-bold text-lg">Detalle Venta</h3></div>
                            <button onClick={() => setSelectedSale(null)}><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="mb-4">
                                <span className="text-sm text-slate-500">Cliente:</span> <span className="font-bold">{selectedSale.description || "N/A"}</span>
                            </div>
                            <div className="space-y-2 mb-6">
                                {selectedSale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-2 border-b">
                                        <div className="flex flex-col text-left text-xs md:text-sm">
                                            <span>{item.qty}x {item.name}</span>
                                            {(item.variantDetails || item.details) && (
                                                <span className="text-xs text-indigo-500 font-bold">({item.variantDetails || item.details})</span>
                                            )}
                                        </div>
                                        <span className="font-bold">
                                            <PriceDisplay amount={item.price * item.qty} exchangeRate={exchangeRate} align="right" size="small" />
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 uppercase">Observaciones</label>
                                <textarea 
                                    className="w-full p-2 mt-2 text-sm border rounded-lg bg-white resize-none disabled:bg-slate-100 disabled:text-slate-500" 
                                    rows="3" 
                                    value={observationText} 
                                    onChange={(e) => setObservationText(e.target.value)} 
                                    placeholder={hasPermission('history', 'edit') ? "Añadir nota..." : "Sin observaciones"}
                                    disabled={!hasPermission('history', 'edit')}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-between gap-3 bg-white">
                            <GlassButton variant="info" onClick={() => handleDownloadReceipt(selectedSale)}><Receipt size={16} /> Recibo</GlassButton>
                            {hasPermission('history', 'edit') ? (
                                <GlassButton onClick={() => { handleUpdateObservation(); setSelectedSale(null); }}>Guardar Nota</GlassButton>
                            ) : (
                                <GlassButton variant="secondary" onClick={() => setSelectedSale(null)}>Cerrar</GlassButton>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}
            {showIngredientForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-md p-6 slide-up max-h-[90vh] overflow-y-auto"><h3 className="font-bold mb-4 text-slate-800">{editingIngredient ? 'Editar' : 'Nuevo'} Material</h3><form onSubmit={handleSaveIngredient} className="space-y-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre del Material</label><input name="name" required placeholder="Ej. Taza de Cerámica Blanca 11oz" defaultValue={editingIngredient?.name} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none" /></div><div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Stock</label>
                                    <input name="stock" type="number" step="any" required placeholder="0.00" defaultValue={editingIngredient?.stock} className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs md:text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Stock Mínimo</label>
                                    <input name="minStock" type="number" step="any" required placeholder="0.00" defaultValue={editingIngredient?.minStock !== undefined ? editingIngredient.minStock : 10} className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs md:text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unidad</label>
                                    <input name="unit" required placeholder="Unid, m, etc." defaultValue={editingIngredient?.unit} className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs md:text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap justify-between items-center gap-2 ml-1 mb-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Costo Unitario ({formCurrency === 'USD' ? '$' : 'Bs'})</label>
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                                        <button type="button" onClick={() => setFormCurrency('USD')} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${formCurrency === 'USD' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`}>$ USD</button>
                                        <button type="button" onClick={() => setFormCurrency('VES')} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${formCurrency === 'VES' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`}>Bs VES</button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        name="cost" 
                                        type="number" 
                                        step="0.01" 
                                        required 
                                        placeholder="0.00" 
                                        value={formCurrency === 'USD' ? tempCost : (exchangeRate > 0 ? Number((tempCost * exchangeRate).toFixed(2)) : 0)} 
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            if (formCurrency === 'USD') setTempCost(val);
                                            else setTempCost(exchangeRate > 0 ? Number((val / exchangeRate).toFixed(6)) : 0);
                                            setIsIvaApplied(false);
                                        }} 
                                        className="flex-1 min-w-0 p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none font-mono text-sm" 
                                    />
                                    <div className="flex flex-col w-16 md:w-24 shrink-0 focus-within:z-10">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">IVA %</label>
                                        <input type="number" step="any" placeholder="0" value={ivaPercent} onChange={(e) => { setIvaPercent(parseFloat(e.target.value) || 0); setIsIvaApplied(false); }} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-sm" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-1 px-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase italic">
                                        {formCurrency === 'USD' ? `≈ Bs ${ (tempCost * (exchangeRate || 0)).toFixed(2) }` : `≈ $ ${ tempCost.toFixed(2) }`}
                                    </span>
                                </div>
                                {ivaPercent > 0 && (
                                    <div className="flex flex-wrap justify-between items-center gap-2 mt-2 p-2 bg-teal-50 rounded-lg border border-teal-100 animate-in fade-in slide-in-from-top-1">
                                        <span className="text-[10px] md:text-xs text-teal-700 font-bold break-all">
                                            {isIvaApplied ? `IVA APLICADO: ${ivaPercent}%` : `TOTAL CON IVA: $${(tempCost * (1 + ivaPercent/100)).toFixed(2)}`}
                                        </span>
                                        {isIvaApplied ? (
                                            <button type="button" onClick={() => { setTempCost(baseCostBeforeIva); setIsIvaApplied(false); }} className="text-[9px] md:text-[10px] bg-slate-600 text-white px-2 py-1.5 rounded font-bold hover:bg-slate-700 transition-colors shadow-sm uppercase tracking-tighter whitespace-nowrap">Deshacer</button>
                                        ) : (
                                            <button type="button" onClick={() => { setBaseCostBeforeIva(tempCost); setTempCost(Number((tempCost * (1 + ivaPercent/100)).toFixed(2))); setIsIvaApplied(true); }} className="text-[9px] md:text-[10px] bg-teal-600 text-white px-2 py-1.5 rounded font-bold hover:bg-teal-700 transition-colors shadow-sm uppercase tracking-tighter whitespace-nowrap">Aplicar</button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-6"><GlassButton onClick={() => setShowIngredientForm(false)} variant="secondary" className="flex-1">Cancelar</GlassButton><GlassButton type="submit" variant="primary" className="flex-1">Guardar Material</GlassButton></div></form></GlassCard></div>)}
            {showProductForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto slide-up"><h3 className="font-bold mb-4 text-slate-800">{editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}</h3><form onSubmit={handleSaveProduct} className="space-y-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre del Producto</label><input required name="name" defaultValue={editingProduct?.name} placeholder="Nombre" className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none" /></div><div className="flex gap-4"><div className="flex-1 space-y-1"><div className="flex justify-between items-center ml-1 mb-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Precio de Venta ({productCurrency === 'USD' ? '$' : 'Bs'})</label><div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0"><button type="button" onClick={() => setProductCurrency('USD')} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${productCurrency === 'USD' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`}>$ USD</button><button type="button" onClick={() => setProductCurrency('VES')} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${productCurrency === 'VES' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`}>Bs VES</button></div></div><input required name="price" id="priceInput" type="number" step="0.01" value={productCurrency === 'USD' ? (tempProductPrice || '') : (exchangeRate > 0 ? Number((tempProductPrice * exchangeRate).toFixed(2)) : '')} onChange={(e) => { const val = parseFloat(e.target.value) || 0; if (productCurrency === 'USD') setTempProductPrice(val); else setTempProductPrice(exchangeRate > 0 ? Number((val / exchangeRate).toFixed(6)) : 0); }} placeholder="0.00" className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none font-mono text-sm" /><span className="text-[9px] text-slate-400 font-bold uppercase italic block mt-1">{productCurrency === 'USD' ? `≈ Bs ${(tempProductPrice * (exchangeRate || 0)).toFixed(2)}` : `≈ $ ${tempProductPrice.toFixed(2)}`}</span></div><div className="flex-1 space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría</label><input required name="category" defaultValue={editingProduct?.category} placeholder="Ej. Tazas" className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none" /></div></div><div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Identidad Visual (Icono)</label><div className="flex flex-col md:flex-row gap-4 items-center"><div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-4xl overflow-hidden shrink-0">{productIconPreview || editingProduct?.image ? (String(productIconPreview || editingProduct?.image).startsWith('data:image') || String(productIconPreview || editingProduct?.image).startsWith('http') ? <img src={productIconPreview || editingProduct?.image} alt="" className="w-full h-full object-contain" /> : productIconPreview || editingProduct?.image) : <Utensils size={32} className="text-slate-300" />}</div><div className="flex-1 space-y-3 w-full"><div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Usar Emoji</label><input name="image" defaultValue={productIconPreview ? "" : (editingProduct?.image && !String(editingProduct.image).startsWith('data:image') ? editingProduct.image : "")} placeholder="Ej. ☕ (Opcional)" className="w-full p-2 border border-slate-200 rounded-lg focus:border-teal-500 outline-none" onChange={() => setProductIconPreview(null)} /></div><div className="relative group"><input type="file" accept=".png,.ico,.jpg,.jpeg" className="hidden" id="productImageUpload" onChange={(e) => { const file = e.target.files[0]; if (file) { compressImageForFirestore(file).then(setProductIconPreview).catch(() => showNotification("Error al procesar imagen", "error")); } }} /><label htmlFor="productImageUpload" className="flex items-center justify-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-all text-xs font-bold text-slate-500 uppercase"><Upload size={14} /> Subir Imagen (.png, .ico)</label></div></div></div></div><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Componentes (Materiales)</label><div className="space-y-2 mt-3">{editingProduct?.recipe?.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">No hay materiales añadidos.</p> : editingProduct?.recipe?.map((r, i) => <div key={i} className="flex justify-between items-center text-sm bg-white p-3 rounded-xl shadow-sm border border-slate-100"><span>{ingredients.find(ing => normalizeId(ing.id) === normalizeId(r.ingredientId))?.name || `ID:${r.ingredientId}`}</span><div className="flex items-center gap-3"><span className="font-black text-teal-600">x{r.qty}</span><button type="button" onClick={() => setEditingProduct(p => ({ ...p, recipe: p.recipe.filter(x => x.ingredientId !== r.ingredientId) }))} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={16} /></button></div></div>)}</div><div className="flex gap-2 mt-4"><div className="flex-1 relative"><input list="ingredients-list" value={tempIngredientId ? (ingredients.find(i => i.id === tempIngredientId)?.name || "") : ""} onChange={(e) => { const val = e.target.value; const found = ingredients.find(i => i.name === val); if (found) setTempIngredientId(found.id); else setTempIngredientId(""); }} placeholder="Buscar Material..." className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-teal-500 bg-white text-sm" /><datalist id="ingredients-list">{ingredients.map(i => <option key={i.id} value={i.name} />)}</datalist></div><input type="number" step="any" placeholder="Cant" value={tempIngredientQty} onChange={(e) => setTempIngredientQty(e.target.value)} className="w-24 p-3 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-center text-sm" /><button type="button" onClick={() => { if (tempIngredientId && tempIngredientQty && !isNaN(parseFloat(tempIngredientQty))) { setEditingProduct(p => ({ ...p, recipe: [...(p.recipe || []), { ingredientId: tempIngredientId, qty: parseFloat(tempIngredientQty) }] })); setTempIngredientId(""); setTempIngredientQty("1"); } }} className="bg-slate-800 text-white p-3 rounded-xl hover:bg-slate-700 shadow-lg shadow-slate-200 transition-all active:scale-95"><Plus size={20} /></button></div><div className="mt-4 pt-4 border-t border-slate-200"><div className="flex justify-between items-center mb-3"><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Costo de Producción:</span><PriceDisplay amount={calculateRecipeCost(editingProduct?.recipe)} exchangeRate={exchangeRate} size="normal" align="right" /></div><div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><Calculator size={20} className="text-slate-400" /><div className="flex-1 flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Margen %</span><input type="number" value={profitMargin} onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)} className="w-full bg-transparent font-bold text-slate-700 outline-none" /></div><div className="text-right border-l border-slate-100 pl-3"><p className="text-[9px] text-slate-400 uppercase font-bold">Sugerido</p><div className="font-black text-teal-600 text-sm whitespace-nowrap">
                                                {productCurrency === 'VES' 
                                                    ? `Bs ${(calculateRecipeCost(editingProduct?.recipe) * (1 + (profitMargin / 100)) * exchangeRate).toFixed(2)}` 
                                                    : formatCurrency(calculateRecipeCost(editingProduct?.recipe) * (1 + (profitMargin / 100)))}
                                            </div></div><button type="button" onClick={() => { const suggested = calculateRecipeCost(editingProduct?.recipe) * (1 + (profitMargin / 100)); setTempProductPrice(suggested); }} className="text-xs bg-teal-100 text-teal-700 px-3 py-2 rounded-lg font-bold hover:bg-teal-200 transition-colors">Fijar</button></div></div></div><div className="flex gap-3 mt-8 pt-4 border-t"><GlassButton onClick={() => setShowProductForm(false)} variant="secondary" className="flex-1">Cancelar</GlassButton><GlassButton type="submit" variant="primary" className="flex-1">Guardar Producto</GlassButton></div></form></GlassCard></div>)}
            {showExpenseForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-md p-6 slide-up max-h-[90vh] overflow-y-auto"><h3 className="font-bold mb-4 text-rose-600">{editingExpense ? 'Editar' : 'Registrar'} Gasto Extra</h3><form onSubmit={handleSaveExpense} className="space-y-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción del Gasto</label><input required name="description" placeholder="ej. Luz, Alquiler" defaultValue={editingExpense ? editingExpense.description : ""} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none" /></div><div className="flex gap-4"><div className="flex-1 space-y-1"><div className="flex justify-between items-center ml-1 mb-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Monto ({expenseCurrency === 'USD' ? '$' : 'Bs'})</label><div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0"><button type="button" onClick={() => setExpenseCurrency('USD')} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${expenseCurrency === 'USD' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`}>$ USD</button><button type="button" onClick={() => setExpenseCurrency('VES')} className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${expenseCurrency === 'VES' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`}>Bs VES</button></div></div><input required name="amount" type="number" step="0.01" value={expenseCurrency === 'USD' ? (tempExpenseAmount || '') : (exchangeRate > 0 ? Number((tempExpenseAmount * exchangeRate).toFixed(2)) : '')} onChange={(e) => { const val = parseFloat(e.target.value) || 0; if (expenseCurrency === 'USD') setTempExpenseAmount(val); else setTempExpenseAmount(exchangeRate > 0 ? Number((val / exchangeRate).toFixed(6)) : 0); }} placeholder="0.00" className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none font-mono text-sm" /><span className="text-[9px] text-slate-400 font-bold uppercase italic block mt-1">{expenseCurrency === 'USD' ? `≈ Bs ${(tempExpenseAmount * (exchangeRate || 0)).toFixed(2)}` : `≈ $ ${tempExpenseAmount.toFixed(2)}`}</span></div><div className="flex-1 space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría</label><input required name="category" placeholder="Seleccionar..." list="cats" defaultValue={editingExpense ? editingExpense.category : ""} className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none bg-white" /><datalist id="cats"><option value="Servicios" /><option value="Nómina" /><option value="Mantenimiento" /></datalist></div></div><div className="flex gap-3 mt-6 pt-4 border-t"><GlassButton onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} variant="secondary" className="flex-1">Cancelar</GlassButton><GlassButton type="submit" variant="expense" className="flex-1">{editingExpense ? 'Guardar Cambios' : 'Registrar Gasto'}</GlassButton></div></form></GlassCard></div>)}
            {confirmation.show && (<div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"><GlassCard className="p-6 max-w-sm w-full text-center slide-up"><AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" /><h3 className="font-bold text-lg mb-2">{confirmation.message}</h3><div className="flex gap-3 justify-center"><GlassButton variant="secondary" onClick={() => setConfirmation({ show: false })}>Cancelar</GlassButton><GlassButton variant="danger" onClick={confirmation.onConfirm}>Confirmar</GlassButton></div></GlassCard></div>)}
            {aiModal.show && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"><GlassCard className="w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[80vh] slide-up"><div className="p-4 bg-gradient-to-br from-teal-400 to-teal-600 text-slate-900 flex justify-between items-center shadow-lg"><h3 className="font-bold flex items-center gap-2 uppercase tracking-wider text-xs md:text-sm"><Sparkles size={18} /> {aiModal.title}</h3><button onClick={() => setAiModal(p => ({ ...p, show: false }))} className="p-1 hover:bg-slate-900/10 rounded-full"><X className="text-slate-900" /></button></div><div className="p-6 overflow-y-auto bg-slate-50 flex-1">{aiModal.loading ? <div className="flex flex-col items-center justify-center py-10 space-y-4"><Loader2 size={40} className="animate-spin text-teal-500" /><p className="text-slate-500 animate-pulse">Consultando a J.L. Assistant...</p></div> : <div className="prose prose-slate max-w-none text-sm whitespace-pre-wrap">{String(aiModal.content)}</div>}</div>{!aiModal.loading && <div className="p-4 border-t border-slate-200 bg-white text-right shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"><GlassButton onClick={() => setAiModal(p => ({ ...p, show: false }))} variant="primary" className="w-full md:w-auto">Entendido</GlassButton></div>}</GlassCard></div>)}
            
            
            {showMermaForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-sm p-6 slide-up"><h3 className="font-bold mb-4 text-red-600 flex items-center gap-2"><AlertTriangle size={20}/> Reportar Merma</h3><form onSubmit={handleReportMerma} className="space-y-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">Material Dañado</label><select required value={mermaIngredientId} onChange={e => setMermaIngredientId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 outline-none"><option value="">Seleccione...</option>{filterAndSort(ingredients).map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stock} {i.unit})</option>)}</select></div><div><label className="text-[10px] font-bold text-slate-400 uppercase">Cantidad a descontar</label><input required type="number" step="any" min="0.01" value={mermaQty} onChange={e => setMermaQty(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 outline-none"/></div><div><label className="text-[10px] font-bold text-slate-400 uppercase">Motivo o Detalle</label><input required placeholder="Ej: Taza manchada, Tela quemada" value={mermaReason} onChange={e => setMermaReason(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 outline-none"/></div><div className="flex gap-3 mt-6"><GlassButton onClick={() => setShowMermaForm(false)} variant="secondary" className="flex-1">Cancelar</GlassButton><GlassButton type="submit" variant="primary" className="flex-1 !bg-red-600 !text-white hover:!bg-red-700">Registrar</GlassButton></div></form></GlassCard></div>)}

            {showCustomerForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <GlassCard className="w-full max-w-md p-6 slide-up max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold mb-4 text-slate-800 flex items-center gap-2">
                            <Users className="text-teal-600" /> {editingCustomer?.id ? 'Editar' : 'Nuevo'} Cliente
                        </h3>
                        <form onSubmit={handleSaveCustomer} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre / Razón Social</label>
                                <input 
                                    name="name" 
                                    required 
                                    placeholder="Ej. Alejandro Gómez" 
                                    defaultValue={editingCustomer?.name} 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs md:text-sm" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Teléfono</label>
                                <input 
                                    name="phone" 
                                    placeholder="Ej. +58 412 1234567" 
                                    defaultValue={editingCustomer?.phone} 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs md:text-sm" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Correo Electrónico</label>
                                <input 
                                    name="email" 
                                    type="email" 
                                    placeholder="Ej. alejandro@gmail.com" 
                                    defaultValue={editingCustomer?.email} 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs md:text-sm" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dirección / Notas</label>
                                <textarea 
                                    name="address" 
                                    placeholder="Dirección fiscal, detalles de entrega, etc." 
                                    defaultValue={editingCustomer?.address} 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs md:text-sm resize-none" 
                                    rows="3"
                                />
                            </div>
                            <div className="flex gap-3 mt-6 pt-4 border-t">
                                <GlassButton type="button" onClick={() => { setShowCustomerForm(false); setEditingCustomer(null); }} variant="secondary" className="flex-1">
                                    Cancelar
                                </GlassButton>
                                <GlassButton type="submit" variant="primary" className="flex-1">
                                    Guardar Cliente
                                </GlassButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}

            {showCalculator && (showIngredientForm || showProductForm) && (
                <FloatingCalculator 
                    onClose={() => setShowCalculator(false)}
                    onApply={(result) => {
                        if (showIngredientForm) {
                            if (formCurrency === 'USD') setTempCost(result);
                            else setTempCost(exchangeRate > 0 ? Number((result / exchangeRate).toFixed(6)) : 0);
                            setIsIvaApplied(false);
                            showNotification("Resultado aplicado al costo", "success");
                        } else if (showProductForm) {
                            if (productCurrency === 'USD') setTempProductPrice(result);
                            else setTempProductPrice(exchangeRate > 0 ? Number((result / exchangeRate).toFixed(6)) : 0);
                            showNotification("Resultado aplicado al precio de venta", "success");
                        }
                    }}
                />
            )}

            {!showCalculator && (showIngredientForm || showProductForm) && (
                <button 
                    onClick={() => setShowCalculator(true)} 
                    className="fixed bottom-24 right-6 z-[60] w-14 h-14 bg-slate-900/90 backdrop-blur-md rounded-full shadow-2xl border border-white/20 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform animate-in slide-in-from-bottom" 
                    title="Abrir Calculadora"
                >
                    <Calculator size={24} className="text-teal-500" />
                </button>
            )}

            {notification && (<div className={`fixed bottom-6 right-6 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-[70] ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{notification.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}<span className="font-bold">{notification.msg}</span></div>)}
        </div>
    );
}
