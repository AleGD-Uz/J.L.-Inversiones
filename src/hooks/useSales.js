import { useCallback } from 'react';
import { doc, runTransaction } from 'firebase/firestore';

const generateSecureId = () => {
    return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
};

// Helper to safely get ingredient quantity from recipe
const getRecipeIngQty = (recipeIngredient) => {
    if (!recipeIngredient) return 0;
    const qty = recipeIngredient.quantity !== undefined 
        ? recipeIngredient.quantity 
        : (recipeIngredient.qty !== undefined ? recipeIngredient.qty : 0);
    return Number(qty) || 0;
};

export function useSales({ db, user, currentAppId, logActivity }) {
    
    /**
     * Anula una venta de forma transaccional. Devuelve los ingredientes al stock,
     * registra en el Kardex y disminuye el contador de popularidad de los productos.
     */
    const invalidateSale = useCallback(async (saleId, saleItems, reason, userName) => {
        if (!db || !currentAppId) {
            throw new Error("Base de datos no inicializada.");
        }
        if (!reason || reason.trim() === "") {
            throw new Error("Debe proporcionar un motivo para la anulación.");
        }

        const callerName = userName || (user ? user.email : "Usuario");

        await runTransaction(db, async (transaction) => {
            // 1. Obtener la venta
            const saleRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'sales', saleId);
            const saleSnap = await transaction.get(saleRef);
            if (!saleSnap.exists()) {
                throw new Error(`La venta con ID ${saleId} no existe.`);
            }
            const saleData = saleSnap.data();
            if (saleData.isInvalidated) {
                throw new Error("La venta ya ha sido anulada.");
            }

            // 2. Calcular los ingredientes a devolver
            // { ingredientId: { qtyToReturn, name } }
            const ingredientAdjustments = {};
            const items = saleItems || saleData.items || [];
            
            items.forEach(item => {
                const recipe = item.recipe || [];
                recipe.forEach(r => {
                    const ingId = r.ingredientId;
                    if (!ingId) return;
                    const qtyToReturn = getRecipeIngQty(r) * (item.qty || 0);
                    if (qtyToReturn > 0) {
                        if (!ingredientAdjustments[ingId]) {
                            ingredientAdjustments[ingId] = { qty: 0, name: r.name || 'Material' };
                        }
                        ingredientAdjustments[ingId].qty += qtyToReturn;
                    }
                });
            });

            // 3. Realizar lecturas de ingredientes
            const ingredientSnaps = {};
            for (const ingId of Object.keys(ingredientAdjustments)) {
                const ingRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'ingredients', ingId);
                ingredientSnaps[ingId] = {
                    ref: ingRef,
                    snap: await transaction.get(ingRef)
                };
            }

            // 4. Realizar lecturas de popularidad de productos
            const productSnaps = {};
            for (const item of items) {
                if (item.id) {
                    const prodRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'products', item.id);
                    productSnaps[item.id] = {
                        ref: prodRef,
                        snap: await transaction.get(prodRef)
                    };
                }
            }

            // 5. Aplicar devoluciones de stock y Kardex
            for (const [ingId, adj] of Object.entries(ingredientAdjustments)) {
                const itemDoc = ingredientSnaps[ingId];
                if (itemDoc && itemDoc.snap.exists()) {
                    const ingData = itemDoc.snap.data();
                    const currentStock = Number(ingData.stock) || 0;
                    const newStock = currentStock + adj.qty;
                    const ingCost = Number(ingData.cost) || 0;

                    // Actualizar ingrediente
                    transaction.update(itemDoc.ref, { stock: newStock });

                    // Escribir Kardex (stock_history)
                    const kardexId = generateSecureId();
                    const kardexRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'stock_history', kardexId);
                    
                    transaction.set(kardexRef, {
                        id: kardexId,
                        date: new Date().toISOString(),
                        type: 'ADD', // ADD se evalúa como Entrada en la UI
                        ingredientId: ingId,
                        ingredientName: ingData.name || adj.name,
                        qtyChange: adj.qty,
                        previousStock: currentStock,
                        newStock: newStock,
                        costPerUnit: ingCost,
                        totalValue: adj.qty * ingCost,
                        reason: `Devolución (Venta Anulada) - ${reason}`
                    });
                }
            }

            // 6. Restar popularidad de productos
            for (const item of items) {
                if (item.id) {
                    const prodDoc = productSnaps[item.id];
                    if (prodDoc && prodDoc.snap.exists()) {
                        const prodData = prodDoc.snap.data();
                        const currentSalesCount = Number(prodData.salesCount) || 0;
                        const newSalesCount = Math.max(0, currentSalesCount - (item.qty || 0));
                        transaction.update(prodDoc.ref, { salesCount: newSalesCount });
                    }
                }
            }

            // 7. Anular venta en base de datos
            transaction.update(saleRef, {
                isInvalidated: true,
                invalidationReason: reason,
                invalidatedAt: new Date().toISOString(),
                invalidatedBy: callerName
            });
        });

        // Registrar en bitácora
        if (logActivity) {
            await logActivity('Cancelación', `Venta #${saleId.slice(-6)} anulada por ${callerName}. Razón: ${reason}`);
        }
    }, [db, currentAppId, user, logActivity]);


    /**
     * Edita una venta de forma diferencial. Compara ingredientes entre el carrito anterior 
     * y el nuevo, y ajusta de forma neta el stock, actualiza Kardex y actualiza popularidad.
     */
    const updateCompletedSale = useCallback(async (oldSale, newCart, newTotal, newDescription, options = {}) => {
        if (!db || !currentAppId) {
            throw new Error("Base de datos no inicializada.");
        }
        if (!oldSale || !oldSale.id) {
            throw new Error("Falta la información de la venta original.");
        }

        const callerName = options.userName || (user ? user.email : "Usuario");

        await runTransaction(db, async (transaction) => {
            // 1. Obtener la venta actual en Firestore para tener la versión fresca
            const saleRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'sales', oldSale.id);
            const saleSnap = await transaction.get(saleRef);
            if (!saleSnap.exists()) {
                throw new Error("La venta que intenta editar ya no existe.");
            }
            const currentSaleData = saleSnap.data();
            if (currentSaleData.isInvalidated) {
                throw new Error("No se puede editar una venta anulada.");
            }

            const oldItems = currentSaleData.items || [];

            // 2. Calcular los diferenciales de ingredientes consumidos:
            // diff = viejaCantidad - nuevaCantidad
            // Un valor positivo significa que devolvemos al stock (oldItems consumía más que newCart).
            // Un valor negativo significa que consumimos más (newCart consume más que oldItems).
            const diffMap = {}; // { ingredientId: { name, diff } }

            // Sumar de la venta anterior (devolución virtual)
            oldItems.forEach(item => {
                const recipe = item.recipe || [];
                recipe.forEach(r => {
                    const ingId = r.ingredientId;
                    if (!ingId) return;
                    const qty = getRecipeIngQty(r) * (item.qty || 0);
                    if (!diffMap[ingId]) {
                        diffMap[ingId] = { name: r.name || 'Material', diff: 0 };
                    }
                    diffMap[ingId].diff += qty;
                });
            });

            // Restar de la nueva venta (consumo virtual)
            newCart.forEach(item => {
                const recipe = item.recipe || [];
                recipe.forEach(r => {
                    const ingId = r.ingredientId;
                    if (!ingId) return;
                    const qty = getRecipeIngQty(r) * (item.qty || 0);
                    if (!diffMap[ingId]) {
                        diffMap[ingId] = { name: r.name || 'Material', diff: 0 };
                    }
                    diffMap[ingId].diff -= qty;
                });
            });

            // 3. Realizar lecturas de los ingredientes que tienen un diferencial diferente de 0
            const ingredientSnaps = {};
            const ingredientsToQuery = Object.entries(diffMap).filter(([_, val]) => Math.abs(val.diff) > 0.0001);

            for (const [ingId, _] of ingredientsToQuery) {
                const ingRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'ingredients', ingId);
                ingredientSnaps[ingId] = {
                    ref: ingRef,
                    snap: await transaction.get(ingRef)
                };
            }

            // 4. Calcular differentials de popularidad de productos vendidos:
            // diffQty = newQty - oldQty
            const productDiffMap = {}; // { productId: diffQty }
            oldItems.forEach(item => {
                if (item.id) {
                    productDiffMap[item.id] = (productDiffMap[item.id] || 0) - (item.qty || 0);
                }
            });
            newCart.forEach(item => {
                if (item.id) {
                    productDiffMap[item.id] = (productDiffMap[item.id] || 0) + (item.qty || 0);
                }
            });

            // Realizar lecturas de popularidad de productos que cambiaron
            const productSnaps = {};
            const productsToQuery = Object.entries(productDiffMap).filter(([_, diff]) => diff !== 0);
            for (const [prodId, _] of productsToQuery) {
                const prodRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'products', prodId);
                productSnaps[prodId] = {
                    ref: prodRef,
                    snap: await transaction.get(prodRef)
                };
            }

            // 5. Aplicar los cambios en ingredientes y Kardex
            for (const [ingId, data] of ingredientsToQuery) {
                const itemDoc = ingredientSnaps[ingId];
                if (itemDoc && itemDoc.snap.exists()) {
                    const ingData = itemDoc.snap.data();
                    const currentStock = Number(ingData.stock) || 0;
                    const stockAdjustment = data.diff;
                    const newStock = currentStock + stockAdjustment;
                    const ingCost = Number(ingData.cost) || 0;

                    // Actualizar stock
                    transaction.update(itemDoc.ref, { stock: newStock });

                    // Crear entrada Kardex
                    const kardexId = generateSecureId();
                    const kardexRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'stock_history', kardexId);

                    transaction.set(kardexRef, {
                        id: kardexId,
                        date: new Date().toISOString(),
                        type: stockAdjustment > 0 ? 'ADD' : 'SUB', // ADD = Entrada, SUB = Salida
                        ingredientId: ingId,
                        ingredientName: ingData.name || data.name,
                        qtyChange: stockAdjustment,
                        previousStock: currentStock,
                        newStock: newStock,
                        costPerUnit: ingCost,
                        totalValue: Math.abs(stockAdjustment) * ingCost,
                        reason: `Edición de Venta: Ajuste de ingredientes`
                    });
                }
            }

            // 6. Aplicar cambios en popularidad de productos
            for (const [prodId, diff] of productsToQuery) {
                const prodDoc = productSnaps[prodId];
                if (prodDoc && prodDoc.snap.exists()) {
                    const prodData = prodDoc.snap.data();
                    const currentSalesCount = Number(prodData.salesCount) || 0;
                    const newSalesCount = Math.max(0, currentSalesCount + diff);
                    transaction.update(prodDoc.ref, { salesCount: newSalesCount });
                }
            }

            // 7. Determinar clasificaciones de cambios
            // Comparar ítems simplificados
            const getItemsFingerprint = (itemsList) => {
                return JSON.stringify(
                    itemsList.map(i => ({ id: i.id, qty: i.qty, price: i.price }))
                        .sort((a, b) => a.id.localeCompare(b.id))
                );
            };

            const itemsChanged = getItemsFingerprint(oldItems) !== getItemsFingerprint(newCart);
            const priceChanged = Number(currentSaleData.total) !== Number(newTotal);

            const paymentChanged = 
                currentSaleData.paymentMethod !== options.paymentMethod ||
                JSON.stringify(currentSaleData.paymentData || {}) !== JSON.stringify(options.paymentData || {});

            let modificationType = 'items_only';
            if (priceChanged || (itemsChanged && priceChanged)) {
                modificationType = 'price_and_items';
            } else if (paymentChanged && !itemsChanged) {
                modificationType = 'payment_data_only';
            } else if (itemsChanged && !priceChanged) {
                modificationType = 'items_only';
            }

            // Guardar auditoría
            const modHistoryEntry = {
                timestamp: new Date().toISOString(),
                user: callerName,
                previousTotal: Number(currentSaleData.total) || 0,
                newTotal: Number(newTotal) || 0,
                previousItems: oldItems,
                newItems: newCart,
                previousPaymentData: currentSaleData.paymentData || {},
                newPaymentData: options.paymentData || {},
                type: modificationType
            };

            // Verificar si el precio neto fue modificado manualmente (no coincide con la suma base)
            const baseSum = newCart.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 0)), 0);
            const isPriceModified = Math.abs(Number(newTotal) - baseSum) > 0.01;
            
            const priceModificationDetails = isPriceModified 
                ? { user: callerName, baseTotal: baseSum, newTotal: Number(newTotal) }
                : null;

            const currentHistory = currentSaleData.modificationHistory || [];

            // Actualizar la venta
            transaction.update(saleRef, {
                items: newCart,
                total: Number(newTotal),
                description: newDescription,
                paymentMethod: options.paymentMethod,
                paymentData: options.paymentData || {},
                isModifiedFromHistory: true,
                modifiedAt: new Date().toISOString(),
                modifiedBy: callerName,
                isPriceModified,
                priceModificationDetails,
                changeStatus: options.changeStatus || 'exact',
                observation: options.observation || currentSaleData.observation || '',
                modificationHistory: [...currentHistory, modHistoryEntry],
                subtotal: options.subtotal !== undefined ? options.subtotal : Number(newTotal),
                discountType: options.discountType || 'percent',
                discountValue: options.discountValue || 0,
                discountAmount: options.discountAmount || 0
            });
        });

        // Registrar en bitácora
        if (logActivity) {
            await logActivity('Venta', `Venta #${oldSale.id.slice(-6)} editada por ${callerName}. Total: $${oldSale.total} -> $${newTotal}`);
        }
    }, [db, currentAppId, user, logActivity]);

    return { invalidateSale, updateCompletedSale };
}
