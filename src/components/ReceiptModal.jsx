import React, { useState, useMemo, useEffect } from 'react';
import { 
    X, Edit, Save, ArrowLeft, Download, Printer, Plus, Minus, Trash2, 
    ChevronDown, ChevronUp, AlertCircle, CheckCircle, RefreshCw, HelpCircle,
    User, DollarSign, Wallet, CreditCard, Receipt, FileText, ChevronRight,
    Gift
} from 'lucide-react';

// Carga dinámica de html2canvas para mantener soporte offline
const loadHtml2Canvas = async () => {
    if (window.html2canvas) return window.html2canvas;
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = () => resolve(window.html2canvas);
        document.head.appendChild(script);
    });
};

export default function ReceiptModal({
    sale,
    onClose,
    exchangeRate,
    currencyMode,
    products,
    invalidateSale,
    updateCompletedSale, // transactional function from hook
    saveToDB, // to save notes independently
    logActivity,
    currentUserData,
    showNotification,
    hasPermission
}) {
    const [isEditing, setIsEditing] = useState(false);
    
    // Estados para anulación de venta individual
    const [showInvalidateConfirm, setShowInvalidateConfirm] = useState(false);
    const [invalidateReason, setInvalidateReason] = useState('');
    const [isInvalidating, setIsInvalidating] = useState(false);
    
    // Estados para edición
    const [editCart, setEditCart] = useState([]);
    const [editTotal, setEditTotal] = useState(0);
    const [isTotalManual, setIsTotalManual] = useState(false);
    const [editDescription, setEditDescription] = useState('Cliente General');
    const [editObservation, setEditObservation] = useState('');
    const [editPaymentMethod, setEditPaymentMethod] = useState('efectivo');
    const [editDiscountType, setEditDiscountType] = useState('percent'); // 'percent' | 'fixed'
    const [editDiscountValue, setEditDiscountValue] = useState(0);
    
    // Desglose de pagos
    const [cashReceived, setCashReceived] = useState(0); // en USD
    const [cashChangeDelivered, setCashChangeDelivered] = useState(0); // en USD
    const [pmReceived, setPmReceived] = useState(0);
    const [pmReference, setPmReference] = useState('');
    const [posReceived, setPosReceived] = useState(0);
    const [posReference, setPosReference] = useState('');
    
    // Estado para guardar nota rápidamente en modo lectura
    const [quickObservation, setQuickObservation] = useState('');
    const [isSavingQuickObs, setIsSavingQuickObs] = useState(false);

    // Estado para buscador de productos en edición
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    // Acordeón de historial de modificaciones
    const [expandedHistoryIndex, setExpandedHistoryIndex] = useState(null);

    // Cargar datos iniciales
    useEffect(() => {
        if (sale) {
            setEditCart(sale.items.map(item => ({ ...item })));
            setEditTotal(sale.total);
            setEditDescription(sale.description || 'Cliente General');
            setEditObservation(sale.observation || '');
            setQuickObservation(sale.observation || '');
            setEditPaymentMethod(sale.paymentMethod || 'efectivo');
            // Cargar descuentos
            setEditDiscountType(sale.discountType || 'percent');
            setEditDiscountValue(sale.discountValue || 0);

            // Determinar si el precio neto fue modificado
            const baseSum = sale.items.reduce((s, i) => s + (i.price * i.qty), 0);
            setIsTotalManual(Math.abs(sale.total - baseSum) > 0.01);

            // Cargar desglose de pagos
            const payData = sale.paymentData || {};
            setCashReceived(payData.cashReceived || 0);
            setCashChangeDelivered(payData.cashChangeDelivered || 0);
            setPmReceived(payData.pmReceived || 0);
            setPmReference(payData.pmReference || '');
            setPosReceived(payData.posReceived || 0);
            setPosReference(payData.posReference || '');
        }
    }, [sale]);

    // Comprobar si el usuario tiene permisos de edición
    const hasEditPermission = useMemo(() => {
        if (hasPermission) {
            return hasPermission('history', 'edit');
        }
        if (!currentUserData) return false;
        if (currentUserData.role === 'Gerente') return true;
        return !!(currentUserData.permissions && currentUserData.permissions.history && currentUserData.permissions.history.edit);
    }, [currentUserData, hasPermission]);

    // Formatear montos
    const formatPrice = (amount) => {
        const isVES = currencyMode === 'VES';
        if (isVES) {
            return `Bs ${(amount * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Calcular subtotal de edición
    const editSubtotal = useMemo(() => {
        return editCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }, [editCart]);

    // Calcular descuento de edición
    const editDiscountAmount = useMemo(() => {
        if (editDiscountType === 'percent') {
            return (editSubtotal * editDiscountValue) / 100;
        }
        return Math.min(editSubtotal, editDiscountValue);
    }, [editSubtotal, editDiscountType, editDiscountValue]);

    // Calcular el total del carrito de forma automática (restando descuento)
    const cartAutoTotal = useMemo(() => {
        return Math.max(0, editSubtotal - editDiscountAmount);
    }, [editSubtotal, editDiscountAmount]);

    // Sincronizar total automático
    useEffect(() => {
        if (!isTotalManual) {
            setEditTotal(cartAutoTotal);
        }
    }, [cartAutoTotal, isTotalManual]);

    // Filtrar productos para añadir
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        return products.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.category.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 5);
    }, [productSearch, products]);

    // Añadir producto al carrito de edición
    const handleAddProduct = (prod) => {
        setEditCart(prev => {
            const existing = prev.find(item => item.id === prod.id);
            if (existing) {
                return prev.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, {
                id: prod.id,
                name: prod.name,
                price: prod.price,
                qty: 1,
                recipe: prod.recipe || []
            }];
        });
        setProductSearch('');
        setShowProductDropdown(false);
    };

    // Modificar cantidad de item
    const handleUpdateQty = (itemId, delta) => {
        setEditCart(prev => prev.map(item => {
            if (item.id === itemId) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    // Modificar precio unitario
    const handleUpdateUnitPrice = (itemId, priceVal) => {
        const val = parseFloat(priceVal) || 0;
        setEditCart(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, price: val };
            }
            return item;
        }));
    };

    // Convertir o quitar regalo de un ítem en el carrito de edición
    const toggleEditCartItemGift = (itemId) => {
        setEditCart(prev => {
            const itemIndex = prev.findIndex(i => i.id === itemId);
            if (itemIndex === -1) return prev;
            const item = prev[itemIndex];
            
            if (item.isGift) {
                const originalId = itemId.replace('-gift', '');
                const normalItemIndex = prev.findIndex(i => i.id === originalId);
                
                if (normalItemIndex !== -1) {
                    const updated = [...prev];
                    updated[normalItemIndex].qty += item.qty;
                    return updated.filter(i => i.id !== itemId);
                } else {
                    return prev.map(i => i.id === itemId ? { 
                        ...i, 
                        id: originalId, 
                        price: i.originalPrice || i.price, 
                        isGift: false 
                    } : i);
                }
            } else {
                if (item.qty > 1) {
                    const updated = [...prev];
                    updated[itemIndex].qty -= 1;
                    
                    const giftId = `${item.id}-gift`;
                    const existingGiftIndex = prev.findIndex(i => i.id === giftId);
                    
                    if (existingGiftIndex !== -1) {
                        updated[existingGiftIndex].qty += 1;
                    } else {
                        updated.push({
                            ...item,
                            id: giftId,
                            qty: 1,
                            price: 0,
                            originalPrice: item.price,
                            isGift: true
                        });
                    }
                    return updated;
                } else {
                    return prev.map(i => i.id === itemId ? {
                        ...i,
                        id: `${item.id}-gift`,
                        price: 0,
                        originalPrice: i.price,
                        isGift: true
                    } : i);
                }
            }
        });
    };

    // Eliminar item
    const handleRemoveItem = (itemId) => {
        setEditCart(prev => prev.filter(item => item.id !== itemId));
    };

    // Guardar nota rápidamente en modo lectura
    const handleSaveQuickObservation = async () => {
        if (!sale) return;
        setIsSavingQuickObs(true);
        try {
            const updatedSale = { ...sale, observation: quickObservation };
            await saveToDB('sales', updatedSale, sale.id);
            if (logActivity) {
                await logActivity('Venta', `Observación editada en venta #${sale.id.slice(-6)} por nota rápida.`);
            }
            showNotification('Observación actualizada correctamente.', 'success');
            sale.observation = quickObservation; // Actualizar localmente
        } catch (error) {
            console.error(error);
            showNotification('Error al guardar la observación.', 'error');
        } finally {
            setIsSavingQuickObs(false);
        }
    };

    // Anular venta individual
    const handleInvalidateSingle = async () => {
        if (!invalidateReason.trim()) {
            showNotification('Debe ingresar un motivo para la anulación.', 'error');
            return;
        }
        setIsInvalidating(true);
        try {
            const userName = currentUserData?.name || currentUserData?.email || 'Admin';
            await invalidateSale(sale.id, sale.items, invalidateReason, userName);
            showNotification('Venta anulada con éxito.', 'success');
            setShowInvalidateConfirm(false);
            setInvalidateReason('');
            onClose(); // Cerrar el modal tras anulación
        } catch (error) {
            console.error(error);
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setIsInvalidating(false);
        }
    };

    // Guardar edición en caliente
    const handleSaveHotEdit = async () => {
        if (editCart.length === 0) {
            showNotification('El carrito no puede estar vacío.', 'error');
            return;
        }

        // Validar desglose de pagos mixtos o individuales
        let paymentData = {};
        if (editPaymentMethod === 'efectivo') {
            paymentData = { cashReceived, cashChangeDelivered };
        } else if (editPaymentMethod === 'pago_movil') {
            paymentData = { pmReceived: editTotal, pmReference };
        } else if (editPaymentMethod === 'punto_de_venta') {
            paymentData = { posReceived: editTotal, posReference };
        } else if (editPaymentMethod === 'mixto') {
            paymentData = {
                cashReceived,
                cashChangeDelivered,
                pmReceived,
                pmReference,
                posReceived,
                posReference
            };
        }

        // Calcular estado de vuelto
        const totalReceived = 
            (editPaymentMethod === 'efectivo' || editPaymentMethod === 'mixto' ? Number(cashReceived) : 0) +
            (editPaymentMethod === 'pago_movil' || editPaymentMethod === 'mixto' ? Number(pmReceived) : 0) +
            (editPaymentMethod === 'punto_de_venta' || editPaymentMethod === 'mixto' ? Number(posReceived) : 0);

        let changeStatus = 'exact';
        if (editPaymentMethod === 'efectivo' || editPaymentMethod === 'mixto') {
            const expectedChange = Math.max(0, totalReceived - editTotal);
            const delivered = Number(cashChangeDelivered);
            if (Math.abs(delivered - expectedChange) < 0.01) {
                changeStatus = 'exact';
            } else if (delivered < expectedChange) {
                changeStatus = 'shortage'; // Falta entregar vuelto
            } else {
                changeStatus = 'excess'; // Exceso de vuelto entregado
            }
        }

        try {
            const userName = currentUserData?.name || currentUserData?.email || 'Admin';
            await updateCompletedSale(
                sale, 
                editCart, 
                editTotal, 
                editDescription, 
                {
                    paymentMethod: editPaymentMethod,
                    paymentData,
                    observation: editObservation,
                    userName,
                    changeStatus,
                    subtotal: editSubtotal,
                    discountType: editDiscountType,
                    discountValue: Number(editDiscountValue) || 0,
                    discountAmount: editDiscountAmount
                }
            );

            showNotification('Venta editada y auditoría registrada con éxito.', 'success');
            setIsEditing(false);
            onClose(); // Cerrar para refrescar
        } catch (error) {
            console.error(error);
            showNotification(`Error en edición: ${error.message}`, 'error');
        }
    };

    // Descargar como imagen
    const handleDownloadAsImage = async () => {
        const element = document.getElementById('receipt-ticket');
        if (!element) return;
        try {
            showNotification('Generando imagen de recibo...', 'info');
            const html2canvas = await loadHtml2Canvas();
            const canvas = await html2canvas(element, { 
                backgroundColor: null, // Fondo transparente para respetar glassmorphism o forzar blanco
                scale: 2, 
                useCORS: true 
            });
            const link = document.createElement('a');
            link.download = `Recibo_${sale.id.slice(-6).toUpperCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showNotification('Imagen descargada.', 'success');
        } catch (error) {
            console.error("Error al capturar recibo:", error);
            showNotification('Error al exportar recibo como imagen.', 'error');
        }
    };

    // Imprimir recibo
    const handlePrintReceipt = () => {
        const element = document.getElementById('receipt-ticket-printable');
        if (!element) return;
        
        const printWindow = window.open('', '_blank');
        const itemsHtml = sale.items.map(item => `
            <tr>
                <td style="padding: 4px 0;">${item.qty}x ${item.name}</td>
                <td style="padding: 4px 0; text-align: right;">${formatPrice(item.price * item.qty)}</td>
            </tr>
        `).join('');

        const isVES = currencyMode === 'VES';
        const formatVal = (val) => isVES ? `Bs ${(val * exchangeRate).toFixed(2)}` : `$${val.toFixed(2)}`;

        const changeAnalysis = () => {
            const payData = sale.paymentData || {};
            const received = (payData.cashReceived || 0) + (payData.pmReceived || 0) + (payData.posReceived || 0);
            const changeExpected = Math.max(0, received - sale.total);
            const changeReal = payData.cashChangeDelivered || 0;
            return `
                <div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px; font-size: 11px;">
                    <div>Recibido: ${formatVal(received)}</div>
                    <div>Cambio Esperado: ${formatVal(changeExpected)}</div>
                    <div>Cambio Entregado: ${formatVal(changeReal)}</div>
                </div>
            `;
        };

        printWindow.document.write(`
            <html>
                <head>
                    <title>Recibo POS #${sale.id.slice(-6).toUpperCase()}</title>
                    <style>
                        body { 
                            font-family: 'Courier New', Courier, monospace; 
                            font-size: 12px; 
                            line-height: 1.4;
                            max-width: 280px; 
                            margin: 0 auto; 
                            padding: 10px; 
                            color: #000;
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .divider { border-top: 1px dashed #000; margin: 8px 0; }
                        table { width: 100%; border-collapse: collapse; }
                        th { border-bottom: 1px dashed #000; padding-bottom: 4px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="text-center font-bold" style="font-size: 14px;">Sweet Ink / Divine'Snacks</div>
                    <div class="text-center" style="font-size: 10px; margin-top: 2px;">Sistema POS y Auditoría</div>
                    <div class="divider"></div>
                    <div>Fecha: ${new Date(sale.date).toLocaleString('es-VE')}</div>
                    <div>Cliente: ${sale.description || 'Cliente General'}</div>
                    <div>Venta ID: #${sale.id.toUpperCase()}</div>
                    <div class="divider"></div>
                    <table>
                        <thead>
                            <tr>
                                <th class="text-left">Item</th>
                                <th class="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <div class="divider"></div>
                    ${sale.discountAmount > 0 ? `
                        <div style="font-size: 11px; text-align: right; margin-bottom: 3px;">Subtotal: ${formatPrice(sale.subtotal || (sale.total + sale.discountAmount))}</div>
                        <div style="font-size: 11px; text-align: right; margin-bottom: 3px; color: #555;">Descuento (${sale.discountType === 'percent' ? `${sale.discountValue}%` : 'Fijo'}): -${formatPrice(sale.discountAmount)}</div>
                    ` : ''}
                    <div class="font-bold text-right" style="font-size: 13px;">TOTAL: ${formatPrice(sale.total)}</div>
                    <div>Método Pago: ${String(sale.paymentMethod).toUpperCase()}</div>
                    ${sale.paymentMethod === 'efectivo' || sale.paymentMethod === 'mixto' ? changeAnalysis() : ''}
                    ${sale.observation ? `<div style="font-size: 10px; margin-top: 8px; font-style: italic;">Notas: ${sale.observation}</div>` : ''}
                    <div class="divider"></div>
                    <div class="text-center" style="font-size: 9px; margin-top: 10px;">¡Gracias por su compra!</div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Helper de cálculo de vuelto
    const changeCalculation = useMemo(() => {
        const received = 
            (editPaymentMethod === 'efectivo' || editPaymentMethod === 'mixto' ? Number(cashReceived) : 0) +
            (editPaymentMethod === 'pago_movil' || editPaymentMethod === 'mixto' ? Number(pmReceived) : 0) +
            (editPaymentMethod === 'punto_de_venta' || editPaymentMethod === 'mixto' ? Number(posReceived) : 0);
        
        const expectedChange = Math.max(0, received - editTotal);
        const difference = Number(cashChangeDelivered) - expectedChange;
        
        return {
            totalReceived: received,
            expectedChange,
            difference,
            status: Math.abs(difference) < 0.01 
                ? 'exact' 
                : difference < 0 ? 'shortage' : 'excess'
        };
    }, [editPaymentMethod, cashReceived, pmReceived, posReceived, cashChangeDelivered, editTotal]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            {/* Contenedor principal: Bottom Sheet en móvil, Modal en Desktop */}
            <div className="w-full sm:max-w-xl bg-white/80 backdrop-blur-2xl rounded-t-[2.5rem] sm:rounded-[3rem] border-t sm:border border-white/60 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden transition-all duration-300 slide-up">
                
                {/* Cabecera del Modal */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        ) : (
                            <div className="p-2 bg-teal-100/50 rounded-xl text-teal-600">
                                <Receipt size={20} />
                            </div>
                        )}
                        <div>
                            <h3 className="font-black text-slate-800 text-base md:text-lg">
                                {isEditing ? 'Editar Venta' : 'Recibo de Auditoría'}
                            </h3>
                            <p className="text-[10px] font-mono text-slate-400">
                                #{sale.id.slice(-8).toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cuerpo deslizable */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

                    {/* ALERTA: Venta Anulada (En Modo Lectura) */}
                    {!isEditing && sale.isInvalidated && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex flex-col gap-1.5 shadow-sm">
                            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                                <AlertCircle size={14} className="text-red-500 shrink-0" /> Venta Anulada
                            </div>
                            <p className="text-slate-600">
                                <strong>Motivo:</strong> {sale.invalidationReason || "No especificado"}
                            </p>
                            {sale.invalidatedBy && (
                                <p className="text-[10px] text-slate-400 italic">
                                    Anulado por {sale.invalidatedBy} el {sale.invalidatedAt ? new Date(sale.invalidatedAt).toLocaleString('es-VE') : ''}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ALERTA: Venta Editada (En Modo Lectura) */}
                    {!isEditing && sale.isModifiedFromHistory && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex flex-col gap-1 shadow-sm">
                            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                                <RefreshCw size={14} className="text-amber-500 shrink-0" /> Registro Modificado
                            </div>
                            <p className="text-slate-600">
                                Esta venta contiene cambios de inventario o precios históricos.
                            </p>
                            {sale.modifiedBy && (
                                <p className="text-[10px] text-slate-400 italic">
                                    Última modificación por {sale.modifiedBy} el {sale.modifiedAt ? new Date(sale.modifiedAt).toLocaleString('es-VE') : ''}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ==================== MODO LECTURA (AUDITORÍA) ==================== */}
                    {!isEditing ? (
                        <div className="space-y-6">
                            {/* Renderizado Estético del Ticket */}
                            <div 
                                id="receipt-ticket" 
                                className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-md flex flex-col gap-4 text-slate-700 border-t-8 border-t-teal-500"
                            >
                                <div className="text-center pb-3 border-b border-slate-100">
                                    <h4 className="font-black text-slate-800 text-base">Sweet Ink</h4>
                                    <p className="text-[10px] text-slate-400">Divine'Snacks POS & Inventory</p>
                                </div>

                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Cliente:</span>
                                        <span className="font-bold text-slate-800">{sale.description || "Cliente General"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Fecha exacta:</span>
                                        <span>{new Date(sale.date).toLocaleString('es-VE')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Método de Pago:</span>
                                        <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">
                                            {sale.paymentMethod || "Efectivo"}
                                        </span>
                                    </div>
                                </div>

                                {/* Desglose detallado de pagos si es mixto o individual */}
                                {sale.paymentData && (
                                    <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-2 border border-slate-100">
                                        <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Desglose de Pago</h5>
                                        {sale.paymentMethod === 'mixto' ? (
                                            <div className="space-y-1.5">
                                                {Number(sale.paymentData.cashReceived) > 0 && (
                                                    <div className="flex justify-between font-mono">
                                                        <span>Efectivo Recibido:</span>
                                                        <span>{formatPrice(sale.paymentData.cashReceived)}</span>
                                                    </div>
                                                )}
                                                {Number(sale.paymentData.pmReceived) > 0 && (
                                                    <div className="flex justify-between font-mono">
                                                        <span>Pago Móvil:</span>
                                                        <span>{formatPrice(sale.paymentData.pmReceived)} {sale.paymentData.pmReference ? `(Ref: ${sale.paymentData.pmReference})` : ''}</span>
                                                    </div>
                                                )}
                                                {Number(sale.paymentData.posReceived) > 0 && (
                                                    <div className="flex justify-between font-mono">
                                                        <span>Punto de Venta:</span>
                                                        <span>{formatPrice(sale.paymentData.posReceived)} {sale.paymentData.posReference ? `(Ref: ${sale.paymentData.posReference})` : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {sale.paymentMethod === 'efectivo' && (
                                                    <div className="flex justify-between font-mono">
                                                        <span>Efectivo Recibido:</span>
                                                        <span>{formatPrice(sale.paymentData.cashReceived || 0)}</span>
                                                    </div>
                                                )}
                                                {sale.paymentMethod === 'pago_movil' && (
                                                    <div className="flex justify-between font-mono">
                                                        <span>Referencia:</span>
                                                        <span>{sale.paymentData.pmReference || sale.paymentData.reference || 'N/A'}</span>
                                                    </div>
                                                )}
                                                {sale.paymentMethod === 'punto_de_venta' && (
                                                    <div className="flex justify-between font-mono">
                                                        <span>Referencia:</span>
                                                        <span>{sale.paymentData.posReference || sale.paymentData.reference || 'N/A'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Items de la Venta */}
                                <div className="space-y-3 py-3 border-t border-b border-slate-100">
                                    {(sale.items || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-xs">
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                                    {item.qty}x {item.name}
                                                    {item.isGift && (
                                                        <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                                                            <Gift size={8} /> Regalo
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-slate-400">CU: {formatPrice(item.price)}</span>
                                            </div>
                                            <span className="font-mono font-bold text-slate-800">{formatPrice(item.price * item.qty)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Vueltos / Diferencias de Cambio */}
                                {(sale.paymentMethod === 'efectivo' || sale.paymentMethod === 'mixto') && sale.paymentData && (
                                    <div className="bg-teal-50/50 border border-teal-100 p-3.5 rounded-2xl text-xs space-y-1.5">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Vuelto Esperado:</span>
                                            <span className="font-mono">{formatPrice(Math.max(0, (
                                                (Number(sale.paymentData.cashReceived || 0) + 
                                                 Number(sale.paymentData.pmReceived || 0) + 
                                                 Number(sale.paymentData.posReceived || 0)) - sale.total
                                            )))}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Vuelto Entregado:</span>
                                            <span className="font-mono font-bold">{formatPrice(sale.paymentData.cashChangeDelivered || 0)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-teal-200/50">
                                            <span>Estado del Vuelto:</span>
                                            <span className={`font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full ${
                                                sale.changeStatus === 'shortage' 
                                                    ? 'bg-cyan-100 text-cyan-700' 
                                                    : sale.changeStatus === 'excess' 
                                                    ? 'bg-pink-100 text-pink-700' 
                                                    : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {sale.changeStatus === 'shortage' 
                                                    ? 'Falta Vuelto' 
                                                    : sale.changeStatus === 'excess' 
                                                    ? 'Exceso Vuelto' 
                                                    : 'Exacto'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* SUB-RESUMEN DE DESCUENTOS EN RECIBO */}
                                {sale.discountAmount > 0 && (
                                    <div className="space-y-1.5 py-2 border-b border-slate-100/60 text-xs text-slate-500 font-bold">
                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>Subtotal de Artículos:</span>
                                            <span className="font-mono">{formatPrice(sale.subtotal || (sale.total + sale.discountAmount))}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-rose-600 font-bold">
                                            <span>Descuento ({sale.discountType === 'percent' ? `${sale.discountValue}%` : 'Fijo'}):</span>
                                            <span className="font-mono">- {formatPrice(sale.discountAmount)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* TOTAL */}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-black text-slate-800 text-sm uppercase">Total Cobrado</span>
                                    <div className="text-right">
                                        <div className="font-black text-xl text-teal-600">{formatPrice(sale.total)}</div>
                                        {sale.isPriceModified && (
                                            <span className="text-[9px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                                                Precio Ajustado Manualmente
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Guardado rápido de observaciones/nota */}
                            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-3xl space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Observación Interna (Notas)</label>
                                <div className="flex gap-2">
                                    <textarea
                                        rows="2"
                                        placeholder="Añadir nota rápida..."
                                        value={quickObservation}
                                        onChange={(e) => setQuickObservation(e.target.value)}
                                        className="flex-1 p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500 bg-white resize-none"
                                    />
                                    <button
                                        onClick={handleSaveQuickObservation}
                                        disabled={isSavingQuickObs}
                                        className="bg-teal-600 hover:bg-teal-500 text-white px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                                        title="Guardar Nota Rápida"
                                    >
                                        <Save size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Acordeón de Historial de Modificaciones (Modification History) */}
                            {sale.modificationHistory && sale.modificationHistory.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Historial de Cambios ({sale.modificationHistory.length})</h4>
                                    <div className="space-y-2">
                                        {sale.modificationHistory.map((mod, idx) => {
                                            const isExpanded = expandedHistoryIndex === idx;
                                            return (
                                                <div key={idx} className="bg-white/40 border border-white/60 rounded-2xl overflow-hidden shadow-sm">
                                                    <button 
                                                        onClick={() => setExpandedHistoryIndex(isExpanded ? null : idx)}
                                                        className="w-full p-3 flex justify-between items-center text-xs text-left"
                                                    >
                                                        <div>
                                                            <span className="font-bold text-slate-700">{mod.user}</span>
                                                            <span className="text-[10px] text-slate-400 ml-2">{new Date(mod.timestamp).toLocaleString('es-VE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                                                mod.type === 'price_and_items' 
                                                                    ? 'bg-blue-100 text-blue-700' 
                                                                    : mod.type === 'payment_data_only' 
                                                                    ? 'bg-purple-100 text-purple-700' 
                                                                    : 'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                                {mod.type === 'price_and_items' ? 'Precio e Ítems' : mod.type === 'payment_data_only' ? 'Pago' : 'Ítems'}
                                                            </span>
                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </div>
                                                    </button>
                                                    
                                                    {isExpanded && (
                                                        <div className="p-3 border-t border-slate-100 bg-white/60 text-xs space-y-2 font-mono">
                                                            <div className="flex justify-between">
                                                                <span>Total previo:</span>
                                                                <span className="line-through text-red-500">${mod.previousTotal.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between font-bold">
                                                                <span>Total nuevo:</span>
                                                                <span className="text-emerald-600">${mod.newTotal.toFixed(2)}</span>
                                                            </div>
                                                            {mod.newItems && (
                                                                <div className="pt-2 border-t border-dashed">
                                                                    <span className="font-bold block text-[9px] uppercase text-slate-400 mb-1">Items Nuevos:</span>
                                                                    {mod.newItems.map((item, i) => (
                                                                        <div key={i} className="flex justify-between text-[10px]">
                                                                            <span className="flex items-center gap-1">
                                                                                {item.qty}x {item.name}
                                                                                {item.isGift && <span className="bg-rose-100 text-rose-700 text-[7px] font-black px-1 rounded-sm uppercase tracking-wider flex items-center gap-0.5"><Gift size={7} /> Regalo</span>}
                                                                            </span>
                                                                            <span>CU: ${item.price.toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Acciones de Auditoría */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDownloadAsImage}
                                    className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-600"
                                >
                                    <Download size={16} /> Capturar PNG
                                </button>
                                <button
                                    onClick={handlePrintReceipt}
                                    className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-600"
                                >
                                    <Printer size={16} /> Imprimir Recibo
                                </button>
                            </div>

                            <div className="flex flex-col gap-2 mt-3">
                                {/* Botón Habilitador de Edición */}
                                {hasEditPermission && !sale.isInvalidated && (
                                    <button
                                        onClick={() => {
                                            setIsEditing(true);
                                            // Cargar estados con la venta limpia
                                            setEditCart(sale.items.map(item => ({ ...item })));
                                            setEditTotal(sale.total);
                                            setEditDescription(sale.description || 'Cliente General');
                                            setEditObservation(sale.observation || '');
                                        }}
                                        className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 animate-fade-in"
                                    >
                                        <Edit size={16} /> Editar Venta (Auditoría en Caliente)
                                    </button>
                                )}

                                {/* Botón de Invalidador Individual */}
                                {hasEditPermission && !sale.isInvalidated && (
                                    <button
                                        onClick={() => setShowInvalidateConfirm(true)}
                                        className="w-full py-3 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-red-200 shadow-sm active:scale-95 animate-fade-in"
                                    >
                                        <Trash2 size={16} /> Anular Venta (Devolver Inventario)
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        // ==================== MODO EDICIÓN (HOT-EDIT) ====================
                        <div className="space-y-5 text-left">
                            
                            {/* Información del Cliente */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Cliente</label>
                                <input 
                                    type="text" 
                                    value={editDescription} 
                                    onChange={(e) => setEditDescription(e.target.value)} 
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs bg-white"
                                    placeholder="Nombre del Cliente"
                                />
                            </div>

                            {/* Buscador de productos para añadir */}
                            <div className="space-y-1 relative">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Añadir Producto al Recibo</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Escribe el nombre del producto..."
                                        value={productSearch}
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                            setShowProductDropdown(true);
                                        }}
                                        onFocus={() => setShowProductDropdown(true)}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs bg-white"
                                    />
                                    {productSearch && (
                                        <button 
                                            onClick={() => {
                                                setProductSearch('');
                                                setShowProductDropdown(false);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown de productos filtrados */}
                                {showProductDropdown && filteredProducts.length > 0 && (
                                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100">
                                        {filteredProducts.map(prod => (
                                            <button 
                                                key={prod.id}
                                                type="button"
                                                onClick={() => handleAddProduct(prod)}
                                                className="w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center text-xs"
                                            >
                                                <div>
                                                    <span className="font-bold text-slate-700">{prod.name}</span>
                                                    <span className="text-[10px] text-slate-400 ml-2">({prod.category})</span>
                                                </div>
                                                <span className="font-bold text-teal-600">{formatPrice(prod.price)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Listado de ítems editables */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 block">Ítems de Venta</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {editCart.map((item, idx) => (
                                                                        <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3 text-xs">
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="font-bold text-slate-800 truncate block flex items-center gap-1.5">
                                                                                    {item.name}
                                                                                    {item.isGift && <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5"><Gift size={8} /> Regalo</span>}
                                                                                </span>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <span className="text-[10px] text-slate-400">Precio Unitario ($):</span>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        step="0.01"
                                                                                        value={item.price}
                                                                                        disabled={item.isGift}
                                                                                        onChange={(e) => handleUpdateUnitPrice(item.id, e.target.value)}
                                                                                        className="w-16 p-1 border border-slate-200 rounded bg-white font-mono text-center text-[10px] font-bold focus:border-teal-500 outline-none disabled:opacity-50"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                {/* Botón de Obsequio */}
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => toggleEditCartItemGift(item.id)} 
                                                                                    className={`p-1.5 rounded transition-colors ${item.isGift ? 'bg-rose-100 text-rose-600 border border-rose-300' : 'bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-200 shadow-sm'}`}
                                                                                    title={item.isGift ? "Quitar regalo" : "Marcar como regalo ($0)"}
                                                                                >
                                                                                    <Gift size={12} />
                                                                                </button>
                                                                                <div className="flex items-center bg-white border rounded-xl overflow-hidden shadow-inner">
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => handleUpdateQty(item.id, -1)}
                                                                                        className="p-1.5 hover:bg-slate-100 transition-colors text-slate-500"
                                                                                    >
                                                                                        <Minus size={12} />
                                                                                    </button>
                                                                                    <span className="px-3 font-mono font-bold">{item.qty}</span>
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => handleUpdateQty(item.id, 1)}
                                                                                        className="p-1.5 hover:bg-slate-100 transition-colors text-slate-500"
                                                                                    >
                                                                                        <Plus size={12} />
                                                                                    </button>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveItem(item.id)}
                                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                                                    title="Eliminar ítem"
                                                                                >
                                                                                    <Trash2 size={15} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                </div>
                            </div>

                            {/* Descuento Global en Edición */}
                            <div className="bg-slate-100 p-4 rounded-3xl space-y-2 text-left">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descuento Global (Edición)</span>
                                    <div className="flex bg-slate-200 p-0.5 rounded-lg border select-none text-[9px] font-bold">
                                        <button 
                                            type="button" 
                                            onClick={() => setEditDiscountType('percent')} 
                                            className={`px-2 py-0.5 rounded transition-all ${editDiscountType === 'percent' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500'}`}
                                        >
                                            %
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setEditDiscountType('fixed')} 
                                            className={`px-2 py-0.5 rounded transition-all ${editDiscountType === 'fixed' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500'}`}
                                        >
                                            $
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={editDiscountValue || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setEditDiscountValue(val);
                                            }}
                                            placeholder={editDiscountType === 'percent' ? 'Ej: 10%' : 'Ej: $15'}
                                            className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 font-mono bg-white"
                                        />
                                        <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">
                                            {editDiscountType === 'percent' ? '%' : 'USD'}
                                        </span>
                                    </div>
                                    {editDiscountAmount > 0 && (
                                        <div className="flex items-center text-xs text-rose-600 font-bold px-1 whitespace-nowrap font-mono">
                                            - ${editDiscountAmount.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Configuración del Método de Pago */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Método de Pago</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'efectivo', label: 'Efectivo', icon: Wallet },
                                        { id: 'pago_movil', label: 'Pago Móvil', icon: DollarSign },
                                        { id: 'punto_de_venta', label: 'Punto POS', icon: CreditCard },
                                        { id: 'mixto', label: 'Pago Mixto', icon: RefreshCw }
                                    ].map(m => {
                                        const Icon = m.icon;
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setEditPaymentMethod(m.id)}
                                                className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold text-[10px] uppercase transition-all ${
                                                    editPaymentMethod === m.id 
                                                        ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm' 
                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                }`}
                                            >
                                                <Icon size={14} />
                                                {m.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Desglose Dinámico de Pagos (en función del método seleccionado) */}
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                                <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1">Registrar Valores de Pago</h5>

                                {(editPaymentMethod === 'efectivo' || editPaymentMethod === 'mixto') && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Efectivo Recibido ($)</label>
                                            <input 
                                                type="number" 
                                                step="any"
                                                value={cashReceived || ''} 
                                                onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-xs font-mono text-center bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Vuelto Entregado ($)</label>
                                            <input 
                                                type="number" 
                                                step="any"
                                                value={cashChangeDelivered || ''} 
                                                onChange={(e) => setCashChangeDelivered(parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-xs font-mono text-center bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(editPaymentMethod === 'pago_movil' || editPaymentMethod === 'mixto') && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {editPaymentMethod === 'mixto' && (
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase block">Pago Móvil ($)</label>
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    value={pmReceived || ''} 
                                                    onChange={(e) => setPmReceived(parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-xs font-mono text-center bg-white"
                                                />
                                            </div>
                                        )}
                                        <div className={`space-y-1 ${editPaymentMethod === 'pago_movil' ? 'col-span-2' : ''}`}>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Referencia Pago Móvil</label>
                                            <input 
                                                type="text" 
                                                value={pmReference} 
                                                onChange={(e) => setPmReference(e.target.value)}
                                                placeholder="Últimos 4 o 6 dígitos..."
                                                className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-xs text-center bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(editPaymentMethod === 'punto_de_venta' || editPaymentMethod === 'mixto') && (
                                    <div className="grid grid-cols-2 gap-3 font-mono">
                                        {editPaymentMethod === 'mixto' && (
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase block">Punto POS ($)</label>
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    value={posReceived || ''} 
                                                    onChange={(e) => setPosReceived(parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-xs text-center bg-white"
                                                />
                                            </div>
                                        )}
                                        <div className={`space-y-1 ${editPaymentMethod === 'punto_de_venta' ? 'col-span-2' : ''}`}>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase block">Referencia Punto POS</label>
                                            <input 
                                                type="text" 
                                                value={posReference} 
                                                onChange={(e) => setPosReference(e.target.value)}
                                                placeholder="Número de referencia..."
                                                className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-teal-500 text-xs text-center bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Análisis en Caliente de Vuelto */}
                                {(editPaymentMethod === 'efectivo' || editPaymentMethod === 'mixto') && (
                                    <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="text-slate-400">Total Recibido:</span>{' '}
                                            <span className="font-bold font-mono">${changeCalculation.totalReceived.toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Vuelto Esperado:</span>{' '}
                                            <span className="font-bold font-mono text-emerald-600">${changeCalculation.expectedChange.toFixed(2)}</span>
                                        </div>
                                        <div className={`font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${
                                            changeCalculation.status === 'shortage' 
                                                ? 'bg-cyan-100 text-cyan-700 animate-pulse' 
                                                : changeCalculation.status === 'excess' 
                                                ? 'bg-pink-100 text-pink-700 animate-pulse' 
                                                : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {changeCalculation.status === 'shortage' 
                                                ? 'Falta Vuelto' 
                                                : changeCalculation.status === 'excess' 
                                                ? 'Exceso Vuelto' 
                                                : 'Vuelto Exacto'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notas / Observaciones Internas */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notas / Observación</label>
                                <textarea
                                    rows="2"
                                    value={editObservation}
                                    onChange={(e) => setEditObservation(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-xs bg-white resize-none"
                                    placeholder="Detalle interno o nota..."
                                />
                            </div>

                            {/* Sección de Switch de Modo de Total */}
                            <div className="bg-slate-100 p-4 rounded-3xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h5 className="font-bold text-slate-700 text-xs">Modo del Total Cobrado</h5>
                                        <p className="text-[10px] text-slate-400">Permite ajustar libremente el cobro final.</p>
                                    </div>
                                    <div className="flex bg-slate-200 p-0.5 rounded-lg border">
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setIsTotalManual(false);
                                                setEditTotal(cartAutoTotal);
                                            }}
                                            className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                                                !isTotalManual ? 'bg-white text-teal-600 shadow-sm font-black' : 'text-slate-500'
                                            }`}
                                        >
                                            Auto
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsTotalManual(true)}
                                            className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                                                isTotalManual ? 'bg-white text-teal-600 shadow-sm font-black' : 'text-slate-500'
                                            }`}
                                        >
                                            Manual
                                        </button>
                                    </div>
                                </div>

                                {isTotalManual ? (
                                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Monto Total Manual ($)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={editTotal}
                                            onChange={(e) => setEditTotal(parseFloat(e.target.value) || 0)}
                                            className="w-full p-3 border border-teal-200 rounded-xl outline-none focus:border-teal-500 text-sm font-black font-mono text-center text-teal-600 bg-white"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <span>Subtotal de Artículos:</span>
                                            <span className="font-bold font-mono">${editSubtotal.toFixed(2)}</span>
                                        </div>
                                        {editDiscountAmount > 0 && (
                                            <div className="flex justify-between items-center text-xs text-rose-600 font-bold">
                                                <span>Descuento Aplicado:</span>
                                                <span className="font-mono">-${editDiscountAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm font-black text-slate-800">
                                            <span>Total Calculado:</span>
                                            <span className="font-mono text-teal-600">${cartAutoTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Acciones de Edición */}
                            <div className="flex gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors font-bold text-xs text-slate-500"
                                >
                                    Cancelar Cambios
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveHotEdit}
                                    className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Guardar Auditoría
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>
            
            {/* Div oculto optimizado para impresión de ticket clásico de matriz de puntos */}
            <div id="receipt-ticket-printable" className="hidden"></div>

            {/* Modal de Confirmación de Invalidación Individual */}
            {showInvalidateConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                    <div className="bg-white border border-slate-200 p-6 rounded-[2.5rem] max-w-sm w-full shadow-2xl slide-up text-left">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-base font-black text-slate-800 mb-2">Anular Venta Individual</h3>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
                            Estás a punto de anular esta venta. Esta acción devolverá todos los ingredientes del pedido al stock físico del inventario.
                        </p>

                        <div className="space-y-1.5 text-left mb-6 font-sans">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Motivo de Anulación</label>
                            <textarea 
                                rows="3" 
                                required
                                value={invalidateReason}
                                onChange={(e) => setInvalidateReason(e.target.value)}
                                placeholder="Indica la razón (Ej: Devolución de cliente, error de cobro)..."
                                className="w-full p-3 border border-slate-200 rounded-xl focus:border-red-500 outline-none text-xs resize-none bg-white"
                            />
                        </div>

                        <div className="flex gap-3 font-sans">
                            <button 
                                onClick={() => {
                                    setShowInvalidateConfirm(false);
                                    setInvalidateReason('');
                                }}
                                disabled={isInvalidating}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-600 transition-colors bg-white disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleInvalidateSingle}
                                disabled={isInvalidating || !invalidateReason.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {isInvalidating ? 'Anulando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
