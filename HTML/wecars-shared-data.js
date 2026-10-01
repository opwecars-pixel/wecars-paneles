/**
 * weCars Bajío — Sistema ERP Automotriz
 * Datos compartidos y sincronización entre paneles
 *
 * Este archivo es la ÚNICA fuente de verdad para todos los paneles.
 * En producción (Wix), los datos vienen del CMS a través de Velo.
 * En demo/standalone, este archivo provee los datos y sincroniza vía BroadcastChannel.
 */
(function () {
  'use strict';

  /* ── Expedientes unificados ─────────────────────────────────────────────
     Un expediente = un cliente. Todos los departamentos trabajan sobre
     el mismo objeto. Los permisos determinan qué ve cada quien.
  ─────────────────────────────────────────────────────────────────────── */
  const NOW = Date.now();
  const D = (dias) => new Date(NOW - dias * 86400000).toISOString();

  const EXPEDIENTES = [

    /* ── LEADS SIN ASIGNAR (todos los vendedores los ven) ── */
    {
      _id: 'exp-001',
      nombre: 'Carlos Mendoza',
      telefono: '4771234560',
      email: 'carlos.mendoza@gmail.com',
      sucursal: 'León',
      // CRM
      vendedorEmail: '',
      vendedorNombre: '',
      estatusCRM: 'Nuevo',
      canal: 'WhatsApp',
      ultimoContacto: D(0),
      notas: 'Preguntó por SUV automática, presupuesto flexible.',
      // Vehículo
      vehiculoBuscado: { marca: 'Toyota', modelo: 'RAV4', anioDesde: 2022, kmMax: 50000, presupuesto: 480000, transmision: 'Automático', color: 'Blanco o Gris' },
      vehiculoAsignado: null,
      // Proceso
      etapa: 'Lead',
      // Documentos
      documentos: { ine: { estatus: 'Pendiente', fecha: '', por: '' }, comprobanteDomicilio: { estatus: 'Pendiente', fecha: '', por: '' }, comprobanteIngresos: { estatus: 'Pendiente', fecha: '', por: '' }, curp: { estatus: 'Pendiente', fecha: '', por: '' } },
      // Finanzas
      formaPago: '',
      precioVenta: 0,
      costo: 0,
      anticipos: 0,
      estatusFinanciero: 'En proceso',
      notasFinanzas: '',
      credito: null,
      pagos: [],
      factura: null,
      comision: null,
      // Timeline
      historial: [
        { ts: D(0), area: 'CRM', usuario: 'Sistema', accion: 'Lead ingresado vía WhatsApp', icono: 'ti-brand-whatsapp' },
      ],
      fechaCreacion: D(0),
      ultimaActualizacion: D(0),
      actualizadoPor: 'Sistema',
      // Alias (compatibilidad con paneles existentes)
      estatus: 'Nuevo',
      ultimaActividad: D(0),
      _createdDate: D(0),
      origen: 'WhatsApp',
    },

    {
      _id: 'exp-002',
      nombre: 'Laura Jiménez',
      telefono: '4779876540',
      email: 'laura.jimenez@hotmail.com',
      sucursal: 'León',
      vendedorEmail: '',
      vendedorNombre: '',
      estatusCRM: 'Nuevo',
      canal: 'Facebook',
      ultimoContacto: D(1),
      notas: 'Interesada en sedán o crossover. Tiene crédito pre-aprobado en Banorte.',
      vehiculoBuscado: { marca: 'Mazda', modelo: '3', anioDesde: 2021, kmMax: 40000, presupuesto: 280000, transmision: 'Automático', color: 'Rojo o Negro' },
      vehiculoAsignado: null,
      etapa: 'Lead',
      documentos: { ine: { estatus: 'Pendiente', fecha: '', por: '' }, comprobanteDomicilio: { estatus: 'Pendiente', fecha: '', por: '' }, comprobanteIngresos: { estatus: 'Pendiente', fecha: '', por: '' }, curp: { estatus: 'Pendiente', fecha: '', por: '' } },
      formaPago: '',
      precioVenta: 0,
      costo: 0,
      anticipos: 0,
      estatusFinanciero: 'En proceso',
      notasFinanzas: '',
      credito: null,
      pagos: [],
      factura: null,
      comision: null,
      historial: [
        { ts: D(1), area: 'CRM', usuario: 'Sistema', accion: 'Lead ingresado vía Facebook Ads', icono: 'ti-brand-facebook' },
      ],
      fechaCreacion: D(1),
      ultimaActualizacion: D(1),
      actualizadoPor: 'Sistema',
      estatus: 'Nuevo',
      ultimaActividad: D(1),
      _createdDate: D(1),
      origen: 'Facebook',
    },

    /* ── BRANDON URIBE ── */
    {
      _id: 'exp-003',
      nombre: 'Roberto Sánchez',
      telefono: '4775554433',
      email: 'roberto.sanchez@gmail.com',
      sucursal: 'León',
      vendedorEmail: 'brandonu446@gmail.com',
      vendedorNombre: 'Brandon Uribe',
      estatusCRM: 'Seguimiento',
      canal: 'Google',
      ultimoContacto: D(2),
      notas: 'En trámite de crédito en BBVA. Anticipo depositado. Vehículo separado.',
      vehiculoBuscado: { marca: 'Mazda', modelo: 'CX-5', anioDesde: 2022, kmMax: 40000, presupuesto: 420000, transmision: 'Automático', color: 'Blanco' },
      vehiculoAsignado: { titulo: 'Mazda CX-5 Grand Touring 2022', precio: 380000, costo: 310000, _id: 'inv-003' },
      etapa: 'Credito',
      documentos: {
        ine: { estatus: 'Validado', fecha: D(4), por: 'Alejandro Reyes' },
        comprobanteDomicilio: { estatus: 'Recibido', fecha: D(4), por: 'Alejandro Reyes' },
        comprobanteIngresos: { estatus: 'Pendiente', fecha: '', por: '' },
        curp: { estatus: 'Pendiente', fecha: '', por: '' },
      },
      formaPago: 'Crédito',
      precioVenta: 380000,
      costo: 310000,
      anticipos: 80000,
      estatusFinanciero: 'En trámite',
      notasFinanzas: 'Esperando resolución de BBVA. Plazo estimado: 5 días hábiles.',
      credito: { banco: 'BBVA', monto: 300000, plazo: 48, enganche: 80000, tasa: 14.5, estatus: 'En trámite', notas: '' },
      pagos: [{ _id: 'p-003-1', tipo: 'Anticipo', monto: 80000, ref: 'DEP-2991', fecha: D(3), por: 'Tania Orpinel' }],
      factura: null,
      comision: { pct: 5, monto: 19000, estatus: 'Pendiente' },
      historial: [
        { ts: D(7), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Lead tomado en el CRM', icono: 'ti-hand-grab' },
        { ts: D(6), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Primer contacto por WhatsApp — cliente interesado', icono: 'ti-phone' },
        { ts: D(5), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Vehículo asignado: Mazda CX-5 2022', icono: 'ti-car' },
        { ts: D(4), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'INE recibida y validada', icono: 'ti-id-badge' },
        { ts: D(4), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'Comprobante de domicilio recibido', icono: 'ti-home' },
        { ts: D(3), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Anticipo de $80,000 registrado (DEP-2991)', icono: 'ti-cash' },
        { ts: D(2), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Solicitud de crédito enviada a BBVA ($300,000 / 48m)', icono: 'ti-building-bank' },
      ],
      fechaCreacion: D(7),
      ultimaActualizacion: D(2),
      actualizadoPor: 'Tania Orpinel',
      estatus: 'En proceso',
      ultimaActividad: D(2),
      _createdDate: D(7),
      origen: 'Google',
    },

    {
      _id: 'exp-004',
      nombre: 'María García',
      telefono: '4772345678',
      email: 'mgarcia@outlook.com',
      sucursal: 'León',
      vendedorEmail: 'brandonu446@gmail.com',
      vendedorNombre: 'Brandon Uribe',
      estatusCRM: 'Negociación',
      canal: 'Referido',
      ultimoContacto: D(1),
      notas: 'Referida por Roberto Sánchez. Quiere Hilux para negocio familiar. Busca financiamiento.',
      vehiculoBuscado: { marca: 'Toyota', modelo: 'Hilux', anioDesde: 2021, kmMax: 60000, presupuesto: 560000, transmision: 'Manual', color: 'Negro' },
      vehiculoAsignado: null,
      etapa: 'Seguimiento',
      documentos: { ine: { estatus: 'Pendiente', fecha: '', por: '' }, comprobanteDomicilio: { estatus: 'Pendiente', fecha: '', por: '' }, comprobanteIngresos: { estatus: 'Pendiente', fecha: '', por: '' }, curp: { estatus: 'Pendiente', fecha: '', por: '' } },
      formaPago: 'Crédito',
      precioVenta: 0,
      costo: 0,
      anticipos: 0,
      estatusFinanciero: 'En proceso',
      notasFinanzas: '',
      credito: null,
      pagos: [],
      factura: null,
      comision: null,
      historial: [
        { ts: D(5), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Lead registrado — referida por Roberto Sánchez', icono: 'ti-user-plus' },
        { ts: D(4), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Llamada de bienvenida — confirmó interés en Hilux', icono: 'ti-phone' },
        { ts: D(1), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Cotización enviada por WhatsApp', icono: 'ti-file-text' },
      ],
      fechaCreacion: D(5),
      ultimaActualizacion: D(1),
      actualizadoPor: 'Brandon Uribe',
      estatus: 'Contactado',
      ultimaActividad: D(1),
      _createdDate: D(5),
      origen: 'Referido',
    },

    {
      _id: 'exp-005',
      nombre: 'Fernando Castro',
      telefono: '4773456789',
      email: 'fcastro@gmail.com',
      sucursal: 'León',
      vendedorEmail: 'brandonu446@gmail.com',
      vendedorNombre: 'Brandon Uribe',
      estatusCRM: 'Ganado',
      canal: 'Walk-in',
      ultimoContacto: D(9),
      notas: 'Venta cerrada. Entrega completa.',
      vehiculoBuscado: { marca: 'Nissan', modelo: 'Versa', anioDesde: 2022, kmMax: 0, presupuesto: 220000, transmision: 'Automático', color: 'Blanco' },
      vehiculoAsignado: { titulo: 'Nissan Versa Sense 2023', precio: 210000, costo: 170000, _id: 'inv-005' },
      etapa: 'Entrega',
      documentos: {
        ine: { estatus: 'Validado', fecha: D(14), por: 'Alejandro Reyes' },
        comprobanteDomicilio: { estatus: 'Validado', fecha: D(14), por: 'Alejandro Reyes' },
        comprobanteIngresos: { estatus: 'N/A', fecha: D(14), por: 'Alejandro Reyes' },
        curp: { estatus: 'Validado', fecha: D(14), por: 'Alejandro Reyes' },
      },
      formaPago: 'Contado',
      precioVenta: 210000,
      costo: 170000,
      anticipos: 210000,
      estatusFinanciero: 'Entregado',
      notasFinanzas: 'Pago de contado confirmado. Factura emitida.',
      credito: null,
      pagos: [{ _id: 'p-005-1', tipo: 'Liquidación', monto: 210000, ref: 'TRF-3891', fecha: D(10), por: 'Tania Orpinel' }],
      factura: { folio: 'WCB-2026-003', subtotal: 181034, iva: 28966, total: 210000, fecha: D(9), estatus: 'Emitida' },
      comision: { pct: 5, monto: 10500, estatus: 'Pagada' },
      historial: [
        { ts: D(18), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Walk-in — cliente llegó a la agencia', icono: 'ti-door-enter' },
        { ts: D(17), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Prueba de manejo realizada — Nissan Versa 2023', icono: 'ti-steering-wheel' },
        { ts: D(16), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Precio negociado y aceptado: $210,000', icono: 'ti-check' },
        { ts: D(14), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'Documentación completa validada', icono: 'ti-file-check' },
        { ts: D(10), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Pago de contado recibido $210,000 (TRF-3891)', icono: 'ti-cash' },
        { ts: D(9), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Factura WCB-2026-003 emitida', icono: 'ti-receipt' },
        { ts: D(9), area: 'Vendedores', usuario: 'Brandon Uribe', accion: 'Vehículo entregado al cliente', icono: 'ti-key' },
        { ts: D(8), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Comisión de $10,500 pagada a Brandon Uribe', icono: 'ti-coin' },
      ],
      fechaCreacion: D(18),
      ultimaActualizacion: D(8),
      actualizadoPor: 'Tania Orpinel',
      estatus: 'Ganado',
      ultimaActividad: D(8),
      _createdDate: D(18),
      origen: 'Walk-in',
    },

    /* ── CARLOS SÁNCHEZ ── */
    {
      _id: 'exp-006',
      nombre: 'Ana Torres',
      telefono: '4776667788',
      email: 'ana.torres@gmail.com',
      sucursal: 'León',
      vendedorEmail: 'carlos@wecarsbajio.com',
      vendedorNombre: 'Carlos Sánchez',
      estatusCRM: 'Ganado',
      canal: 'Llamada',
      ultimoContacto: D(14),
      notas: 'Venta cerrada y entregada. Contado total.',
      vehiculoBuscado: { marca: 'Volkswagen', modelo: 'Tiguan', anioDesde: 2021, kmMax: 40000, presupuesto: 330000, transmision: 'Automático', color: 'Gris' },
      vehiculoAsignado: { titulo: 'VW Tiguan Comfortline 2021', precio: 320000, costo: 260000, _id: 'inv-006' },
      etapa: 'Postventa',
      documentos: {
        ine: { estatus: 'Validado', fecha: D(20), por: 'Alejandro Reyes' },
        comprobanteDomicilio: { estatus: 'Validado', fecha: D(20), por: 'Alejandro Reyes' },
        comprobanteIngresos: { estatus: 'N/A', fecha: D(20), por: 'Alejandro Reyes' },
        curp: { estatus: 'Validado', fecha: D(20), por: 'Alejandro Reyes' },
      },
      formaPago: 'Contado',
      precioVenta: 320000,
      costo: 260000,
      anticipos: 320000,
      estatusFinanciero: 'Entregado',
      notasFinanzas: 'Liquidada. Comisión pagada.',
      credito: null,
      pagos: [{ _id: 'p-006-1', tipo: 'Liquidación', monto: 320000, ref: 'TRF-2847', fecha: D(15), por: 'Tania Orpinel' }],
      factura: { folio: 'WCB-2026-001', subtotal: 275862, iva: 44138, total: 320000, fecha: D(14), estatus: 'Emitida' },
      comision: { pct: 5, monto: 16000, estatus: 'Pagada' },
      historial: [
        { ts: D(25), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Llamada entrante — cliente solicitó información', icono: 'ti-phone-incoming' },
        { ts: D(23), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Visita agendada a la agencia', icono: 'ti-calendar' },
        { ts: D(22), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Prueba de manejo — VW Tiguan 2021', icono: 'ti-steering-wheel' },
        { ts: D(21), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Propuesta aceptada: $320,000 contado', icono: 'ti-check' },
        { ts: D(20), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'Expediente completo validado', icono: 'ti-file-check' },
        { ts: D(15), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Liquidación recibida $320,000 (TRF-2847)', icono: 'ti-cash' },
        { ts: D(14), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Factura WCB-2026-001 emitida', icono: 'ti-receipt' },
        { ts: D(14), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Vehículo entregado', icono: 'ti-key' },
        { ts: D(13), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Comisión de $16,000 pagada a Carlos Sánchez', icono: 'ti-coin' },
      ],
      fechaCreacion: D(25),
      ultimaActualizacion: D(13),
      actualizadoPor: 'Tania Orpinel',
      estatus: 'Ganado',
      ultimaActividad: D(13),
      _createdDate: D(25),
      origen: 'Llamada',
    },

    {
      _id: 'exp-007',
      nombre: 'Luis Ramírez',
      telefono: '4777654321',
      email: 'lramirez@empresa.com',
      sucursal: 'León',
      vendedorEmail: 'carlos@wecarsbajio.com',
      vendedorNombre: 'Carlos Sánchez',
      estatusCRM: 'Ganado',
      canal: 'Sitio web',
      ultimoContacto: D(8),
      notas: 'Contado. Venta rápida. Satisfecho con el proceso.',
      vehiculoBuscado: { marca: 'Honda', modelo: 'CR-V', anioDesde: 2021, kmMax: 40000, presupuesto: 400000, transmision: 'Automático', color: 'Gris' },
      vehiculoAsignado: { titulo: 'Honda CR-V Turbo 2022', precio: 390000, costo: 318000, _id: 'inv-007' },
      etapa: 'Postventa',
      documentos: {
        ine: { estatus: 'Validado', fecha: D(12), por: 'Alejandro Reyes' },
        comprobanteDomicilio: { estatus: 'Validado', fecha: D(12), por: 'Alejandro Reyes' },
        comprobanteIngresos: { estatus: 'N/A', fecha: D(12), por: 'Alejandro Reyes' },
        curp: { estatus: 'Validado', fecha: D(12), por: 'Alejandro Reyes' },
      },
      formaPago: 'Contado',
      precioVenta: 390000,
      costo: 318000,
      anticipos: 390000,
      estatusFinanciero: 'Entregado',
      notasFinanzas: '',
      credito: null,
      pagos: [{ _id: 'p-007-1', tipo: 'Liquidación', monto: 390000, ref: 'DEP-1023', fecha: D(8), por: 'Tania Orpinel' }],
      factura: { folio: 'WCB-2026-002', subtotal: 336207, iva: 53793, total: 390000, fecha: D(7), estatus: 'Emitida' },
      comision: { pct: 5, monto: 19500, estatus: 'Liberada' },
      historial: [
        { ts: D(15), area: 'CRM', usuario: 'Sistema', accion: 'Lead desde formulario del sitio web', icono: 'ti-world' },
        { ts: D(14), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Lead tomado y primer contacto realizado', icono: 'ti-hand-grab' },
        { ts: D(13), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Cita en agencia — cliente visitó el vehículo', icono: 'ti-calendar' },
        { ts: D(12), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'Documentación completa', icono: 'ti-file-check' },
        { ts: D(8), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Liquidación $390,000 recibida (DEP-1023)', icono: 'ti-cash' },
        { ts: D(7), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Factura WCB-2026-002 emitida', icono: 'ti-receipt' },
        { ts: D(7), area: 'Vendedores', usuario: 'Carlos Sánchez', accion: 'Entrega realizada', icono: 'ti-key' },
      ],
      fechaCreacion: D(15),
      ultimaActualizacion: D(7),
      actualizadoPor: 'Tania Orpinel',
      estatus: 'Ganado',
      ultimaActividad: D(7),
      _createdDate: D(15),
      origen: 'Sitio web',
    },

    /* ── SOFÍA MARTÍNEZ ── */
    {
      _id: 'exp-008',
      nombre: 'Juan Pérez',
      telefono: '4771112233',
      email: 'juan.perez@gmail.com',
      sucursal: 'León',
      vendedorEmail: 'sofia@wecarsbajio.com',
      vendedorNombre: 'Sofía Martínez',
      estatusCRM: 'En proceso',
      canal: 'Sitio web',
      ultimoContacto: D(3),
      notas: 'Crédito aprobado en Santander. Pendiente firmar contrato y subir documentos restantes.',
      vehiculoBuscado: { marca: 'Nissan', modelo: 'Kicks', anioDesde: 2023, kmMax: 30000, presupuesto: 430000, transmision: 'Automático', color: 'Azul' },
      vehiculoAsignado: { titulo: 'Nissan Kicks Exclusive 2024', precio: 420000, costo: 345000, _id: 'inv-008' },
      etapa: 'Compra',
      documentos: {
        ine: { estatus: 'Validado', fecha: D(5), por: 'Alejandro Reyes' },
        comprobanteDomicilio: { estatus: 'Validado', fecha: D(5), por: 'Alejandro Reyes' },
        comprobanteIngresos: { estatus: 'Validado', fecha: D(4), por: 'Alejandro Reyes' },
        curp: { estatus: 'Pendiente', fecha: '', por: '' },
      },
      formaPago: 'Crédito',
      precioVenta: 420000,
      costo: 345000,
      anticipos: 84000,
      estatusFinanciero: 'Aprobado',
      notasFinanzas: 'Crédito Santander aprobado por $336,000 a 36 meses. Tasa 12.9%. Firma pendiente.',
      credito: { banco: 'Santander', monto: 336000, plazo: 36, enganche: 84000, tasa: 12.9, estatus: 'Aprobado', notas: 'Aprobado el ' + new Date(Date.now() - 3 * 86400000).toLocaleDateString('es-MX') },
      pagos: [{ _id: 'p-008-1', tipo: 'Enganche', monto: 84000, ref: 'TRF-4012', fecha: D(5), por: 'Tania Orpinel' }],
      factura: null,
      comision: { pct: 5, monto: 21000, estatus: 'Liberada' },
      historial: [
        { ts: D(10), area: 'CRM', usuario: 'Sistema', accion: 'Lead desde sitio web', icono: 'ti-world' },
        { ts: D(9), area: 'Vendedores', usuario: 'Sofía Martínez', accion: 'Lead tomado — primer contacto por teléfono', icono: 'ti-phone' },
        { ts: D(8), area: 'Vendedores', usuario: 'Sofía Martínez', accion: 'Visita agendada para ver Nissan Kicks 2024', icono: 'ti-calendar' },
        { ts: D(7), area: 'Vendedores', usuario: 'Sofía Martínez', accion: 'Vehículo asignado: Nissan Kicks 2024', icono: 'ti-car' },
        { ts: D(5), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'INE y comprobante de domicilio validados', icono: 'ti-id-badge' },
        { ts: D(5), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Enganche de $84,000 recibido (TRF-4012)', icono: 'ti-cash' },
        { ts: D(4), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'Comprobante de ingresos validado', icono: 'ti-file-check' },
        { ts: D(3), area: 'Finanzas', usuario: 'Tania Orpinel', accion: '✅ Crédito APROBADO por Santander — $336,000 a 36 meses', icono: 'ti-building-bank' },
      ],
      fechaCreacion: D(10),
      ultimaActualizacion: D(3),
      actualizadoPor: 'Tania Orpinel',
      estatus: 'En proceso',
      ultimaActividad: D(3),
      _createdDate: D(10),
      origen: 'Sitio web',
    },

    {
      _id: 'exp-009',
      nombre: 'Patricia Vega',
      telefono: '4774567890',
      email: 'pvega@correo.com',
      sucursal: 'León',
      vendedorEmail: 'sofia@wecarsbajio.com',
      vendedorNombre: 'Sofía Martínez',
      estatusCRM: 'Seguimiento',
      canal: 'Facebook',
      ultimoContacto: D(2),
      notas: 'Muy interesada pero comparando precios. Crédito en trámite Banorte.',
      vehiculoBuscado: { marca: 'Kia', modelo: 'Sportage', anioDesde: 2022, kmMax: 35000, presupuesto: 350000, transmision: 'Automático', color: 'Blanco Perla' },
      vehiculoAsignado: null,
      etapa: 'Credito',
      documentos: {
        ine: { estatus: 'Recibido', fecha: D(3), por: '' },
        comprobanteDomicilio: { estatus: 'Pendiente', fecha: '', por: '' },
        comprobanteIngresos: { estatus: 'Pendiente', fecha: '', por: '' },
        curp: { estatus: 'Pendiente', fecha: '', por: '' },
      },
      formaPago: 'Crédito',
      precioVenta: 0,
      costo: 0,
      anticipos: 0,
      estatusFinanciero: 'En proceso',
      notasFinanzas: '',
      credito: { banco: 'Banorte', monto: 272000, plazo: 48, enganche: 68000, tasa: 13.2, estatus: 'En trámite', notas: 'Falta comprobante de ingresos' },
      pagos: [],
      factura: null,
      comision: null,
      historial: [
        { ts: D(8), area: 'CRM', usuario: 'Sistema', accion: 'Lead desde Facebook Ads', icono: 'ti-brand-facebook' },
        { ts: D(7), area: 'Vendedores', usuario: 'Sofía Martínez', accion: 'Lead tomado y primer contacto', icono: 'ti-hand-grab' },
        { ts: D(6), area: 'Vendedores', usuario: 'Sofía Martínez', accion: 'Presentación de opciones de vehículos', icono: 'ti-car' },
        { ts: D(3), area: 'Administración', usuario: 'Alejandro Reyes', accion: 'INE recibida — pendiente validación', icono: 'ti-id-badge' },
        { ts: D(2), area: 'Finanzas', usuario: 'Tania Orpinel', accion: 'Solicitud de crédito enviada a Banorte', icono: 'ti-building-bank' },
      ],
      fechaCreacion: D(8),
      ultimaActualizacion: D(2),
      actualizadoPor: 'Tania Orpinel',
      estatus: 'Contactado',
      ultimaActividad: D(2),
      _createdDate: D(8),
      origen: 'Facebook',
    },

  ]; // end EXPEDIENTES

  /* ── Filtrar por rol y permisos ────────────────────────────────────────
     Vendedor: ve leads sin asignar + sus propios clientes
     Gerencia/Admin/Finanzas: ven todos
  ─────────────────────────────────────────────────────────────────────── */
  function filtrarPorRol(expedientes, rol, emailUsuario) {
    if (!rol || rol === 'Gerencia' || rol === 'Administración' || rol === 'Finanzas') {
      return expedientes;
    }
    // Vendedor: sin asignar ó asignados a mí
    return expedientes.filter(e =>
      !e.vendedorEmail || e.vendedorEmail === emailUsuario
    );
  }

  /* ── Próximo paso sugerido ──────────────────────────────────────────── */
  function siguientePaso(exp) {
    const etapas = {
      Lead: { label: 'Asignar vendedor', area: 'Vendedores', icono: 'ti-hand-grab' },
      Seguimiento: { label: 'Hacer seguimiento al cliente', area: 'Vendedores', icono: 'ti-phone' },
      Documentacion: { label: 'Completar documentación', area: 'Administración', icono: 'ti-file-upload' },
      Credito: { label: 'Gestionar aprobación de crédito', area: 'Finanzas', icono: 'ti-building-bank' },
      Compra: { label: 'Asignar vehículo y firmar contrato', area: 'Vendedores', icono: 'ti-car' },
      Facturacion: { label: 'Emitir factura', area: 'Finanzas', icono: 'ti-receipt' },
      Entrega: { label: 'Realizar entrega del vehículo', area: 'Vendedores', icono: 'ti-key' },
      Postventa: { label: 'Seguimiento postventa', area: 'Vendedores', icono: 'ti-star' },
    };
    return etapas[exp.etapa] || { label: '—', area: '', icono: 'ti-dots' };
  }

  /* ── BroadcastChannel — sincronización en tiempo real ──────────────────
     Permite que los paneles abiertos en distintas pestañas se actualicen
     automáticamente cuando cualquier otro panel hace un cambio.
     En producción (Wix), esto se implementa vía Velo + Wix Realtime.
  ─────────────────────────────────────────────────────────────────────── */
  class WeCarsBC {
    constructor(panel) {
      this.panel = panel || 'desconocido';
      this._handlers = [];
      try {
        this.ch = new BroadcastChannel('wecars-erp-v2');
        this.ch.onmessage = (ev) => {
          const msg = ev.data;
          if (!msg || !msg.type) return;
          this._handlers.forEach(fn => fn(msg));
        };
      } catch (e) {
        this.ch = null;
        console.warn('[weCars] BroadcastChannel no disponible — sync desactivado');
      }
    }

    /** Suscribirse a cambios de otros paneles */
    on(fn) { this._handlers.push(fn); }

    /** Emitir un cambio al resto de paneles */
    emit(type, payload) {
      if (!this.ch) return;
      this.ch.postMessage({
        type,
        _from: this.panel,
        _ts: new Date().toISOString(),
        ...payload,
      });
    }

    /* Helpers de emit */
    expedienteActualizado(exp, usuarioCambio) {
      this.emit('expediente-actualizado', { expediente: exp, usuario: usuarioCambio || this.panel });
    }
    pagoRegistrado(pago, expediente) {
      this.emit('pago-registrado', { pago, clienteId: expediente._id, clienteNombre: expediente.nombre, vendedor: expediente.vendedorNombre });
    }
    creditoActualizado(creditoData, expediente) {
      this.emit('credito-actualizado', { ...creditoData, clienteId: expediente._id, clienteNombre: expediente.nombre, vendedor: expediente.vendedorNombre });
    }
    comisionLiberada(data) {
      this.emit('comision-liberada', data);
    }
    documentoValidado(doc, expediente) {
      this.emit('documento-validado', { documento: doc, clienteId: expediente._id, clienteNombre: expediente.nombre, vendedor: expediente.vendedorNombre });
    }
    tareaCreada(tarea) {
      this.emit('tarea-creada', { tarea });
    }
    facturaEmitida(factura, expediente) {
      this.emit('factura-emitida', { factura, clienteId: expediente._id, clienteNombre: expediente.nombre, vendedor: expediente.vendedorNombre });
    }

    destroy() {
      if (this.ch) this.ch.close();
    }
  }

  /* ── Formatters compartidos ─────────────────────────────────────────── */
  const formatters = {
    money: v => v || v === 0 ? '$' + Number(v).toLocaleString('es-MX') : '—',
    date: f => {
      if (!f) return '—';
      const d = new Date(f);
      if (isNaN(d)) return '—';
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    hora: f => {
      if (!f) return '';
      const d = new Date(f);
      if (isNaN(d)) return '';
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    },
    diasDesde: f => {
      if (!f) return 0;
      return Math.floor((Date.now() - new Date(f).getTime()) / 86400000);
    },
    iniciales: (nombre, email) => {
      const b = (nombre || '').trim();
      if (b) { const p = b.split(/\s+/); return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || b[0].toUpperCase(); }
      return (email || '?')[0].toUpperCase();
    },
    etapaColor: (etapa) => ({
      Lead: '#d97706', Seguimiento: '#2a78d6', Documentacion: '#7c3aed',
      Credito: '#e24b4a', Compra: '#70cf05', Facturacion: '#1a9e62',
      Entrega: '#1a9e62', Postventa: '#6d7a83',
    }[etapa] || '#6d7a83'),
    docEstatus: (est) => ({
      Pendiente: { color: '#d97706', bg: '#fef3c7', icono: 'ti-clock' },
      Recibido: { color: '#2a78d6', bg: '#ebf3fe', icono: 'ti-eye' },
      Validado: { color: '#1a9e62', bg: '#e6f7f0', icono: 'ti-circle-check' },
      'N/A': { color: '#6d7a83', bg: '#f1f4f5', icono: 'ti-minus' },
    }[est] || { color: '#6d7a83', bg: '#f1f4f5', icono: 'ti-question-mark' }),
  };

  /* ── Exponer globalmente ─────────────────────────────────────────────── */
  window.WeCarsData = {
    EXPEDIENTES,
    WeCarsBC,
    filtrarPorRol,
    siguientePaso,
    fmt: formatters,
    version: '2.0.0',
  };

  console.log('[weCars ERP] Sistema inicializado — ' + EXPEDIENTES.length + ' expedientes cargados');
})();
