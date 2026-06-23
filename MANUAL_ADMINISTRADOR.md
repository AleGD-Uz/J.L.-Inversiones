# Manual de Administración - Sistema J.L. Inversiones

¡Bienvenido al **Manual de Administración de la aplicación J.L. Inversiones**! Este documento está diseñado para guiar a los administradores y usuarios con privilegios en el uso, gestión, control y mantenimiento de la plataforma.

La aplicación es un sistema integral de **Punto de Venta (POS), Gestión de Pedidos, Control de Inventario (Kardex), Balances Financieros y Seguridad (Bitácora)**, diseñado especialmente para negocios de sublimación, confección y diseño, sincronizado en tiempo real a través de Firebase.

---

## Índice
1. [Arquitectura y Conceptos Generales](#1-arquitectura-y-conceptos-generales)
2. [Acceso, Roles y Matriz de Permisos](#2-acceso-roles-y-matriz-de-permisos)
3. [Módulo de Operaciones](#3-módulo-de-operaciones)
   - [Punto de Venta (POS)](#punto-de-venta-pos)
   - [Pedidos Pendientes](#pedidos-pendientes)
   - [Historial de Ventas](#historial-de-ventas)
   - [Gestión de Clientes](#gestión-de-clientes)
4. [Módulo de Catálogo y Recetas](#4-módulo-de-catálogo-y-recetas)
5. [Módulo de Inventario y Kardex](#5-módulo-de-inventario-y-kardex)
   - [Inventario de Materiales](#inventario-de-materiales)
   - [Registro de Mermas](#registro-de-mermas)
   - [Kardex (Entrada/Salida)](#kardex-entradasalida)
6. [Módulo de Administración y Finanzas](#6-módulo-de-administración-y-finanzas)
   - [Dashboard General](#dashboard-general)
   - [Balance Financiero](#balance-financiero)
   - [Reportes de Rendimiento](#reportes-de-rendimiento)
   - [Bitácora de Actividad (Auditoría)](#bitácora-de-actividad-auditoría)
7. [Configuración del Sistema](#7-configuración-del-sistema)
   - [Tasa de Cambio (Divisas)](#tasa-de-cambio-divisas)
   - [Gestión de Usuarios y Accesos](#gestión-de-usuarios-y-accesos)
   - [Copias de Seguridad (Backup y Restauración)](#copias-de-seguridad-backup-y-restauración)

---

## 1. Arquitectura y Conceptos Generales

El sistema J.L. Inversiones opera bajo la premisa de **Sincronización en Tiempo Real** y **Consistencia de Inventario**.
*   **Zona Horaria Unificada**: Toda la aplicación utiliza de manera fija la zona horaria de **Caracas, Venezuela (`America/Caracas`)**, garantizando que los cierres de caja y registros de bitácora coincidan sin importar la configuración del dispositivo del usuario.
*   **Doble Denominación**: Los precios se pueden visualizar y gestionar tanto en **Dólares ($ USD)** como en **Bolívares (VES)** a través de una tasa de cambio global actualizable en tiempo real.
*   **Recetas de Producción (Fórmulas)**: Cada producto del catálogo está enlazado a componentes de inventario de materia prima. Al realizarse una venta o confirmarse un pedido, el sistema deduce automáticamente las cantidades proporcionales de materia prima.

---

## 2. Acceso, Roles y Matriz de Permisos

El acceso a la aplicación está restringido mediante autenticación segura de **Firebase Auth**. 

### Pantallas de Inicio
*   **Catálogo Público (`#/catalogo`)**: Permite a cualquier persona ajena al personal visualizar la lista de productos disponibles con su respectiva categoría e imágenes en tiempo real, convertidos a la tasa de cambio del día.
*   **Login de Personal (`#/login`)**: Formulario seguro donde el personal del negocio inicia sesión con su correo electrónico y contraseña.

### Roles Predefinidos del Sistema
El sistema cuenta con 5 roles predefinidos con diferentes permisos iniciales (los cuales pueden modificarse individualmente por un **Gerente**):

| Módulo / Pestaña | Gerente | Encargado | Cajero | Diseñador | Empleado |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | Ver / Editar | Ver / Editar | Ver | Ver | Ver |
| **Ventas / POS** | Ver / Editar | Ver / Editar | Ver / Editar | - | - |
| **Pedidos Pendientes** | Ver / Editar | Ver / Editar | Ver / Editar | Ver / Editar | Ver |
| **Historial** | Ver / Editar | Ver / Editar | Ver | - | - |
| **Catálogo / Menú** | Ver / Editar | Ver / Editar | Ver | Ver / Editar | Ver |
| **Inventario** | Ver / Editar | Ver / Editar | Ver | Ver | Ver |
| **Kardex (E/S)** | Ver / Editar | Ver / Editar | - | - | - |
| **Clientes** | Ver / Editar | Ver / Editar | Ver / Editar | - | - |
| **Balance** | Ver / Editar | Ver | - | - | - |
| **Reportes** | Ver / Editar | Ver | - | - | - |
| **Bitácora** | Ver / Editar | - | - | - | - |
| **Configuración** | Ver / Editar | - | - | - | - |

> [!NOTE]
> Un usuario con rol **Gerente** posee control absoluto y sus permisos no se pueden restringir. Solo los administradores con este rol pueden acceder a la pestaña de **Bitácora** e invocar herramientas de restauración total de base de datos.

---

## 3. Módulo de Operaciones

### Punto de Venta (POS)
Es el núcleo transaccional del negocio. Permite registrar ventas directas y generar comandas de pedidos personalizados.

*   **Búsqueda y Filtro de Productos**: Dispone de un buscador de texto y un menú de categorías de acceso rápido.
*   **Validación de Stock en Tiempo Real**: Si un producto depende de materiales escasos o agotados, se mostrará como **"Agotado"** y bloqueará el botón para agregarlo al carrito.
*   **Personalización del Ítem**: Cada producto añadido al carrito cuenta con un campo de texto para detallar especificaciones (ej. *Talla M, Nombre: Alejandro, Color de gorra: Azul*).
*   **Metadatos de la Orden**:
    *   **Fecha de Entrega Prometida**: Calendario para planificar cuándo se debe despachar.
    *   **Enlace de Diseño**: Campo para registrar la URL (Drive, Canva, Figma) del arte digital correspondiente a sublimar.
    *   **Cliente / Nota**: Identificación del comprador o notas internas sobre el servicio.
*   **Acciones del Carrito**:
    *   `Vaciar`: Limpia el carrito de compras actual.
    *   `Cotizar`: Descarga un documento **PDF formal** estructurado como una cotización con validez de 15 días.
    *   `Pendientes`: Registra la comanda en la sección de pedidos pendientes, descontando el inventario correspondiente y creando un movimiento de salida tipo `ADD` o `SUB` en Kardex.
    *   `Cobrar`: Registra la venta de manera inmediata como completada, descuenta el stock, añade los ingresos a caja y abre el modal de **Recibo de Pago PDF** listo para imprimir o enviar.

### Pedidos Pendientes
Muestra los trabajos que están en cola de producción o pendientes por facturar.

*   **Identificación Rápida**: Cada tarjeta de pedido detalla el cliente, productos, cantidades, notas, enlace al diseño y la **fecha límite de entrega en color rojo** si requiere prioridad.
*   **Acciones**:
    *   `Editar`: Devuelve la comanda completa al carrito de compras en el POS para añadir productos o cambiar especificaciones.
    *   `Cancelar`: Elimina el pedido y **devuelve automáticamente la materia prima consumida al stock**, registrando el reingreso en Kardex con la observación *"Cancelación #XXXX"*.
    *   `Cobrar`: Finaliza el pedido, lo mueve al historial de ventas y abre la generación de recibo en PDF.

### Historial de Ventas
Contiene todas las transacciones completadas en la aplicación.

*   **Buscador y Fechas**: Permite ubicar clientes o transacciones en rangos de fechas específicos.
*   **Detalle y Notas**: Al seleccionar una venta, se abre un modal con el desglose de productos. Cuenta con un panel de **Observaciones** editable para añadir incidencias o notas de entrega (*ej: "Se entregó con empaque especial"*).
*   **Análisis con Inteligencia Artificial**: Incluye integración con **Gemini AI**, permitiendo enviar un resumen del historial filtrado para recibir un análisis instantáneo de tendencias de consumo, horas pico y recomendaciones de stock.
*   **Descarga de Reportes**: Permite descargar un reporte consolidado de las ventas visibles en formato PDF.

### Gestión de Clientes
Base de datos unificada para el seguimiento del cliente.

*   Permite registrar y editar fichas de clientes con: **Nombre Completo**, **Teléfono**, **Correo Electrónico** y **Dirección de Envío**.
*   Facilita la carga de datos al momento de facturar o contactar para entregas.

---

## 4. Módulo de Catálogo y Recetas

Permite administrar la oferta del negocio y configurar la lógica de producción.

*   **Creación y Edición de Productos**:
    *   **Datos Básicos**: Nombre del producto y Categoría.
    *   **Identidad Visual**: Permite usar un **Emoji** representativo o **subir una imagen** (.png o .jpg). La aplicación comprime y redimensiona de forma automática la imagen en el cliente para mantener el rendimiento y optimizar el almacenamiento de la base de datos de Firebase (máximo 128px de resolución).
*   **Editor de Recetas Interactivo**:
    *   Permite definir qué materiales de inventario consume el producto y en qué cantidad exacta.
    *   A medida que añade componentes, el sistema muestra el **Costo de Producción Neto** en tiempo real.
*   **Calculadora de Margen de Ganancia**:
    *   Permite ingresar un porcentaje de margen deseado (ej. 30%).
    *   El sistema calcula el **Precio de Venta Sugerido** combinando el costo de los materiales y el margen. Con un solo clic en `Fijar`, se actualiza el precio de venta final.
*   **Estrategia AI**: Mediante **Gemini AI**, el sistema analiza el producto y la receta configurada para proponer alternativas de optimización de costos o estrategias de comercialización de manera autónoma.

---

## 5. Módulo de Inventario y Kardex

### Inventario de Materiales
Gestión de materias primas necesarias para los productos del negocio (ej. tazas, camisetas base, tintas, cinta térmica).

*   **Valor Neto del Inventario**: Muestra el valor en USD y VES de toda la mercancía almacenada (Stock × Costo Unitario).
*   **Configuración Financiera de Materiales**:
    *   Establece el costo unitario de compra en USD o VES.
    *   Permite declarar el **IVA %** aplicable al material y cuenta con una función para autocalcular y aplicar el costo total con impuestos.
*   **Stock Mínimo (Punto de Reorden)**: Al definir un stock mínimo, el sistema marcará en rojo el material si el stock desciende de este límite, incluyéndolo en la sección de alertas del Dashboard y Reportes.

### Registro de Mermas
Control de pérdidas por daño, error de impresión, vencimiento o fallas de fábrica.

*   Permite descontar material del stock seleccionando la cantidad y el motivo de la pérdida.
*   Registra el egreso en Kardex bajo la clasificación `LOSS` (Pérdidas), restando su valor del balance bruto ajustado del negocio.

### Kardex (Entradas/Salidas)
Historial técnico y contable del movimiento del inventario.

*   Registra cada alteración de stock clasificándola por:
    *   `ADD` (Entradas): Carga inicial, compras a proveedores, cancelaciones de pedidos.
    *   `SUB` (Salidas): Consumo por ventas POS o comandas enviadas a producción.
    *   `LOSS` (Pérdidas): Mermas reportadas.
*   Cada fila detalla la fecha exacta, material, variación de cantidad, costo unitario, valor total de la transacción, el stock antes/después del movimiento y una **observación editable** para correcciones o aclaraciones de auditoría.

---

## 6. Módulo de Administración y Finanzas

### Dashboard General
Pantalla de visualización rápida del estado del negocio.

*   **KPIs en Tiempo Real**: Ingresos del día, número de transacciones y margen promedio general.
*   **Gráfico de Flujo de Ventas**: Curva de ingresos por horas para identificar picos de tráfico en tienda.
*   **Gráfico de Balance Semanal**: Barras comparativas de Ingresos vs. Gastos (registrados manualmente) de los últimos 7 días.
*   **Sección de Alertas de Stock Crítico**: Lista de materiales urgentes por comprar antes de que afecten la producción.

### Balance Financiero
Centro contable para la toma de decisiones.

*   Muestra un desglose financiero del período seleccionado:
    1.  **Ventas Totales**: Suma de todos los ingresos percibidos.
    2.  **Costo de Ventas (COGS)**: Costo acumulado de la materia prima consumida para generar las ventas realizadas.
    3.  **Costo de Mermas**: Pérdida monetaria directa por desecho de materiales.
    4.  **Ganancia Bruta Ajustada**: `Ventas Totales - Costo de Ventas - Costo de Mermas`.
    5.  **Gastos Operativos**: Egresos generales del negocio registrados manualmente (no incluye compras automáticas de inventario).
    6.  **Flujo Neto de Caja**: Liquidez neta generada en el período (Entradas - Salidas Reales).

### Reportes de Rendimiento
Análisis detallado de rentabilidad por producto.

*   **Tabla de Rendimiento**: Detalla por cada producto del catálogo: unidades vendidas, ingresos generados, costo de producción incurrido, ganancia neta, porcentaje de margen de ganancia real obtenido y si clasifica como un producto **"Rentable"** (Ganancia > 0).
*   **Exportación Total**: Permite descargar los datos financieros de rendimiento a archivos **PDF** o tablas de **Excel (.csv)** de manera nativa.

### Bitácora de Actividad (Auditoría)
Registro de auditoría forense inalterable del sistema.

*   Monitorea cada interacción crítica de los usuarios.
*   **Estructura del Registro**: Fecha exacta, Usuario responsable (correo o nombre), Módulo del cambio (Venta, Inventario, Catálogo, Sistema, Gasto, Pedido, Cancelación) y un detalle textual explicativo de la acción ejecutada.
*   Permite filtrar la bitácora por fecha, por módulo de interés y por buscador de texto para investigaciones internas.

---

## 7. Configuración del Sistema

### Tasa de Cambio (Divisas)
Ubicada en la parte inferior de la barra lateral de navegación.

*   Permite actualizar el precio del dólar en bolívares en tiempo real.
*   Al modificar este campo, todos los indicadores, listados de precios, recibos de pago y reportes financieros actualizan instantáneamente sus valores en bolívares de forma automática.

### Gestión de Usuarios y Accesos
Control granular de quién entra al sistema y qué acciones puede realizar.

*   **Creación de Cuentas**: Registra nuevos usuarios en Firebase vinculados al negocio.
*   **Modificación de Roles**: Permite cambiar el rol de un usuario en cualquier momento.
*   **Editor de Permisos Granular**: 
    *   Si el usuario no es un **Gerente**, el administrador puede activar/desactivar de manera individual la capacidad de **Ver** y/o **Editar** de cada uno de los 12 apartados del sistema.
    *   *Ejemplo: Permitir a un Cajero visualizar el módulo de Inventario pero deshabilitar su opción de Editar para evitar alteraciones no autorizadas.*

### Copias de Seguridad (Backup y Restauración)

Para evitar la pérdida de información comercial histórica, el sistema implementa una sección de respaldos:

*   **Exportar Copia Local**: Descarga un archivo en formato `.json` al computador del administrador que contiene toda la base de datos de ingredientes, productos, ventas, kardex, gastos, pedidos y bitácora de actividad.
*   **Restaurar Copia**:
    > [!WARNING]
    > **ATENCIÓN**: Restaurar un archivo de respaldo reemplazará **completamente** la base de datos actual de Firebase con los datos del archivo importado. Esta acción no se puede deshacer.
    *   El administrador selecciona un archivo `.json` de respaldo previamente exportado.
    *   El sistema solicitará una confirmación de seguridad explícita, borrará las colecciones activas e importará en lotes ordenados los registros para evitar saturar el ancho de banda.
*   **Cargar Catálogo Demo**:
    > [!CAUTION]
    > Esta opción está diseñada para fines de demostración o configuración inicial rápida. Borrará la base de datos actual y cargará un catálogo listo para operar un **negocio de Sublimación** (materiales como tazas, gorras, camisetas; productos configurados con sus respectivas recetas de consumo de tintas, papel, cinta térmica y stock inicial).

---

*Manual elaborado para el uso administrativo del sistema J.L. Inversiones. Para dudas o soporte técnico adicional, contacte al administrador de sistemas del proyecto.*
