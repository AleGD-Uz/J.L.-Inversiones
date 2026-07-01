import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    Search, Filter, Trash2, CheckCircle, AlertTriangle, 
    DollarSign, Eye, ShieldAlert, X, ClipboardList, SortAsc, SortDesc,
    CheckSquare, Square, Info
} from 'lucide-react';

export default function HistoryView({ 
    salesHistory, 
    ingredients, 
    products, 
    exchangeRate, 
    currencyMode, 
    startDate, 
    setStartDate, 
    endDate, 
    setEndDate,
    onViewSale, // Callback when Eye is clicked
    invalidateSale, // transactional function from hook
    currentUserData,
    showNotification,
    hasPermission // Passed from parent App.jsx
}) {
    const [activeFilter, setActiveFilter] = useState('Todos'); // 'Todos' | 'Normal' | 'Editada' | 'Precio Modificado' | 'Falta Vuelto' | 'Exceso Vuelto' | 'Anulada'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDesc, setSortDesc] = useState(true); // true = Recientes, false = Antiguos
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedSaleIds, setSelectedSaleIds] = useState([]);
    
    // Modal de anulación en lote
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchReason, setBatchReason] = useState('');
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);

    const filterRef = useRef(null);
    const [slideStyle, setSlideStyle] = useState({ left: 0, width: 0, color: '#64748b' });

    // Definición de filtros y colores
    const filterConfig = useMemo(() => [
        { name: 'Todos', color: '#64748b', class: 'text-slate-600 border-slate-300' },
        { name: 'Normal', color: '#10b981', class: 'text-emerald-600 border-emerald-300' },
        { name: 'Editada', color: '#f59e0b', class: 'text-amber-600 border-amber-300' },
        { name: 'Precio Modificado', color: '#3b82f6', class: 'text-blue-600 border-blue-300' },
        { name: 'Falta Vuelto', color: '#06b6d4', class: 'text-cyan-600 border-cyan-300' },
        { name: 'Exceso Vuelto', color: '#ec4899', class: 'text-pink-600 border-pink-300' },
        { name: 'Anulada', color: '#ef4444', class: 'text-red-600 border-red-300' }
    ], []);

    // Efecto para calcular el deslizador líquido
    useEffect(() => {
        const activeBtn = filterRef.current?.querySelector(`[data-filter="${activeFilter}"]`);
        if (activeBtn) {
            const currentConf = filterConfig.find(c => c.name === activeFilter);
            setSlideStyle({
                left: activeBtn.offsetLeft,
                width: activeBtn.offsetWidth,
                color: currentConf ? currentConf.color : '#64748b'
            });
        }
    }, [activeFilter, filterConfig]);

    // Formatear montos
    const formatPrice = (amount) => {
        const isVES = currencyMode === 'VES';
        if (isVES) {
            return `Bs ${(amount * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleString('es-VE', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
    };


    // Filtrar y ordenar
    const processedSales = useMemo(() => {
        return salesHistory.filter(sale => {
            // 1. Filtro por Fecha
            if (startDate) {
                const sDate = new Date(startDate + 'T00:00:00');
                const saleDate = new Date(sale.date);
                if (saleDate < sDate) return false;
            }
            if (endDate) {
                const eDate = new Date(endDate + 'T23:59:59');
                const saleDate = new Date(sale.date);
                if (saleDate > eDate) return false;
            }

            // 2. Filtro por Estado (Cápsulas)
            if (activeFilter !== 'Todos') {
                if (activeFilter === 'Normal') {
                    if (sale.isInvalidated || sale.isModifiedFromHistory || sale.isPriceModified || sale.changeStatus === 'shortage' || sale.changeStatus === 'excess') return false;
                }
                if (activeFilter === 'Editada' && !sale.isModifiedFromHistory) return false;
                if (activeFilter === 'Precio Modificado' && !sale.isPriceModified) return false;
                if (activeFilter === 'Falta Vuelto' && sale.changeStatus !== 'shortage') return false;
                if (activeFilter === 'Exceso Vuelto' && sale.changeStatus !== 'excess') return false;
                if (activeFilter === 'Anulada' && !sale.isInvalidated) return false;
            }

            // 3. Buscador Global
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase().trim();
                const client = (sale.description || '').toLowerCase();
                const saleIdShort = String(sale.id).slice(-6).toLowerCase();
                
                // Buscar referencias de pagos
                let references = [];
                if (sale.paymentData) {
                    if (sale.paymentData.reference) references.push(String(sale.paymentData.reference));
                    if (sale.paymentData.payments && Array.isArray(sale.paymentData.payments)) {
                        sale.paymentData.payments.forEach(p => {
                            if (p.reference) references.push(String(p.reference));
                        });
                    }
                }
                
                const matchesClient = client.includes(query);
                const matchesId = saleIdShort.includes(query);
                const matchesRef = references.some(ref => ref.toLowerCase().includes(query));

                if (!matchesClient && !matchesId && !matchesRef) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortDesc ? dateB - dateA : dateA - dateB;
        });
    }, [salesHistory, startDate, endDate, activeFilter, searchQuery, sortDesc]);

    // Alternar selección de una fila
    const handleSelectRow = (id, e) => {
        e.stopPropagation();
        setSelectedSaleIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Alternar selección de todas las filas filtradas
    const handleSelectAll = () => {
        const visibleIds = processedSales.filter(s => !s.isInvalidated).map(s => s.id);
        if (selectedSaleIds.length === visibleIds.length) {
            setSelectedSaleIds([]);
        } else {
            setSelectedSaleIds(visibleIds);
        }
    };

    // Ejecutar anulación en lote
    const handleExecuteBatchInvalidation = async () => {
        if (!batchReason || batchReason.trim() === '') {
            showNotification('Por favor, indica la razón de la anulación.', 'error');
            return;
        }
        setIsProcessingBatch(true);
        try {
            const userName = currentUserData?.name || currentUserData?.email || 'Admin';
            let successCount = 0;

            for (const saleId of selectedSaleIds) {
                const sale = salesHistory.find(s => s.id === saleId);
                if (sale && !sale.isInvalidated) {
                    await invalidateSale(saleId, sale.items, batchReason, userName);
                    successCount++;
                }
            }

            showNotification(`Se anularon ${successCount} ventas exitosamente.`, 'success');
            setSelectedSaleIds([]);
            setIsSelectionMode(false);
            setShowBatchModal(false);
            setBatchReason('');
        } catch (error) {
            console.error(error);
            showNotification(`Error en lote: ${error.message}`, 'error');
        } finally {
            setIsProcessingBatch(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabecera de la sección */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <ClipboardList className="text-teal-500" /> Historial de Ventas
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">Monitorea, audita y gestiona las transacciones del sistema.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {hasPermission('history', 'edit') && (
                        <button 
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedSaleIds([]);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                isSelectionMode 
                                    ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'
                            }`}
                        >
                            {isSelectionMode ? 'Cancelar Selección' : 'Seleccionar en Lote'}
                        </button>
                    )}
                    
                    <button 
                        onClick={() => setSortDesc(!sortDesc)}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 p-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 text-xs font-bold"
                        title={sortDesc ? "Orden: Recientes primero" : "Orden: Antiguos primero"}
                    >
                        {sortDesc ? <SortDesc size={16} /> : <SortAsc size={16} />}
                        <span className="hidden sm:inline">{sortDesc ? 'Recientes' : 'Antiguos'}</span>
                    </button>
                </div>
            </div>

            {/* Rango de Fechas (Toolbar Integrada en el diseño Glass) */}
            <div className="bg-white/40 backdrop-blur-md border border-white/50 p-4 rounded-3xl shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Fecha Inicio</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs text-slate-700"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Fecha Fin</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs text-slate-700"
                    />
                </div>
                <div className="space-y-1 sm:col-span-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Búsqueda Global</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente, ID o referencia de pago..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs text-slate-700 placeholder-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Cápsula Flotante de Filtros Rápidos (Deslizamiento Líquido) */}
            <div className="relative bg-slate-100 p-1.5 rounded-full flex gap-1 items-center overflow-x-auto custom-scrollbar shadow-inner" ref={filterRef}>
                {/* Deslizador Líquido */}
                <div 
                    className="absolute top-1.5 bottom-1.5 rounded-full transition-all duration-300 ease-out pointer-events-none"
                    style={{
                        left: `${slideStyle.left}px`,
                        width: `${slideStyle.width}px`,
                        backgroundColor: `${slideStyle.color}15`, // Opacidad 8%
                        border: `1.5px solid ${slideStyle.color}`,
                        boxShadow: `0 0 10px ${slideStyle.color}25`
                    }}
                />
                
                {filterConfig.map(f => (
                    <button
                        key={f.name}
                        data-filter={f.name}
                        data-active={activeFilter === f.name}
                        onClick={() => setActiveFilter(f.name)}
                        className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 whitespace-nowrap z-10 ${
                            activeFilter === f.name 
                                ? 'text-slate-800' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {f.name}
                    </button>
                ))}
            </div>

            {/* Tabla de Resultados (Glassmorphism) */}
            <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[750px]">
                        <thead className="bg-slate-50/70 text-slate-500 font-bold uppercase text-xs tracking-wider">
                            <tr>
                                {isSelectionMode && (
                                    <th className="p-4 w-12 text-center">
                                        <button 
                                            onClick={handleSelectAll}
                                            className="text-slate-500 hover:text-teal-600 transition-colors"
                                        >
                                            {selectedSaleIds.length === processedSales.filter(s => !s.isInvalidated).length && selectedSaleIds.length > 0
                                                ? <CheckSquare size={18} className="text-teal-600" />
                                                : <Square size={18} />
                                            }
                                        </button>
                                    </th>
                                )}
                                <th className="p-4">Fecha y Hora</th>
                                <th className="p-4">ID Venta</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4 text-center">Items</th>
                                <th className="p-4 text-center">Estados</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {processedSales.map(sale => {
                                const isChecked = selectedSaleIds.includes(sale.id);
                                const totalQty = (sale.items || []).reduce((a, b) => a + (b.qty || 0), 0);
                                
                                // Determinar estados activos para los pulsos
                                const activeStates = [];
                                if (sale.isInvalidated) {
                                    activeStates.push({ color: 'bg-red-500', name: 'Anulada' });
                                } else {
                                    if (sale.isModifiedFromHistory) {
                                        activeStates.push({ color: 'bg-amber-500', name: 'Editada' });
                                    }
                                    if (sale.isPriceModified) {
                                        activeStates.push({ color: 'bg-blue-500', name: 'Precio Modificado' });
                                    }
                                    if (sale.changeStatus === 'shortage') {
                                        activeStates.push({ color: 'bg-cyan-500', name: 'Falta Vuelto' });
                                    }
                                    if (sale.changeStatus === 'excess') {
                                        activeStates.push({ color: 'bg-pink-500', name: 'Exceso Vuelto' });
                                    }
                                    if (activeStates.length === 0) {
                                        activeStates.push({ color: 'bg-emerald-500', name: 'Normal' });
                                    }
                                }

                                return (
                                    <tr 
                                        key={sale.id} 
                                        onClick={(e) => {
                                            if (isSelectionMode && !sale.isInvalidated) {
                                                handleSelectRow(sale.id, e);
                                            } else {
                                                onViewSale(sale);
                                            }
                                        }}
                                        className={`hover:bg-white/40 transition-colors cursor-pointer ${
                                            sale.isInvalidated ? 'opacity-60 bg-red-50/10' : ''
                                        } ${isChecked ? 'bg-teal-50/20' : ''}`}
                                    >
                                        {isSelectionMode && (
                                            <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                                                {!sale.isInvalidated ? (
                                                    <button 
                                                        onClick={(e) => handleSelectRow(sale.id, e)}
                                                        className="text-slate-500 hover:text-teal-600 transition-colors"
                                                    >
                                                        {isChecked ? <CheckSquare size={18} className="text-teal-600" /> : <Square size={18} />}
                                                    </button>
                                                ) : (
                                                    <div className="w-5 h-5 mx-auto" />
                                                )}
                                            </td>
                                        )}
                                        <td className="p-4 font-medium text-slate-700 whitespace-nowrap">
                                            {formatDate(sale.date)}
                                        </td>
                                        <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                                            #{String(sale.id).slice(-6).toUpperCase()}
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            {sale.description || "Cliente General"}
                                        </td>
                                        <td className="p-4 text-center font-semibold text-slate-600">
                                            {totalQty}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center items-center gap-1.5">
                                                {activeStates.map((st, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="relative w-2.5 h-2.5 rounded-full flex items-center justify-center" 
                                                        title={st.name}
                                                    >
                                                        <span className={`absolute inline-flex h-full w-full rounded-full ${st.color} opacity-75 animate-ping`} />
                                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${st.color}`} />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-black text-slate-800 whitespace-nowrap">
                                            <div className="flex flex-col items-end">
                                                <span>{formatPrice(sale.total)}</span>
                                                {sale.discountAmount > 0 && (
                                                    <span className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-md font-bold mt-0.5">
                                                        Desc: -{formatPrice(sale.discountAmount)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                                            <button 
                                                onClick={() => onViewSale(sale)}
                                                className="p-2 border border-slate-200/60 bg-white hover:bg-slate-50 hover:border-teal-400 hover:text-teal-600 transition-all rounded-xl shadow-sm active:scale-95"
                                                title="Detalle de Auditoría"
                                            >
                                                <Eye size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {processedSales.length === 0 && (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                            <Info size={36} className="text-slate-300" />
                            <p className="text-sm italic">No se encontraron ventas con los filtros actuales.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Banner Flotante Inferior de Selección Múltiple */}
            {isSelectionMode && selectedSaleIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[90%] max-w-xl animate-bounce">
                    <div className="bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-500 text-slate-900 rounded-lg flex items-center justify-center font-bold text-sm">
                                {selectedSaleIds.length}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold">Ventas seleccionadas</h4>
                                <p className="text-[10px] text-slate-400">Listas para invalidación masiva</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSelectedSaleIds([])}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Limpiar
                            </button>
                            <button 
                                onClick={() => setShowBatchModal(true)}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/30"
                            >
                                <Trash2 size={14} /> Anular en Lote
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Invalidación en Lote */}
            {showBatchModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3rem max-w-md w-full shadow-2xl slide-up">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                            <ShieldAlert size={24} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-2">Anulación en Lote</h3>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Estás a punto de anular <strong className="text-red-500">{selectedSaleIds.length}</strong> ventas seleccionadas. Esta acción devolverá los ingredientes al inventario y revertirá la popularidad.
                        </p>

                        <div className="space-y-1.5 text-left mb-6">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Motivo de Anulación Unificado</label>
                            <textarea 
                                rows="3" 
                                required
                                value={batchReason}
                                onChange={(e) => setBatchReason(e.target.value)}
                                placeholder="Indica el motivo (Ej: Error de digitación, cancelación de pedido, etc.)..."
                                className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 outline-none text-xs resize-none bg-white"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    setShowBatchModal(false);
                                    setBatchReason('');
                                }}
                                disabled={isProcessingBatch}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-600 transition-colors bg-white disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleExecuteBatchInvalidation}
                                disabled={isProcessingBatch || !batchReason.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {isProcessingBatch ? (
                                    <>Procesando...</>
                                ) : (
                                    <>Confirmar Anulación</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
