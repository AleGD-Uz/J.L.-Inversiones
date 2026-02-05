import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
    LayoutDashboard, ShoppingCart, Package, TrendingUp, Plus, Minus, Trash2, 
    Save, Search, AlertCircle, Menu, X, DollarSign, UtensilsCrossed, ChefHat, 
    Info, Edit, RefreshCw, Settings, AlertTriangle, Calendar, Clock, Sparkles, 
    Bot, Loader2, Zap, FileText, Download, Megaphone, ClipboardList, Eye, 
    MessageSquare, Calculator, History, ArrowRightLeft, Utensils, ChevronDown, 
    ChevronUp, Wallet, PieChart, ArrowUpCircle, ArrowDownCircle, Lightbulb, 
    ShieldCheck, Hash, CreditCard, Receipt, Clock3, Filter, SortAsc, SortDesc,
    Maximize2, Minimize2, CalendarDays, ChevronLeft, ChevronRight, Upload, Database,
    Cloud, Wifi, WifiOff, LogOut, Lock, User, Mail, Key, Users, UserPlus, UserMinus,
    CheckCircle, Activity, Link, UserCog, UserCheck, Timer
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area 
} from 'recharts';

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
  apiKey: "AIzaSyDClrWJ8RsQqM9XT_bSG0rxTXx4gkoBMkA",
  authDomain: "yuyas-burger-v2.firebaseapp.com",
  projectId: "yuyas-burger-v2",
  storageBucket: "yuyas-burger-v2.firebasestorage.app",
  messagingSenderId: "383552113074",
  appId: "1:383552113074:web:a55f0bbed0fba88c57bcab"
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

// --- HELPERS ---
const normalizeId = (id) => {
    if (id === null || id === undefined) return "";
    return String(id).trim();
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
    
    // Header
    doc.setFillColor(249, 115, 22); // Orange
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Yuya's Burger", 14, 13);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(title, 14, 30);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 36);

    // Table
    doc.autoTable({
        startY: 40,
        head: [columns],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
    });

    // Footer
    if (footerText) {
        doc.text(footerText, 14, doc.lastAutoTable.finalY + 10);
    }

    doc.save(filename);
};

// --- HOOK DE INACTIVIDAD (AUTO LOGOUT) ---
const useIdleTimer = (timeout = 1800000, onIdle) => { // 30 min default
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
        window.addEventListener('touchstart', resetTimer); // Soporte táctil añadido
        
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
const useDataSync = (user, appId) => {
    const [data, setData] = useState({
        ingredients: [],
        products: [],
        salesHistory: [],
        stockHistory: [],
        otherExpenses: [],
        pendingOrders: [],
        appUsers: [],
        config: { exchangeRate: 0 } 
    });
    
    const [status, setStatus] = useState({ 
        connected: false, error: null, lastSync: null, dbMissing: false 
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !db || !appId) {
            setLoading(false);
            return;
        }

        setStatus(prev => ({ ...prev, connected: true, error: null, dbMissing: false }));
        setLoading(true);

        const publicPath = (col) => collection(db, 'artifacts', appId, 'public', 'data', col);

        const subscribe = (colName, stateKey, orderField = null) => {
            let q = publicPath(colName);
            if (orderField) q = query(q, orderBy(orderField, 'desc'));

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

        const unsubs = [
            subscribe('ingredients', 'ingredients'),
            subscribe('products', 'products'),
            subscribe('sales', 'salesHistory'),
            subscribe('stock_history', 'stockHistory', 'date'),
            subscribe('other_expenses', 'otherExpenses'),
            subscribe('pending_orders', 'pendingOrders'),
            subscribe('users', 'appUsers'),
            onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'general'), (docSnap) => {
                if (docSnap.exists()) setData(prev => ({ ...prev, config: docSnap.data() }));
            })
        ];

        const updatePresence = async () => {
            if (user?.uid) {
                try {
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), {
                        lastActive: new Date().toISOString()
                    });
                } catch (e) {
                }
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
    }, [user, appId]);

    return { data, status, loading };
};

// --- COMPONENTES UI AUXILIARES ---
const GlassCard = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl ${className}`}>
    {children}
  </div>
);

const GlassButton = ({ children, onClick, variant = "primary", className = "", disabled = false, title = "", type = "button", form }) => {
  // AJUSTE MOVIL: Padding reducido para simular zoom out
  const baseStyle = "px-3 py-2 md:px-4 md:py-2 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg select-none touch-manipulation text-xs md:text-sm";
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:shadow-orange-500/30 border border-white/20",
    secondary: "bg-white/50 text-slate-700 hover:bg-white/80 border border-white/40 backdrop-blur-md",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-red-500/30",
    success: "bg-gradient-to-r from-emerald-400 to-cyan-500 text-white hover:shadow-emerald-500/30",
    info: "bg-gradient-to-r from-blue-400 to-indigo-500 text-white hover:shadow-blue-500/30",
    kitchen: "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-amber-500/30 border border-white/20",
    expense: "bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-red-500/30 border border-white/20",
    gemini: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white animate-gradient-xy hover:shadow-purple-500/40 border border-white/20",
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
  // AJUSTE MOVIL: Texto más pequeño
  return <span className={`px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-lg text-[9px] md:text-xs font-bold backdrop-blur-sm whitespace-nowrap ${styles[type]}`}>{children}</span>;
};

const PriceDisplay = ({ amount = 0, className = "", exchangeRate, size="normal", align="left" }) => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    const safeRate = isNaN(exchangeRate) ? 0 : exchangeRate;
    const formattedBs = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(safeAmount * safeRate);
    const formattedUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeAmount);
    const alignClass = align === 'right' ? 'text-right' : (align === 'center' ? 'text-center' : 'text-left');
    // AJUSTE MOVIL: Tamaños ajustados
    const textSize = size === 'large' ? 'text-lg md:text-2xl' : (size === 'small' ? 'text-xs' : 'text-sm md:text-base');
    return (
        <div className={`${className} ${alignClass}`}>
            <div className={`font-bold text-slate-800 leading-none ${textSize}`}>{formattedUsd}</div>
            <div className="text-[9px] md:text-xs text-slate-500 font-mono mt-0.5">{formattedBs}</div>
        </div>
    );
};

// --- COMPONENTES UI COMPLEJOS ---

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
        if (viewMode === 'daily') return currentDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }); 
        else if (viewMode === 'monthly') return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        return 'Rango';
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 bg-white/50 p-3 md:p-4 rounded-2xl border border-white/40 shadow-sm mb-6 items-center justify-between">
            <div className="flex bg-slate-200/50 rounded-xl p-1 w-full md:w-auto">
                {[{id: 'daily', label: 'Día'}, {id: 'monthly', label: 'Mes'}, {id: 'range', label: 'Rango'}].map(m => (
                    <button key={m.id} onClick={() => setViewMode(m.id)} className={`flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${viewMode === m.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{m.label}</button>
                ))}
            </div>
            {viewMode !== 'range' && (
                <div className="flex items-center gap-4 bg-white/60 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-white/50 w-full md:w-auto justify-between md:justify-center">
                    <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={18}/></button>
                    <div className="text-center min-w-[100px] md:min-w-[120px]"><span className="block font-black text-slate-800 capitalize text-base md:text-lg leading-none">{formatDate()}</span></div>
                    <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={18}/></button>
                </div>
            )}
        </div>
    );
};

const DateRangeToolbar = ({ startDate, setStartDate, endDate, setEndDate, onDownloadPdf, title = "Filtrar por Fecha" }) => (
    <div className="flex flex-col md:flex-row gap-3 bg-white/50 p-3 rounded-2xl border border-white/40 shadow-sm mb-4 items-center">
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 whitespace-nowrap"><Calendar size={14} className="text-orange-500"/> <span className="hidden md:inline font-medium">{title}:</span></div>
        <div className="flex gap-2 w-full md:w-auto">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white/80 border border-slate-200 rounded-lg px-2 py-1.5 md:py-2 text-xs w-full focus:outline-none focus:border-orange-400" />
            <span className="text-slate-400 py-2">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white/80 border border-slate-200 rounded-lg px-2 py-1.5 md:py-2 text-xs w-full focus:outline-none focus:border-orange-400" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            {onDownloadPdf && (<GlassButton variant="secondary" onClick={onDownloadPdf} className="flex-1 md:w-auto text-xs py-1.5 md:py-2 h-full"><Download size={14}/> <span className="inline">PDF</span></GlassButton>)}
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-slate-400 hover:text-red-500 underline whitespace-nowrap px-2">Limpiar</button>
        </div>
    </div>
);

const AdvancedToolbar = ({ searchQuery, setSearchQuery, sortConfig, setSortConfig, sortOptions = [], placeholder = "Buscar..." }) => (
    <div className="flex flex-col md:flex-row gap-3 bg-white/50 p-3 rounded-2xl border border-white/40 shadow-sm mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder={placeholder} className="pl-9 pr-4 py-2 md:py-2 rounded-xl border border-slate-200 w-full focus:outline-none focus:ring-2 focus:ring-orange-500/50 bg-white/80 text-xs md:text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        {sortOptions.length > 0 && (<div className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-xl border border-slate-200 overflow-x-auto"><span className="text-slate-400 hidden md:block"><Filter size={16}/></span><select className="bg-transparent py-2 text-xs md:text-sm text-slate-700 focus:outline-none cursor-pointer w-full md:w-auto" value={sortConfig.key} onChange={(e) => setSortConfig({...sortConfig, key: e.target.value})}>{sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><button onClick={() => setSortConfig({...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-2 hover:bg-slate-100 rounded text-slate-500" title={sortConfig.direction === 'asc' ? "Ascendente" : "Descendente"}>{sortConfig.direction === 'asc' ? <SortAsc size={16}/> : <SortDesc size={16}/>}</button></div>)}
    </div>
);

const ProductCard = ({ product, ingredients, addToCart, exchangeRate, getProductMaxStock }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxStock = getProductMaxStock(product);
  const isOutOfStock = maxStock <= 0;
  return (
    <GlassCard onClick={() => setIsExpanded(!isExpanded)} className={`group relative overflow-hidden transition-all duration-300 hover:shadow-orange-500/20 cursor-pointer select-none touch-manipulation ${isOutOfStock ? 'opacity-60 grayscale' : ''} ${isExpanded ? 'ring-2 ring-orange-400 scale-[1.02] z-10' : 'active:scale-95'}`}>
      <div className="absolute top-0 right-0 p-2 z-10"><Badge type={isOutOfStock ? "danger" : "success"}>{isOutOfStock ? "Agotado" : `${maxStock} disp`}</Badge></div>
      <div className="p-3 md:p-4 flex flex-col items-center text-center h-full">
        <div className="text-4xl md:text-5xl mb-3 drop-shadow-md">{String(product.image)}</div>
        <h3 className="font-bold text-slate-800 leading-tight mb-2 line-clamp-1 text-sm md:text-base">{product.name}</h3>
        <div className={`w-full text-left bg-orange-50/60 rounded-xl mb-3 overflow-hidden border border-orange-100/50 ${isExpanded ? 'p-3' : 'p-2 h-0 opacity-0 hidden'}`}>{isExpanded && (<div><p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-2">Ingredientes:</p><ul className="text-xs text-slate-600 space-y-1">{product.recipe?.map((r, idx) => { 
            const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId)); 
            return ing ? <li key={idx} className="flex justify-between border-b border-orange-200/30 pb-1"><span>{ing.name}</span><span className="font-mono font-bold text-orange-600">x{r.qty}</span></li> : <li key={idx} className="text-red-400">Ingrediente no encontrado ({r.ingredientId})</li>; 
        })}</ul></div>)}</div>
        <div className="mb-2 text-slate-300">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
        <div className="mb-4"><PriceDisplay amount={product.price} exchangeRate={exchangeRate} size="large" align="center" /></div>
        <GlassButton onClick={(e) => { e.stopPropagation(); addToCart(product); }} disabled={isOutOfStock} className="w-full mt-auto text-xs md:text-sm py-1.5 md:py-2">{isExpanded ? 'Añadir' : 'Agregar'}</GlassButton>
      </div>
    </GlassCard>
  );
};

const LoginScreen = ({ onLogin }) => {
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
                <div className="text-center mb-8"><div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4"><ChefHat size={40} className="text-white" /></div><h1 className="text-3xl font-black text-white tracking-tight">Yuya's Burger</h1></div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (<div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2"><AlertCircle size={16}/> {error}</div>)}
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Correo</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-10 text-white focus:outline-none focus:border-orange-500" placeholder="admin@yuyas.com" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Contraseña</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-10 text-white focus:outline-none focus:border-orange-500" placeholder="••••••••" /></div>
                    <button type="submit" disabled={loading} className="w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:shadow-orange-500/30">{loading ? <Loader2 size={20} className="animate-spin"/> : 'Iniciar Sesión'}</button>
                    <div className="text-center mt-4">
                       <p className="text-xs text-slate-400">Acceso restringido a personal autorizado.</p>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
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
    const [loading, setLoading] = useState(false);

    const totalUsers = appUsers.length;
    const adminCount = appUsers.filter(u => u.role === 'Gerente').length;
    const employeeCount = appUsers.filter(u => u.role !== 'Gerente').length;

    // Helper estado
    const isOnline = (dateStr) => {
        if (!dateStr) return false;
        const diff = new Date() - new Date(dateStr);
        return diff < 300000; // 5 minutos
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
            await onEditUser(editingUser.uid, { name: editName, role: editRole }); 
            setEditingUser(null); 
        } catch (e) { console.error(e); } finally { setLoading(false); } 
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-indigo-500 text-white p-4 rounded-xl shadow-lg shadow-indigo-200">
                    <p className="text-indigo-200 text-xs font-bold uppercase">Total</p>
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
                    <Users className="text-indigo-500"/> Personal
                </h3>
                <GlassButton onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "primary"}>
                    {isCreating ? <X size={16}/> : <UserPlus size={16}/>} <span className="hidden md:inline">{isCreating ? "Cancelar" : "Nuevo Usuario"}</span>
                </GlassButton>
            </div>

            {isCreating && (
                <GlassCard className="p-6 border-l-4 border-indigo-500 bg-indigo-50/50 animate-in slide-in-from-top-4 mb-6">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2"><UserPlus size={18}/> Nuevo Acceso</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Nombre Completo</label>
                                <input required type="text" placeholder="Ej. Juan Pérez" value={newName} onChange={e=>setNewName(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Rol</label>
                                <select value={newRole} onChange={e=>setNewRole(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl bg-white focus:border-indigo-500 outline-none">
                                    <option>Gerente</option><option>Cajero</option><option>Cocina</option><option>Empleado</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Correo Electrónico</label>
                                <input required type="email" placeholder="juan@yuyas.com" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Contraseña Inicial</label>
                                <input required type="password" placeholder="Mínimo 6 caracteres" value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full p-3 md:p-2.5 border border-slate-300 rounded-xl focus:border-indigo-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <GlassButton type="submit" disabled={loading} variant="info" className="w-full md:w-auto">
                                {loading ? <Loader2 className="animate-spin"/> : 'Registrar'}
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>
            )}

            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <GlassCard className="w-full max-w-md p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2"><UserCog size={20} className="text-amber-500"/> Editar Usuario</h4>
                            <button onClick={()=>setEditingUser(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                <p className="text-xs text-slate-400 uppercase font-bold">Cuenta</p>
                                <p className="text-sm font-mono text-slate-600 truncate">{editingUser.email}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Nombre</label>
                                <input required type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="w-full p-3 md:p-2.5 border rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">Rol / Permisos</label>
                                <select value={editRole} onChange={e=>setEditRole(e.target.value)} className="w-full p-3 md:p-2.5 border rounded-xl bg-white">
                                    <option>Gerente</option><option>Cajero</option><option>Cocina</option><option>Empleado</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <GlassButton onClick={()=>setEditingUser(null)} variant="secondary">Cancelar</GlassButton>
                                <GlassButton type="submit" disabled={loading} variant="success">
                                    {loading ? <Loader2 className="animate-spin"/> : 'Guardar'}
                                </GlassButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appUsers.map(u => {
                    const online = isOnline(u.lastActive);
                    return (
                        <div key={u.id || Math.random()} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className={`h-2 w-full ${u.role === 'Gerente' ? 'bg-indigo-500' : (u.role === 'Cocina' ? 'bg-orange-400' : 'bg-slate-300')}`}></div>
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg ${u.role === 'Gerente' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                                                {typeof u.name === 'string' ? u.name.charAt(0).toUpperCase() : <User size={24}/>}
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
                                                <button onClick={() => { setEditingUser(u); setEditName(u.name || ""); setEditRole(u.role || "Empleado"); }} className="p-3 md:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                                                    <Edit size={16}/>
                                                </button>
                                                <button onClick={() => onDeleteUser(u)} className="p-3 md:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => { setEditingUser(u); setEditName(u.name || ""); setEditRole(u.role || "Empleado"); }} className="p-3 md:p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Editar mi perfil">
                                                <UserCheck size={16}/>
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
  const [activeTab, setActiveTab] = useState('pos');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [currentAppId, setCurrentAppId] = useState(ENV_APP_ID);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(() => signOut(auth).then(() => { 
      // showNotification("Sesión cerrada por inactividad"); 
      setUser(null); 
  }), []);

  const isIdle = useIdleTimer(1800000, () => {
      if (user) {
          handleLogout();
          alert("Tu sesión ha sido cerrada por seguridad debido a inactividad.");
      }
  });

  const { data, status: connectionStatus, loading: dataLoading } = useDataSync(user, currentAppId);
  const { ingredients, products, salesHistory, stockHistory, otherExpenses, pendingOrders, appUsers, config } = data;
  const exchangeRate = config?.exchangeRate || 0; // DEFAULT 0

  // Estados locales
  const [cart, setCart] = useState([]);
  const [saleDescription, setSaleDescription] = useState(""); 
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [observationText, setObservationText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedKardexId, setExpandedKardexId] = useState(null);
  const [tempKardexObs, setTempKardexObs] = useState("");
  const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);
  const fileInputRef = useRef(null);
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
  const [tempIngredientQty, setTempIngredientQty] = useState("");

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(isNaN(amount) ? 0 : amount);
  const formatBs = (amountUsd) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format((isNaN(amountUsd) ? 0 : amountUsd) * (isNaN(exchangeRate) ? 0 : exchangeRate));
  const showNotification = (msg, type = "success") => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };

  const handleLogin = (email, password) => signInWithEmailAndPassword(auth, email, password);
  
  const handleCreateUserSystem = async (email, password, name, role) => {
      try {
          let secondaryApp;
          try { secondaryApp = getApp("SecondaryApp"); } catch (e) { secondaryApp = initializeApp(firebaseConfig, "SecondaryApp"); }
          const secondaryAuth = getAuth(secondaryApp);
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          const newUser = userCredential.user;
          await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'users', newUser.uid), { uid: newUser.uid, name: name, email: email, role: role, createdAt: new Date().toISOString() });
          await signOut(secondaryAuth);
          showNotification(`Usuario ${name} creado exitosamente`);
      } catch (error) {
          console.error("Error creando usuario:", error);
          if (error.code === 'auth/email-already-in-use') showNotification("El correo ya está registrado", "error");
          else showNotification("Error al crear usuario: " + error.message, "error");
      }
  };

  const handleEditUserSystem = async (uid, newData) => { try { await updateDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'users', uid), newData); showNotification("Usuario actualizado correctamente"); } catch (error) { console.error(error); showNotification("Error al actualizar usuario", "error"); } };
  const handleDeleteUserSystem = (userToDelete) => { setConfirmation({ show: true, message: `¿Eliminar a ${userToDelete.name} de la lista?`, onConfirm: async () => { try { await deleteDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'users', userToDelete.uid)); showNotification("Usuario eliminado de la lista"); setConfirmation({ show: false }); } catch (error) { console.error(error); showNotification("Error al eliminar", "error"); } } }); };

  const saveToDB = async (collectionName, data, id = null) => { if(!db) return; const docId = id ? id.toString() : (data.id ? data.id.toString() : Date.now().toString()); await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', collectionName, docId), data); };
  const deleteFromDB = async (collectionName, id) => { if(!db) return; await deleteDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', collectionName, id.toString())); };

  const getProductMaxStock = (product) => { 
      if (!product.recipe?.length) return 999; 
      return Math.min(...product.recipe.map(item => { 
          const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(item.ingredientId)); 
          return ing && ing.stock > 0 ? Math.floor(ing.stock / item.qty) : 0; 
      })); 
  };
  const addToCart = (product) => { if (cart.find(c => c.id === product.id)?.qty >= getProductMaxStock(product)) { showNotification(`¡Stock insuficiente!`, "error"); return; } setCart(prev => { const ex = prev.find(i => i.id === product.id); return ex ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...product, qty: 1 }]; }); if(window.innerWidth < 1024 && cart.length === 0) setIsCartOpenMobile(true); };
  
  const handleSaveToPending = async () => { 
      if (cart.length === 0) return; 
      const isUpdate = editingOrderId !== null; 
      const orderId = isUpdate ? editingOrderId : Date.now(); 
      const order = { id: orderId, date: new Date().toISOString(), items: cart, total: cart.reduce((s, i) => s + i.price * i.qty, 0), description: saleDescription || "Cliente General", status: 'pending' }; 
      cart.forEach(cartItem => cartItem.recipe?.forEach(r => { 
          const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId)); 
          if(ing) { 
              const qty = r.qty * cartItem.qty; 
              const newStock = ing.stock - qty; 
              saveToDB('ingredients', { ...ing, stock: newStock }, ing.id); 
              const log = { 
                  id: Date.now()+Math.random(), 
                  date: new Date().toISOString(), 
                  type: 'SUB', 
                  ingredientName: ing.name, 
                  ingredientId: ing.id, 
                  qtyChange: -qty, 
                  costPerUnit: ing.cost || 0,
                  totalValue: qty * (ing.cost || 0),
                  previousStock: ing.stock, 
                  newStock: newStock, 
                  reason: isUpdate ? `Modif #${orderId}` : `Venta: ${cartItem.name}` 
              }; 
              saveToDB('stock_history', log, log.id); 
          } 
      })); 
      saveToDB('pending_orders', order, order.id); 
      showNotification(isUpdate ? "Orden actualizada" : "Enviada a cocina"); 
      setCart([]); setSaleDescription(""); setEditingOrderId(null); setIsCartOpenMobile(false); if (isUpdate) setActiveTab('pending'); 
  };
  
  const handleCancelPendingOrder = (order) => { 
      setConfirmation({ show: true, message: "¿Cancelar y devolver stock?", onConfirm: () => { 
          order.items.forEach(item => item.recipe?.forEach(r => { 
              const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId)); 
              if(ing) { 
                  const qty = r.qty * item.qty; 
                  const newStock = ing.stock + qty; 
                  saveToDB('ingredients', { ...ing, stock: newStock }, ing.id); 
                  const log = { 
                      id: Date.now()+Math.random(), 
                      date: new Date().toISOString(), 
                      type: 'ADD', 
                      ingredientName: ing.name, 
                      ingredientId: ing.id, 
                      qtyChange: qty, 
                      costPerUnit: ing.cost || 0,
                      totalValue: qty * (ing.cost || 0),
                      previousStock: ing.stock, 
                      newStock: newStock, 
                      reason: `Cancelación #${order.id}` 
                  }; 
                  saveToDB('stock_history', log, log.id); 
              } 
          })); 
          deleteFromDB('pending_orders', order.id); 
          setConfirmation({ show: false }); 
          showNotification("Orden cancelada"); 
      }}); 
  };
  
  // FUNCIONES DE PDF REALES
  const handleDownloadReceipt = (sale) => {
      const data = sale.items.map(item => [item.qty, item.name, `$${item.price.toFixed(2)}`, `$${(item.price*item.qty).toFixed(2)}`]);
      data.push(['', 'TOTAL', '', `$${sale.total.toFixed(2)}`]);
      generatePDF(`Recibo #${String(sale.id).slice(-6)}`, ["Cant", "Item", "Unit", "Subtotal"], data, `recibo_${sale.id}.pdf`, `Cliente: ${sale.description || 'Consumidor Final'}`);
  };

  const handleDownloadReport = (data) => {
      const rows = data.map(s => [new Date(s.date).toLocaleDateString(), s.description || '-', `$${s.total.toFixed(2)}`]);
      generatePDF('Reporte de Ventas', ["Fecha", "Cliente", "Total"], rows, 'reporte_ventas.pdf');
  };
  
  const handleDownloadMenu = () => {
      const rows = products.map(p => [p.name, p.category, `$${p.price.toFixed(2)}`]);
      generatePDF('Menú de Productos', ["Nombre", "Categoría", "Precio"], rows, 'menu.pdf');
  };

  const handleCobrar = (order) => { const sale = { ...order, status: 'completed', date: new Date().toISOString() }; saveToDB('sales', sale, sale.id); deleteFromDB('pending_orders', order.id); setReceiptModal({show:true, sale: sale}); };
  const handleUpdateObservation = () => { if (!selectedSale) return; saveToDB('sales', { ...selectedSale, observation: observationText }, selectedSale.id); setSelectedSale(prev => ({ ...prev, observation: observationText })); showNotification("Observación guardada"); };
  const handleSaveKardexObservation = (id) => { const log = stockHistory.find(l => l.id === id); if(log) { saveToDB('stock_history', { ...log, observation: tempKardexObs }, id); showNotification("Nota guardada en Kardex"); } };
  const handleSaveExpense = (e) => { e.preventDefault(); const fd = new FormData(e.target); const expense = {id: Date.now(), date: new Date().toISOString(), description: fd.get('description'), amount: parseFloat(fd.get('amount')), category: fd.get('category')}; saveToDB('other_expenses', expense, expense.id); setShowExpenseForm(false); showNotification("Gasto registrado"); };
  const handleSaveProduct = (e) => { e.preventDefault(); const fd = new FormData(e.target); const d = { id: editingProduct?.id || Date.now(), name: fd.get('name'), price: parseFloat(fd.get('price')), category: fd.get('category'), image: fd.get('image'), recipe: editingProduct?.recipe || [] }; saveToDB('products', d, d.id); setShowProductForm(false); showNotification("Producto guardado"); };
  
  const handleSaveIngredient = (e) => { 
      e.preventDefault(); 
      const fd = new FormData(e.target); 
      const d = { 
          id: editingIngredient?.id || Date.now(), 
          name: fd.get('name'), 
          unit: fd.get('unit'), 
          cost: parseFloat(fd.get('cost')) || 0,
          stock: parseFloat(fd.get('stock')), 
          minStock: 10 
      }; 
      if(!editingIngredient) { 
          const log = { 
              id: Date.now(), 
              date: new Date().toISOString(), 
              type: 'ADD', 
              ingredientName: d.name, 
              qtyChange: d.stock, 
              reason: 'Inicio', 
              newStock: d.stock, 
              totalValue: d.stock*d.cost 
          }; 
          saveToDB('stock_history', log, log.id); 
      } 
      saveToDB('ingredients', d, d.id); 
      setShowIngredientForm(false); 
  };

  const handleUpdateExchangeRate = (val) => { setExchangeRate(val); if(db) setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'config', 'general'), { exchangeRate: val }); };
  const calculateRecipeCost = (recipe) => { if (!recipe) return 0; return recipe.reduce((total, r) => { const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId)); return total + (ing ? (ing.cost || 0) * r.qty : 0); }, 0); };
  const isWithinRange = (dateString) => { if (!dateString) return false; if (!startDate && !endDate) return true; const d = new Date(dateString).setHours(0,0,0,0); const start = startDate ? new Date(startDate).setHours(0,0,0,0) : -Infinity; const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity; return d >= start && d <= end; };
  const isWithinPeriod = (dateString) => { if (viewMode === 'range') return isWithinRange(dateString); const d = new Date(dateString); const target = new Date(currentDateView); if (viewMode === 'daily') return d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear(); else if (viewMode === 'monthly') return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear(); return true; };
  const filterAndSort = (data, fieldsToCheck = [], useDateFilter = false, usePeriodFilter = false) => { let processed = [...data]; if (useDateFilter) processed = processed.filter(item => isWithinRange(item.date)); if (usePeriodFilter) processed = processed.filter(item => isWithinPeriod(item.date)); if (searchQuery) { const q = searchQuery.toLowerCase(); processed = processed.filter(item => fieldsToCheck.some(field => item[field] && String(item[field]).toLowerCase().includes(q))); } processed.sort((a, b) => { let valA = a[sortConfig.key], valB = b[sortConfig.key]; if (sortConfig.key === 'date' || sortConfig.key === 'id') { valA = new Date(a.date || 0).getTime(); valB = new Date(b.date || 0).getTime(); } if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); } return sortConfig.direction === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1); }); return processed; };
  const callGeminiAI = async (prompt, title) => { setAiModal({ show: true, title, content: '', loading: true }); try { const apiKey = "AIzaSyDQfb1krfzT_4LKyqPmYH-7zXedNd-hzHc"; const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }); const data = await response.json(); setAiModal(prev => ({ ...prev, loading: false, content: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta." })); } catch (error) { setAiModal(prev => ({ ...prev, loading: false, content: `Error: ${error.message}.` })); } };

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
                          const collectionsMap = { ingredients: 'ingredients', products: 'products', salesHistory: 'sales', stockHistory: 'stock_history', otherExpenses: 'other_expenses', pendingOrders: 'pending_orders' };
                          
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
                                  const batchSize = 400; // Firestore batch limit is 500
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
                          showNotification(`Restauración completada: Base de datos limpia y ${totalItems} registros importados.`, "success");
                      } catch (err) { console.error(err); showNotification("Error crítico al restaurar: " + err.message, "error"); } finally { setIsRestoring(false); setRestoreStatus(""); }
                  }
              });
          } catch (err) { console.error(err); showNotification("Error al leer archivo de respaldo", "error"); }
      };
      reader.readAsText(file); e.target.value = null; 
  };
  const handleExportData = () => { const dataStr = JSON.stringify({ ingredients, products, salesHistory, stockHistory, otherExpenses, pendingOrders }, null, 2); const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `backup_yuyas_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); };

  // --- CALCULOS FINANCIEROS MEMOIZADOS ---
  const inventoryValue = useMemo(() => ingredients.reduce((sum, ing) => sum + (ing.stock * (ing.cost || 0)), 0), [ingredients]);
  const financialData = useMemo(() => { const activeSales = filterAndSort(salesHistory, [], false, true); const activeStock = filterAndSort(stockHistory, [], false, true); const activeExpenses = filterAndSort(otherExpenses, [], false, true); const income = activeSales.reduce((acc, sale) => acc + sale.total, 0); let cogs = 0; activeSales.forEach(sale => { sale.items.forEach(item => { const product = products.find(p => p.id === item.id); if (product && product.recipe) { const unitCost = product.recipe.reduce((sum, r) => { const ing = ingredients.find(i => normalizeId(i.id) === normalizeId(r.ingredientId)); return sum + (ing ? (ing.cost || 0) * r.qty : 0); }, 0); cogs += unitCost * item.qty; } }); }); const grossProfit = income - cogs; const invExp = activeStock.filter(l => l.type === 'ADD' && !l.reason.includes('Cancelación')).reduce((acc, l) => acc + (l.totalValue || 0), 0); const otherExp = activeExpenses.reduce((acc, e) => acc + e.amount, 0); return { income, cogs, grossProfit, expenses: invExp + otherExp, netCashFlow: income - (invExp + otherExp) }; }, [salesHistory, stockHistory, otherExpenses, viewMode, currentDateView, products, ingredients]);
  
  // FUNCION DE PDF BALANCE
  const handleDownloadBalance = () => {
    const data = [
        ['Ventas Totales', `$${financialData.income.toFixed(2)}`],
        ['Costo de Ventas', `$${financialData.cogs.toFixed(2)}`],
        ['Ganancia Bruta', `$${financialData.grossProfit.toFixed(2)}`],
        ['Gastos Operativos', `$${financialData.expenses.toFixed(2)}`],
        ['Flujo Neto', `$${financialData.netCashFlow.toFixed(2)}`]
    ];
    generatePDF('Balance Financiero', ["Concepto", "Monto"], data, 'balance.pdf');
  };

  // --- RENDERIZADO PRINCIPAL ---
  if (authLoading || (user && dataLoading)) { return (<div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 size={48} className="animate-spin text-orange-500"/><p className="ml-3 text-slate-400">Sincronizando con la nube...</p></div>); }
  
  if (!user) { return <LoginScreen onLogin={handleLogin} />; }

  return (
    // AJUSTE MOVIL: Clase 'text-xs md:text-base' reduce el tamaño de fuente base en móviles
    <div className="flex h-[100dvh] bg-slate-100 font-sans text-slate-800 overflow-hidden text-xs md:text-sm lg:text-base">
      <aside className={`fixed z-40 inset-y-0 left-0 w-64 bg-slate-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-700/50"><div className="bg-gradient-to-tr from-orange-500 to-pink-500 p-2 rounded-lg"><ChefHat size={24} className="text-white" /></div><div><h1 className="text-xl font-bold tracking-tight">Yuya's</h1></div><button className="md:hidden ml-auto p-2" onClick={() => setIsMobileMenuOpen(false)}><X /></button></div>
        
        <div className="px-6 py-2">
            <div className={`text-xs px-2 py-1 rounded flex items-center gap-2 border ${connectionStatus.error ? 'bg-red-900/50 text-red-200 border-red-800' : 'bg-emerald-900/50 text-emerald-400 border-emerald-800'}`}>
                {connectionStatus.connected ? <Wifi size={12}/> : <WifiOff size={12}/>}
                <span className="truncate">{connectionStatus.error ? 'Error de Conexión' : user.email}</span>
            </div>
            {connectionStatus.dbMissing && (
                <div className="mt-2 bg-red-500 text-white text-[10px] p-2 rounded font-bold animate-pulse">
                    ⚠ ALERTA CRÍTICA: Base de datos no encontrada.
                </div>
            )}
            {!connectionStatus.dbMissing && connectionStatus.error && <p className="text-[10px] text-red-400 mt-1 px-1 leading-tight">{connectionStatus.error}</p>}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">{[{ id: 'pos', label: 'Nueva Orden', icon: <Plus size={20}/> }, { id: 'pending', label: 'Pendientes', icon: <Clock3 size={20}/>, count: pendingOrders.length }, { id: 'history', label: 'Historial', icon: <ClipboardList size={20}/> }, { id: 'products', label: 'Menú', icon: <Utensils size={20}/> }, { id: 'inventory', label: 'Inventario', icon: <Package size={20}/> }, { id: 'inventory_history', label: 'Kardex', icon: <ArrowRightLeft size={20}/> }, { id: 'balance', label: 'Balance', icon: <Wallet size={20}/> }, { id: 'reports', label: 'Reportes', icon: <TrendingUp size={20}/> }, { id: 'settings', label: 'Configuración', icon: <Settings size={20}/> },].map(item => (<button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>{item.icon} {item.label}{item.count > 0 && <span className="ml-auto bg-white text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.count}</span>}</button>))}</nav>
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/50 space-y-3"><div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700"><DollarSign size={16} className="text-green-400" /><input type="number" value={exchangeRate} onChange={(e) => handleUpdateExchangeRate(parseFloat(e.target.value))} className="bg-transparent w-full text-white font-mono text-right focus:outline-none" /><span className="text-slate-500 text-xs">Bs</span></div><button onClick={() => handleLogout()} className="w-full flex items-center gap-2 p-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><LogOut size={16}/> Cerrar Sesión</button></div>
      </aside>

      <main className="flex-1 overflow-y-auto relative p-4 md:p-6 lg:p-8 bg-slate-100">
        <button className="md:hidden absolute top-4 left-4 z-20 bg-white p-2 rounded-full shadow-lg" onClick={() => setIsMobileMenuOpen(true)}><Menu className="text-slate-700" /></button>

        {/* --- POS --- */}
        {activeTab === 'pos' && (<div className="flex flex-col lg:flex-row gap-6 h-full pb-20 lg:pb-0"><div className="lg:w-2/3 space-y-4 fade-in"><header className="flex flex-col gap-2 mt-10 md:mt-0"><h2 className="text-2xl md:text-3xl font-black text-slate-800">{editingOrderId ? `Editando #${editingOrderId}` : 'Nueva Orden'}</h2><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={{}} setSortConfig={()=>{}} placeholder="Buscar producto..." /></header><div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar touch-pan-x">{['Todos', ...new Set(products.map(p => p.category))].map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>{cat}</button>))}</div><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 items-start pb-24 md:pb-0">{filterAndSort(products, ['name', 'category']).filter(p => selectedCategory === 'Todos' || p.category === selectedCategory).map(product => (<ProductCard key={product.id} product={product} ingredients={ingredients} addToCart={addToCart} exchangeRate={exchangeRate} getProductMaxStock={getProductMaxStock} />))}</div></div><div className={`fixed inset-x-0 bottom-0 z-30 lg:relative lg:w-1/3 lg:h-auto lg:block transition-transform duration-300 ${isCartOpenMobile ? 'translate-y-0' : 'translate-y-[calc(100%-85px)]'} lg:translate-y-0`}><GlassCard className="h-[80vh] lg:h-[calc(100vh-4rem)] flex flex-col rounded-b-none lg:rounded-2xl border-b-0 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"><div onClick={() => window.innerWidth < 1024 && setIsCartOpenMobile(!isCartOpenMobile)} className={`p-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl cursor-pointer lg:cursor-default ${editingOrderId ? 'bg-amber-100' : 'bg-white'}`}><div className="flex items-center gap-2"><h3 className="font-bold text-lg flex items-center gap-2"><ShoppingCart size={20}/> Orden</h3><Badge>{cart.reduce((a,c)=>a+c.qty,0)} items</Badge></div><div className="lg:hidden text-slate-400 flex items-center gap-2"><span className="font-bold text-orange-600"><PriceDisplay amount={cart.reduce((s, i) => s + i.price * i.qty, 0)} exchangeRate={exchangeRate} size="small" /></span>{isCartOpenMobile ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}</div></div><div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white/50">{cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400"><UtensilsCrossed size={48} className="opacity-20 mb-4"/><p>Vacío</p></div> : cart.map(item => (<div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100"><div className="flex items-center gap-3"><span className="text-xl">{item.image}</span><div><p className="font-bold text-sm leading-none">{item.name}</p><PriceDisplay amount={item.price} exchangeRate={exchangeRate} size="small" /></div></div><div className="flex items-center gap-2"><button onClick={()=>setCart(prev => prev.map(p => p.id === item.id ? {...p, qty: p.qty - 1} : p).filter(p => p.qty > 0))} className="p-2 bg-slate-100 rounded hover:bg-slate-200"><Minus size={14}/></button><span className="font-bold w-6 text-center text-sm">{item.qty}</span><button onClick={()=>addToCart(item)} className="p-2 bg-slate-100 rounded hover:bg-slate-200"><Plus size={14}/></button></div></div>))}</div><div className="p-4 bg-white border-t border-slate-100 space-y-3 pb-8 lg:pb-4"><div className="flex justify-between font-black text-xl"><span>Total</span><div className="text-right"><PriceDisplay amount={cart.reduce((s, i) => s + i.price * i.qty, 0)} exchangeRate={exchangeRate} align="right" size="large" /></div></div><input type="text" value={saleDescription} onChange={(e) => setSaleDescription(e.target.value)} placeholder="Cliente / Nota..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-orange-500 outline-none" /><div className="grid grid-cols-2 gap-3"><GlassButton variant="secondary" onClick={() => { setCart([]); setEditingOrderId(null); setIsCartOpenMobile(false); }}><Trash2 size={16}/></GlassButton><GlassButton onClick={handleSaveToPending} disabled={cart.length===0} variant={editingOrderId ? "info" : "kitchen"}>{editingOrderId ? 'Actualizar' : 'Cocina'}</GlassButton></div></div></GlassCard></div></div>)}

        {/* --- PENDIENTES --- */}
        {activeTab === 'pending' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 md:p-6 rounded-2xl border border-white/40 shadow-sm"><div><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Clock3 className="text-amber-500"/> Pendientes</h2></div><div className="w-full md:w-auto"><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{value: 'date', label: 'Fecha'}]} /></div></header><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 pb-20">{filterAndSort(pendingOrders, ['description', 'id']).map(order => (<GlassCard key={order.id} className="border-l-4 border-amber-500 p-0 flex flex-col"><div className="p-4 bg-amber-50 flex justify-between"><div><h3 className="font-bold text-lg">{order.description}</h3><p className="text-xs text-slate-500">#{order.id.toString().slice(-4)} • {new Date(order.date).toLocaleTimeString()}</p></div><Badge type="warning">Cocina</Badge></div><div className="p-4 flex-1 space-y-1">{order.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm"><span className="text-slate-600"><b>{i.qty}</b> {i.name}</span></div>)}</div><div className="p-4 bg-white border-t flex flex-col gap-3"><div className="flex justify-between items-end"><span className="text-xs text-slate-400">Total</span><PriceDisplay amount={order.total} exchangeRate={exchangeRate} align="right" /></div><div className="grid grid-cols-3 gap-2"><button onClick={() => { setCart(order.items); setSaleDescription(order.description); setEditingOrderId(order.id); setActiveTab('pos'); }} className="py-3 md:py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex justify-center items-center gap-1 touch-manipulation"><Edit size={14}/> Editar</button><button onClick={() => handleCancelPendingOrder(order)} className="py-3 md:py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex justify-center items-center gap-1 touch-manipulation"><Trash2 size={14}/> Cancelar</button><button onClick={() => handleCobrar(order)} className="py-3 md:py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex justify-center items-center gap-1 touch-manipulation"><Zap size={14}/> Cobrar</button></div></div></GlassCard>))}</div></div>)}

        {/* --- MENÚ / PRODUCTOS --- */}
        {activeTab === 'products' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-2xl border border-white/40 shadow-sm"><div><h2 className="text-2xl font-black text-slate-800">Menú</h2><p className="text-slate-500">Gestión de productos</p></div><div className="flex w-full md:w-auto gap-2"><GlassButton onClick={handleDownloadMenu} variant="secondary" className="flex-1 md:flex-none"><Download size={16}/> PDF</GlassButton><GlassButton onClick={() => { setEditingProduct({ recipe: [] }); setShowProductForm(true); }} className="flex-1 md:flex-none"><Plus size={18}/> Nuevo</GlassButton></div></div><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{value: 'name', label: 'Nombre'}, {value: 'price', label: 'Precio'}, {value: 'category', label: 'Categoría'}]} /><div className="space-y-4 pb-20">{filterAndSort(products, ['name', 'category']).map(prod => (<GlassCard key={prod.id} className="p-4 flex flex-col md:flex-row items-center gap-6"><div className="flex items-center gap-4 w-full md:w-auto"><div className="text-4xl">{prod.image}</div><div className="md:hidden flex-1"><h4 className="font-bold text-lg">{prod.name}</h4><PriceDisplay amount={prod.price} exchangeRate={exchangeRate} size="normal" /></div></div><div className="flex-1 text-center md:text-left hidden md:block"><h4 className="font-bold text-lg">{prod.name}</h4><div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">{prod.recipe?.map((r, i) => <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{ingredients.find(ing => normalizeId(ing.id) === normalizeId(r.ingredientId))?.name || `ID:${r.ingredientId}`} x{r.qty}</span>)}</div></div><div className="text-right w-full md:w-auto"><div className="hidden md:block"><PriceDisplay amount={prod.price} exchangeRate={exchangeRate} size="large" align="right" /></div><div className="flex gap-2 justify-between md:justify-end mt-2 w-full"><button onClick={() => callGeminiAI(`Optimiza receta: ${prod.name}`, "Optimización")} className="p-3 md:p-2 text-teal-500 hover:bg-teal-50 rounded-lg flex-1 md:flex-none flex justify-center border border-slate-100 md:border-transparent" title="AI"><Lightbulb size={18}/></button><button onClick={() => { setEditingProduct(prod); setShowProductForm(true); }} className="p-3 md:p-2 text-slate-500 hover:bg-slate-100 rounded-lg flex-1 md:flex-none flex justify-center border border-slate-100 md:border-transparent"><Edit size={18}/></button><button onClick={() => deleteFromDB('products', prod.id)} className="p-3 md:p-2 text-red-500 hover:bg-red-50 rounded-lg flex-1 md:flex-none flex justify-center border border-slate-100 md:border-transparent"><Trash2 size={18}/></button></div></div></GlassCard>))}</div></div>)}

        {/* --- HISTORIAL (CON RANGO DE FECHAS) --- */}
        {activeTab === 'history' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-2xl font-black text-slate-800">Historial</h2><GlassButton variant="gemini" onClick={() => callGeminiAI(`Analiza ventas: ${JSON.stringify(salesHistory.slice(0,10))}`, "Tendencias")}>Analizar AI</GlassButton></div><DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onDownloadPdf={() => handleDownloadReport(filterAndSort(salesHistory, [], true))} title="Filtrar Ventas" /><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{value: 'date', label: 'Fecha'}, {value: 'total', label: 'Total'}]} /><GlassCard className="overflow-hidden"><div className="overflow-x-auto touch-pan-x"><table className="w-full text-left text-sm min-w-[600px]"><thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4">Fecha</th><th className="p-4">Cliente</th><th className="p-4 text-center">Items</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{filterAndSort(salesHistory, ['description'], true).map(sale => (<tr key={sale.id} onClick={() => { setSelectedSale(sale); setObservationText(sale.observation || ""); }} className="hover:bg-slate-50 cursor-pointer active:bg-slate-100"><td className="p-4">{new Date(sale.date).toLocaleString()}</td><td className="p-4 font-bold">{sale.description}</td><td className="p-4 text-center">{sale.items.reduce((a,b)=>a+b.qty,0)}</td><td className="p-4 text-right"><PriceDisplay amount={sale.total} exchangeRate={exchangeRate} align="right" size="small" /></td><td className="p-4 text-center"><button className="p-2 bg-white border rounded hover:bg-slate-100"><Eye size={16}/></button></td></tr>))}</tbody></table></div></GlassCard></div>)}

        {/* --- INVENTARIO --- */}
        {activeTab === 'inventory' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><GlassCard className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white"><p className="text-sm opacity-80">Valor Neto Inventario</p><h3 className="text-3xl font-black mt-1">{formatCurrency(inventoryValue)}</h3><p className="text-xs font-mono opacity-70 mt-1">{formatBs(inventoryValue)}</p></GlassCard><div className="md:col-span-2 flex flex-col justify-end gap-2 items-end"><div className="flex w-full md:w-auto gap-2"><GlassButton onClick={() => callGeminiAI(`Tengo ${ingredients.filter(i=>i.stock<i.minStock).length} insumos bajos. Dame plan compra.`, "Compras AI")} variant="secondary" className="flex-1 md:flex-none"><Sparkles size={16}/> AI</GlassButton><GlassButton onClick={() => generatePDF('Inventario', ['Nombre', 'Stock', 'Unidad'], filterAndSort(ingredients).map(i => [i.name, i.stock, i.unit]), 'inventario.pdf')} variant="secondary" className="flex-1 md:flex-none"><Download size={16}/> PDF</GlassButton><GlassButton onClick={() => { setEditingIngredient(null); setShowIngredientForm(true); }} className="flex-1 md:flex-none"><Plus size={16}/> Nuevo</GlassButton></div><AdvancedToolbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortConfig={sortConfig} setSortConfig={setSortConfig} sortOptions={[{value: 'name', label: 'Nombre'}, {value: 'stock', label: 'Stock'}]} /></div></div><GlassCard className="overflow-hidden"><div className="overflow-x-auto touch-pan-x"><table className="w-full text-left text-sm min-w-[600px]"><thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4">Insumo</th><th className="p-4">Costo Unit.</th><th className="p-4 text-center">Stock</th><th className="p-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{filterAndSort(ingredients, ['name']).map(ing => (<tr key={ing.id}><td className="p-4 font-bold">{ing.name}</td><td className="p-4"><PriceDisplay amount={ing.cost || 0} exchangeRate={exchangeRate} size="small" /></td><td className="p-4 text-center"><span className={`font-bold ${ing.stock<=ing.minStock ? 'text-red-500' : ''}`}>{ing.stock} {ing.unit}</span></td><td className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
                <button onClick={() => { setEditingIngredient(ing); setShowIngredientForm(true); }} className="p-3 md:p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Editar"><Edit size={16}/></button>
                <button onClick={() => setConfirmation({
                    show: true, 
                    message: `¿Eliminar "${ing.name}" del inventario?`, 
                    onConfirm: () => { 
                        deleteFromDB('ingredients', ing.id); 
                        setConfirmation({ show: false }); 
                        showNotification("Insumo eliminado"); 
                    }
                })} className="p-3 md:p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500" title="Eliminar"><Trash2 size={16}/></button>
            </div>
        </td></tr>))}</tbody></table></div></GlassCard></div>)}

        {/* --- KARDEX --- */}
        {activeTab === 'inventory_history' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex justify-between items-center"><h2 className="text-2xl font-black">Kardex</h2></div><DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onDownloadPdf={() => generatePDF('Kardex', ['Fecha', 'Insumo', 'Tipo', 'Cant'], filterAndSort(stockHistory, [], true).map(l => [new Date(l.date).toLocaleDateString(), l.ingredientName, l.type, l.qtyChange]), 'kardex.pdf')} title="Filtrar Movimientos" /><GlassCard className="overflow-hidden"><div className="overflow-x-auto touch-pan-x"><table className="w-full text-left text-sm min-w-[800px]"><thead className="bg-slate-50 text-slate-500 font-medium uppercase"><tr><th className="p-4">Fecha</th><th className="p-4">Item</th><th className="p-4 text-center">Mov</th><th className="p-4 text-right">Cant</th><th className="p-4 text-right">Saldo</th></tr></thead><tbody className="divide-y divide-slate-100">{filterAndSort(stockHistory, ['ingredientName', 'reason'], true).slice(0, 100).map(log => (<React.Fragment key={log.id}><tr onClick={() => { setExpandedKardexId(expandedKardexId === log.id ? null : log.id); setTempKardexObs(log.observation || ""); }} className={`cursor-pointer transition-colors ${expandedKardexId === log.id ? 'bg-indigo-50' : 'hover:bg-slate-50'} active:bg-slate-100`}><td className="p-4 text-slate-500">{new Date(log.date).toLocaleString()}</td><td className="p-4 font-bold">{log.ingredientName}</td><td className="p-4 text-center"><Badge type={log.type==='ADD'?'success':'danger'}>{log.type==='ADD'?'Entrada':'Salida'}</Badge></td><td className="p-4 text-right font-mono font-bold">{log.qtyChange}</td><td className="p-4 text-right text-slate-500">{log.newStock}</td></tr>{expandedKardexId === log.id && (<tr className="bg-indigo-50/50"><td colSpan="5" className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1"><p className="text-xs font-bold text-slate-500 uppercase">Razón</p><p className="text-sm bg-white p-2 rounded border border-indigo-100">{log.reason}</p></div><div className="flex-1"><p className="text-xs font-bold text-slate-500 uppercase">Valor Movimiento</p><PriceDisplay amount={log.totalValue || 0} exchangeRate={exchangeRate} size="small" /></div><div className="flex-1"><p className="text-xs font-bold text-slate-500 uppercase">Nota</p><div className="flex gap-2"><input className="flex-1 p-2 text-sm border rounded" value={tempKardexObs} onChange={e=>setTempKardexObs(e.target.value)} /><button onClick={()=>handleSaveKardexObservation(log.id)} className="bg-indigo-600 text-white p-2 rounded"><Save size={14}/></button></div></div></div></td></tr>)}</React.Fragment>))}</tbody></table></div></GlassCard></div>)}

        {/* --- BALANCE --- */}
        {activeTab === 'balance' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-2xl font-black text-slate-800">Balance Financiero</h2><GlassButton onClick={handleDownloadBalance} variant="secondary"><Download size={16}/> PDF Balance</GlassButton></div><PeriodNavigator currentDate={currentDateView} setCurrentDate={setCurrentDateView} viewMode={viewMode} setViewMode={setViewMode} />{viewMode === 'range' && <DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} title="Rango Personalizado" />}<h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Rentabilidad de Ventas</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><GlassCard className="p-6 border-l-4 border-emerald-500"><p className="text-sm text-slate-500 font-bold mb-1">Ventas Totales</p><PriceDisplay amount={financialData.income} exchangeRate={exchangeRate} size="large" /><p className="text-xs text-slate-400 mt-2">Ingreso Bruto</p></GlassCard><GlassCard className="p-6 border-l-4 border-amber-500"><p className="text-sm text-slate-500 font-bold mb-1">Costo de Insumos (Ventas)</p><PriceDisplay amount={financialData.cogs} exchangeRate={exchangeRate} size="large" /><p className="text-xs text-slate-400 mt-2">Costo Proveedor de lo vendido</p></GlassCard><GlassCard className="p-6 border-l-4 border-indigo-600 bg-indigo-50/50"><p className="text-sm text-indigo-800 font-bold mb-1">Ganancia Bruta</p><PriceDisplay amount={financialData.grossProfit} exchangeRate={exchangeRate} size="large" /><p className="text-xs text-indigo-400 mt-2">Ventas - Costo Insumos</p></GlassCard></div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-4">Flujo de Caja (Dinero Real)</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><GlassCard className="p-6 border-l-4 border-red-500"><div className="flex justify-between items-start"><div><p className="text-sm text-slate-500 font-bold mb-1">Gastos Totales (Salidas)</p><PriceDisplay amount={financialData.expenses} exchangeRate={exchangeRate} size="large" /><p className="text-xs text-slate-400 mt-2">Compras Inventario + Gastos Op.</p></div><GlassButton variant="expense" onClick={() => setShowExpenseForm(true)} className="text-xs py-1"><CreditCard size={14}/> Registrar Gasto</GlassButton></div></GlassCard><GlassCard className={`p-6 border-l-4 ${financialData.netCashFlow >= 0 ? 'border-teal-500' : 'border-rose-500'}`}><p className="text-sm text-slate-500 font-bold mb-1">Flujo Neto</p><PriceDisplay amount={financialData.netCashFlow} exchangeRate={exchangeRate} size="large" /><p className="text-xs text-slate-400 mt-2">Entradas - Salidas Reales</p></GlassCard></div><div className="h-64 md:h-80 w-full bg-white/50 rounded-2xl p-4 border border-white/40 mt-4"><h4 className="text-xs font-bold text-slate-400 mb-2">Comparativa Rentabilidad vs Flujo</h4><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:'Ventas', val:financialData.income, fill:'#10b981'}, {name:'Costo Venta', val:financialData.cogs, fill:'#f59e0b'},{name:'Ganancia', val:financialData.grossProfit, fill:'#4f46e5'},{name:'Gastos Reales', val:financialData.expenses, fill:'#ef4444'}]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="val" radius={[8,8,0,0]} barSize={50}/></BarChart></ResponsiveContainer></div></div>)}
        
        {/* --- REPORTES --- */}
        {activeTab === 'reports' && (<div className="max-w-7xl mx-auto space-y-6 fade-in mt-10 md:mt-0"><div className="flex justify-between items-center"><h2 className="text-2xl font-black">Reportes</h2></div><DateRangeToolbar startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onDownloadPdf={() => handleDownloadReport(filterAndSort(salesHistory, [], true))} title="Filtrar Gráficos" /><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><GlassCard className="p-6"><h3 className="font-bold mb-4 flex gap-2"><TrendingUp className="text-orange-500"/> Ventas (Filtrado)</h3><div className="h-60"><ResponsiveContainer width="100%" height="100%"><AreaChart data={filterAndSort(salesHistory, [], true).slice(0,7).map((s,i)=>({name: new Date(s.date).toLocaleDateString(undefined, {weekday:'short'}), total:s.total}))}><Area type="monotone" dataKey="total" stroke="#f97316" fill="#ffedd5" /></AreaChart></ResponsiveContainer></div></GlassCard><GlassCard className="p-6 flex flex-col justify-center items-center text-center"><Bot size={48} className="text-indigo-500 mb-4"/><h3 className="font-bold text-lg">Asistente Inteligente</h3><p className="text-slate-500 text-sm mb-4">Genera estrategias de venta o análisis de menú.</p><GlassButton variant="gemini" onClick={() => callGeminiAI("Dame 3 estrategias de marketing para hamburguesas", "Marketing AI")}>Consultar AI</GlassButton></GlassCard></div></div>)}

        {/* --- CONFIGURACIÓN --- */}
        {activeTab === 'settings' && (<div className="max-w-4xl mx-auto space-y-8 fade-in mt-10 md:mt-0 pb-10"><header className="flex items-center gap-4 bg-white/50 p-6 rounded-2xl border border-white/40 shadow-sm"><div className="p-3 bg-slate-200 rounded-xl"><Settings className="text-slate-700" size={32}/></div><div><h2 className="text-2xl font-black text-slate-800">Configuración Global</h2><p className="text-slate-500">Usuarios, Respaldos y Nube</p></div></header>

        {/* 1. SECCIÓN DE USUARIOS (ACTUALIZADA) */}<UserManagement appUsers={appUsers} onCreateUser={handleCreateUserSystem} onEditUser={handleEditUserSystem} onDeleteUser={handleDeleteUserSystem} currentUserId={user.uid} />
        
        {/* 2. GESTIÓN DE RESPALDOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><GlassCard className="p-6 space-y-4 border-l-4 border-blue-500"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Download size={24}/></div><h3 className="font-bold text-lg">Exportar Copia Local</h3></div><p className="text-sm text-slate-600">Descarga un archivo JSON con todos los datos actuales del negocio.</p><GlassButton onClick={handleExportData} variant="info" className="w-full">Descargar Respaldo</GlassButton></GlassCard><GlassCard className="p-6 space-y-4 border-l-4 border-rose-500"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-rose-100 rounded-lg text-rose-600"><Upload size={24}/></div><h3 className="font-bold text-lg">Restaurar Copia</h3></div><p className="text-sm text-slate-600">⚠ CUIDADO: Esto <b>BORRARÁ todos los datos actuales</b> antes de restaurar.</p><div className="relative"><input type="file" ref={fileInputRef} onClick={(e) => e.target.value = null} onChange={handleImportData} accept=".json" className="hidden" /><GlassButton onClick={() => fileInputRef.current.click()} variant="danger" disabled={isRestoring} className="w-full justify-center">{isRestoring ? <><Loader2 className="animate-spin" size={16}/> {restoreStatus}</> : "Seleccionar Archivo y Restaurar"}</GlassButton></div></GlassCard></div></div>)}
      </main>

      {/* --- MODALES --- */}
      {receiptModal.show && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"><GlassCard className="p-8 max-w-sm w-full text-center slide-up max-h-[90vh] overflow-y-auto"><div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500"><ShieldCheck size={32}/></div><h3 className="text-2xl font-black text-slate-800 mb-2">¡Venta Exitosa!</h3><div className="flex flex-col gap-3 mt-6"><GlassButton onClick={() => handleDownloadReceipt(receiptModal.sale)} variant="primary" className="w-full justify-center"><Receipt size={18}/> Descargar Recibo</GlassButton><GlassButton onClick={() => setReceiptModal({show: false, sale: null})} variant="secondary" className="w-full justify-center">Cerrar</GlassButton></div></GlassCard></div>)}
      {selectedSale && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh] slide-up"><div className="p-4 bg-slate-50 border-b flex justify-between items-center"><div><h3 className="font-bold text-lg">Detalle Venta</h3></div><button onClick={() => setSelectedSale(null)}><X size={20}/></button></div><div className="p-6 overflow-y-auto"><div className="mb-4"><span className="text-sm text-slate-500">Cliente:</span> <span className="font-bold">{selectedSale.description || "N/A"}</span></div><div className="space-y-2 mb-6">{selectedSale.items.map((item, idx) => (<div key={idx} className="flex justify-between text-sm py-2 border-b"><span>{item.qty}x {item.name}</span><span className="font-bold"><PriceDisplay amount={item.price * item.qty} exchangeRate={exchangeRate} align="right" size="small" /></span></div>))}</div><div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><label className="text-xs font-bold text-slate-500 uppercase">Observaciones</label><textarea className="w-full p-2 mt-2 text-sm border rounded-lg bg-white resize-none" rows="3" value={observationText} onChange={(e) => setObservationText(e.target.value)} placeholder="Añadir nota..."></textarea></div></div><div className="p-4 border-t flex justify-between gap-3 bg-white"><GlassButton variant="info" onClick={() => handleDownloadReceipt(selectedSale)}><Receipt size={16}/> Recibo</GlassButton><GlassButton onClick={() => { handleUpdateObservation(); setSelectedSale(null); }}>Guardar Nota</GlassButton></div></GlassCard></div>)}
      {showIngredientForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-md p-6 slide-up max-h-[90vh] overflow-y-auto"><h3 className="font-bold mb-4">{editingIngredient ? 'Editar' : 'Nuevo'} Insumo</h3><form onSubmit={handleSaveIngredient} className="space-y-3"><input name="name" required placeholder="Nombre" defaultValue={editingIngredient?.name} className="w-full p-3 md:p-2 border rounded-lg" /><div className="flex gap-2"><input name="stock" type="number" step="any" required placeholder="Stock" defaultValue={editingIngredient?.stock} className="w-1/2 p-3 md:p-2 border rounded-lg" /><input name="unit" required placeholder="Unidad" defaultValue={editingIngredient?.unit} className="w-1/2 p-3 md:p-2 border rounded-lg" /></div><input name="cost" type="number" step="0.01" required placeholder="Costo Unitario ($)" defaultValue={editingIngredient?.cost} className="w-full p-3 md:p-2 border rounded-lg" /><div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowIngredientForm(false)} className="flex-1 p-3 md:p-2 bg-slate-100 rounded-lg font-bold">Cancelar</button><button type="submit" className="flex-1 p-3 md:p-2 bg-orange-500 text-white rounded-lg font-bold">Guardar</button></div></form></GlassCard></div>)}
      {showProductForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto slide-up"><h3 className="font-bold mb-4">{editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}</h3><form onSubmit={handleSaveProduct} className="space-y-4"><input required name="name" defaultValue={editingProduct?.name} placeholder="Nombre" className="w-full p-3 md:p-2 border rounded-lg" /><div className="flex gap-2"><input required name="price" id="priceInput" type="number" step="0.01" defaultValue={editingProduct?.price} placeholder="Precio" className="w-1/2 p-3 md:p-2 border rounded-lg" /><input required name="image" defaultValue={editingProduct?.image} placeholder="Emoji" className="w-1/2 p-3 md:p-2 border rounded-lg" /></div><input required name="category" defaultValue={editingProduct?.category} placeholder="Categoría" className="w-full p-3 md:p-2 border rounded-lg" /><div className="p-4 bg-slate-50 rounded-xl"><label className="text-xs font-bold text-slate-500">Receta (Ingredientes)</label><div className="space-y-2 mt-2">{editingProduct?.recipe?.map((r, i) => <div key={i} className="flex justify-between text-sm bg-white p-2 rounded shadow-sm"><span>{ingredients.find(ing=>normalizeId(ing.id)===normalizeId(r.ingredientId))?.name || `ID:${r.ingredientId}`}</span><span className="font-bold">x{r.qty}</span><button type="button" onClick={()=>setEditingProduct(p=>({...p, recipe:p.recipe.filter(x=>x.ingredientId!==r.ingredientId)}))} className="text-red-500"><X size={14}/></button></div>)}</div>{/* --- SOLUCION xNaN: Inputs controlados por React State --- */}<div className="flex gap-2 mt-2"><select value={tempIngredientId} onChange={(e) => setTempIngredientId(e.target.value)} className="flex-1 p-3 md:p-2 border rounded outline-none focus:border-orange-500 bg-white"><option value="">Seleccionar Insumo...</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><input type="number" step="any" placeholder="Cant" value={tempIngredientQty} onChange={(e) => setTempIngredientQty(e.target.value)} className="w-20 p-3 md:p-2 border rounded outline-none focus:border-orange-500" /><button type="button" onClick={() => { if(tempIngredientId && tempIngredientQty && !isNaN(parseFloat(tempIngredientQty))) { setEditingProduct(p => ({ ...p, recipe: [...(p.recipe||[]), {ingredientId: tempIngredientId, qty: parseFloat(tempIngredientQty)}] })); setTempIngredientId(""); setTempIngredientQty(""); } }} className="bg-slate-800 text-white p-3 md:p-2 rounded hover:bg-slate-700"><Plus size={16}/></button></div>{/* --- CALCULADORA DE COSTOS RESTAURADA --- */}<div className="mt-4 pt-4 border-t border-slate-200"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-500">Costo Receta:</span><PriceDisplay amount={calculateRecipeCost(editingProduct?.recipe)} exchangeRate={exchangeRate} size="small" align="right" /></div><div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200"><Calculator size={16} className="text-indigo-500"/><div className="flex-1 flex items-center gap-2"><span className="text-xs text-slate-500">Margen %:</span><input type="number" value={profitMargin} onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)} className="w-16 p-1 bg-slate-100 rounded text-center text-sm" /></div><div className="text-right"><p className="text-[10px] text-slate-400">Sugerido</p><div className="font-bold text-indigo-600 text-sm">{formatCurrency(calculateRecipeCost(editingProduct?.recipe) * (1 + (profitMargin / 100)))}</div></div><button type="button" onClick={() => { const suggested = calculateRecipeCost(editingProduct?.recipe) * (1 + (profitMargin / 100)); const priceInput = document.getElementById('priceInput'); if(priceInput) priceInput.value = suggested.toFixed(2); }} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold hover:bg-indigo-200">Aplicar</button></div></div></div><div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowProductForm(false)} className="flex-1 p-3 md:p-2 bg-slate-100 rounded-lg font-bold">Cancelar</button><button type="submit" className="flex-1 p-3 md:p-2 bg-orange-500 text-white rounded-lg font-bold">Guardar</button></div></form></GlassCard></div>)}
      {showExpenseForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"><GlassCard className="w-full max-w-md p-6 slide-up max-h-[90vh] overflow-y-auto"><h3 className="font-bold mb-4 text-rose-600">Registrar Gasto Extra</h3><form onSubmit={handleSaveExpense} className="space-y-4"><input required name="description" placeholder="Descripción (ej. Luz, Alquiler)" className="w-full p-3 md:p-2 border rounded-lg" /><div className="flex gap-2"><input required name="amount" type="number" step="0.01" placeholder="Monto ($)" className="w-1/2 p-3 md:p-2 border rounded-lg" /><input required name="category" placeholder="Categoría" list="cats" className="w-1/2 p-3 md:p-2 border rounded-lg" /><datalist id="cats"><option value="Servicios"/><option value="Nómina"/><option value="Mantenimiento"/></datalist></div><div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowExpenseForm(false)} className="flex-1 p-3 md:p-2 bg-slate-100 rounded-lg font-bold">Cancelar</button><button type="submit" className="flex-1 p-3 md:p-2 bg-rose-500 text-white rounded-lg font-bold">Registrar</button></div></form></GlassCard></div>)}
      {confirmation.show && (<div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"><GlassCard className="p-6 max-w-sm w-full text-center slide-up"><AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" /><h3 className="font-bold text-lg mb-2">{confirmation.message}</h3><div className="flex gap-3 justify-center"><GlassButton variant="secondary" onClick={() => setConfirmation({ show: false })}>Cancelar</GlassButton><GlassButton variant="danger" onClick={confirmation.onConfirm}>Confirmar</GlassButton></div></GlassCard></div>)}
      {aiModal.show && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"><GlassCard className="w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[80vh] slide-up"><div className="p-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex justify-between items-center"><h3 className="font-bold flex items-center gap-2"><Sparkles size={18}/> {aiModal.title}</h3><button onClick={() => setAiModal(p => ({...p, show: false}))}><X className="text-white/80 hover:text-white"/></button></div><div className="p-6 overflow-y-auto bg-slate-50 flex-1">{aiModal.loading ? <div className="flex flex-col items-center justify-center py-10 space-y-4"><Loader2 size={40} className="animate-spin text-fuchsia-500" /><p className="text-slate-500 animate-pulse">Consultando a la IA...</p></div> : <div className="prose prose-slate max-w-none text-sm whitespace-pre-wrap">{String(aiModal.content)}</div>}</div>{!aiModal.loading && <div className="p-4 border-t border-slate-200 bg-white text-right"><GlassButton onClick={() => setAiModal(p => ({...p, show: false}))}>Entendido</GlassButton></div>}</GlassCard></div>)}
      {notification && (<div className={`fixed bottom-6 right-6 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-[70] ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{notification.type === 'error' ? <AlertCircle size={20}/> : <Info size={20}/>}<span className="font-bold">{notification.msg}</span></div>)}
    </div>
  );
}