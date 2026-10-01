#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera CSVs de datos ficticios para el CMS de weCars Bajío."""
import csv, os, random
from datetime import datetime, timedelta

OUT = os.path.dirname(os.path.abspath(__file__))

def fecha(dias_atras):
    d = datetime.now() - timedelta(days=dias_atras)
    return d.strftime("%Y-%m-%d")

# ─────────────────────────────────────────
# 1. USUARIOS (Empleados)
# ─────────────────────────────────────────
usuarios = [
    {"_id":"u001","nombre":"Carlos Mendoza","email":"cmendoza@wecars.mx","telefono":"4771234567","rol":"vendedor","estatus":"activo","fechaIngreso":fecha(400),"avatar":""},
    {"_id":"u002","nombre":"Sofía Ramírez","email":"sramirez@wecars.mx","telefono":"4772345678","rol":"vendedor","estatus":"activo","fechaIngreso":fecha(310),"avatar":""},
    {"_id":"u003","nombre":"Diego Torres","email":"dtorres@wecars.mx","telefono":"4773456789","rol":"vendedor","estatus":"activo","fechaIngreso":fecha(200),"avatar":""},
    {"_id":"u004","nombre":"Alejandra Vega","email":"avega@wecars.mx","telefono":"4774567890","rol":"gerente","estatus":"activo","fechaIngreso":fecha(600),"avatar":""},
    {"_id":"u005","nombre":"Marco Jiménez","email":"mjimenez@wecars.mx","telefono":"4775678901","rol":"finanzas","estatus":"activo","fechaIngreso":fecha(500),"avatar":""},
]
with open(f"{OUT}/Usuarios.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=usuarios[0].keys()); w.writeheader(); w.writerows(usuarios)
print("✓ Usuarios.csv")

# ─────────────────────────────────────────
# 2. CARS (Inventario)
# ─────────────────────────────────────────
autos = [
    # Kia
    {"_id":"c001","marca":"Kia","modelo":"Sportage","año":2023,"version":"EX Plus","color":"Blanco Nieve","km":12000,"precio":485000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"Un solo dueño, factura original, sin choques, garantía de agencia vigente.","fotos":""},
    {"_id":"c002","marca":"Kia","modelo":"Sportage","año":2022,"version":"LX","color":"Gris Metálico","km":34000,"precio":410000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"Excelente estado, mantenimientos al corriente, llantas nuevas.","fotos":""},
    {"_id":"c003","marca":"Kia","modelo":"Forte","año":2023,"version":"GTS","color":"Rojo Pasión","km":8500,"precio":360000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"Sedán","descripcion":"Prácticamente nuevo, bluetooth, pantalla táctil, cámara de reversa.","fotos":""},
    {"_id":"c004","marca":"Kia","modelo":"Seltos","año":2024,"version":"EX+","color":"Azul Eléctrico","km":3200,"precio":520000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"Modelo 2024 recién llegado, tecnología de punta, asientos de piel.","fotos":""},
    # Nissan
    {"_id":"c005","marca":"Nissan","modelo":"Altima","año":2023,"version":"Advance","color":"Blanco Perla","km":18000,"precio":440000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"Sedán","descripcion":"Motor 2.5L, asientos de piel, pantalla 8 pulgadas, cámara 360°.","fotos":""},
    {"_id":"c006","marca":"Nissan","modelo":"Altima","año":2022,"version":"Sense","color":"Negro Onix","km":42000,"precio":375000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"Sedán","descripcion":"Financiamiento disponible, mantenimientos en distribuidor Nissan.","fotos":""},
    {"_id":"c007","marca":"Nissan","modelo":"Kicks","año":2024,"version":"Exclusive","color":"Naranja Urban","km":5100,"precio":455000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"SUV","descripcion":"ProPilot Assist, techo panorámico, bocinas Bose, 6 airbags.","fotos":""},
    {"_id":"c008","marca":"Nissan","modelo":"Versa","año":2023,"version":"Advance","color":"Azul Marino","km":21000,"precio":285000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"Sedán","descripcion":"Ideal para la ciudad, bajo consumo, carrocería sin golpes.","fotos":""},
    {"_id":"c009","marca":"Nissan","modelo":"Frontier","año":2022,"version":"PRO-4X","color":"Gris Titan","km":55000,"precio":590000,"estatus":"disponible","combustible":"Diesel","transmision":"Automática","carroceria":"Pickup","descripcion":"4x4, equipo off-road de fábrica, caja de herramientas, rolladera.","fotos":""},
    # Mazda
    {"_id":"c010","marca":"Mazda","modelo":"CX-5","año":2023,"version":"Grand Touring","color":"Rojo Soul","km":14000,"precio":545000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"i-ACTIV AWD, Mazda Connect, asientos calefaccionados, HUD.","fotos":""},
    {"_id":"c011","marca":"Mazda","modelo":"CX-5","año":2022,"version":"Sport","color":"Blanco Cristal","km":38000,"precio":470000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"Muy bien mantenido, sin accidentes, llanta de refacción sin uso.","fotos":""},
    {"_id":"c012","marca":"Mazda","modelo":"Mazda3","año":2023,"version":"Carbon Edition","color":"Gris Poliéster","km":9800,"precio":420000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"Hatchback","descripcion":"Edición especial, rines 18\", interior de piel Nappa, sonido premium.","fotos":""},
    {"_id":"c013","marca":"Mazda","modelo":"CX-30","año":2024,"version":"Grand Touring","color":"Azul Polaris","km":2100,"precio":510000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"2024 de agencia, garantía 5 años, G-Vectoring Plus.","fotos":""},
    # Toyota
    {"_id":"c014","marca":"Toyota","modelo":"Corolla","año":2023,"version":"LE","color":"Blanco Platino","km":17000,"precio":390000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"Sedán","descripcion":"Toyota Safety Sense, pantalla 8\", Apple CarPlay inalámbrico.","fotos":""},
    {"_id":"c015","marca":"Toyota","modelo":"Camry","año":2022,"version":"XSE","color":"Negro Magnético","km":29000,"precio":510000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"Sedán","descripcion":"V6 3.5L, modo Sport, asientos deportivos ventilados, JBL audio.","fotos":""},
    # VW
    {"_id":"c016","marca":"Volkswagen","modelo":"Jetta","año":2023,"version":"Comfortline","color":"Plata Reflex","km":23000,"precio":375000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"Sedán","descripcion":"Motor turbo 1.4L, Compose media, sensores de estacionamiento.","fotos":""},
    {"_id":"c017","marca":"Volkswagen","modelo":"Tiguan","año":2022,"version":"Comfortline","color":"Gris Limestone","km":31000,"precio":490000,"estatus":"disponible","combustible":"Gasolina","transmision":"DSG","carroceria":"SUV","descripcion":"7 asientos, techo corredizo panorámico, cámara trasera 180°.","fotos":""},
    # Honda
    {"_id":"c018","marca":"Honda","modelo":"HR-V","año":2023,"version":"Touring","color":"Rojo Lunar","km":11000,"precio":465000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"SUV","descripcion":"Magic Seat, Honda Sensing, Bose 8 bocinas, carga inalámbrica.","fotos":""},
    {"_id":"c019","marca":"Honda","modelo":"CR-V","año":2022,"version":"Turbo Plus","color":"Azul Obsidiana","km":44000,"precio":515000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"SUV","descripcion":"Turbo 1.5L, espacio de carga amplio, techo panorámico doble.","fotos":""},
    # Chevrolet
    {"_id":"c020","marca":"Chevrolet","modelo":"Equinox","año":2023,"version":"Premier","color":"Blanco Artic","km":19000,"precio":450000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"Wi-Fi integrado, pantalla 8\", OnStar 4G, cámara de visión trasera.","fotos":""},
]
# Agregar 20 más con estatus vendido/apartado para historial
extras = [
    {"_id":"c021","marca":"Kia","modelo":"Sportage","año":2021,"version":"EX","color":"Verde Jungle","km":68000,"precio":360000,"estatus":"vendido","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"","fotos":""},
    {"_id":"c022","marca":"Nissan","modelo":"Sentra","año":2022,"version":"Advance","color":"Gris Metálico","km":51000,"precio":285000,"estatus":"vendido","combustible":"Gasolina","transmision":"CVT","carroceria":"Sedán","descripcion":"","fotos":""},
    {"_id":"c023","marca":"Mazda","modelo":"CX-9","año":2021,"version":"Grand Touring","color":"Plateado","km":72000,"precio":620000,"estatus":"vendido","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"","fotos":""},
    {"_id":"c024","marca":"Toyota","modelo":"RAV4","año":2022,"version":"XLE","color":"Blanco","km":39000,"precio":580000,"estatus":"vendido","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"","fotos":""},
    {"_id":"c025","marca":"Honda","modelo":"Civic","año":2023,"version":"Touring","color":"Rojo","km":14000,"precio":410000,"estatus":"vendido","combustible":"Gasolina","transmision":"CVT","carroceria":"Sedán","descripcion":"","fotos":""},
    {"_id":"c026","marca":"Volkswagen","modelo":"Polo","año":2023,"version":"Comfortline","color":"Azul","km":22000,"precio":298000,"estatus":"apartado","combustible":"Gasolina","transmision":"Automática","carroceria":"Hatchback","descripcion":"","fotos":""},
    {"_id":"c027","marca":"Kia","modelo":"Soul","año":2022,"version":"EX","color":"Naranja","km":41000,"precio":325000,"estatus":"vendido","combustible":"Gasolina","transmision":"Automática","carroceria":"Hatchback","descripcion":"","fotos":""},
    {"_id":"c028","marca":"Nissan","modelo":"X-Trail","año":2023,"version":"Exclusive","color":"Negro","km":9000,"precio":520000,"estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"SUV","descripcion":"3 filas de asientos, tecnología ProPilot.","fotos":""},
    {"_id":"c029","marca":"Mazda","modelo":"MX-5","año":2023,"version":"Grand Touring","color":"Rojo Soul","km":6500,"precio":610000,"estatus":"disponible","combustible":"Gasolina","transmision":"Manual","carroceria":"Convertible","descripcion":"Edición especial Miata, capota de tela, Brembo, Recaro.","fotos":""},
    {"_id":"c030","marca":"Chevrolet","modelo":"Trax","año":2024,"version":"Premier","color":"Gris","km":4200,"precio":395000,"estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV","descripcion":"Rediseño 2024, pantalla 11\", Google integrado.","fotos":""},
]
autos += extras
with open(f"{OUT}/Cars.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=autos[0].keys()); w.writeheader(); w.writerows(autos)
print("✓ Cars.csv")

# ─────────────────────────────────────────
# 3. CLIENTES (ClientRecords)
# ─────────────────────────────────────────
clientes = [
    {"_id":"cl001","nombre":"María González Pérez","email":"mgonzalez@gmail.com","telefono":"4771112233","ciudad":"León","ocupacion":"Médico","ingresosMensuales":55000,"vendedorId":"u001","estatus":"activo","fechaRegistro":fecha(45),"notas":"Interesada en SUV para familia, tiene 2 hijos."},
    {"_id":"cl002","nombre":"Roberto Hernández Silva","email":"rhernandez@hotmail.com","telefono":"4772223344","ciudad":"Guanajuato","ocupacion":"Ingeniero","ingresosMensuales":42000,"vendedorId":"u001","estatus":"activo","fechaRegistro":fecha(30),"notas":"Busca sedán ejecutivo, prefiere financiamiento a 48 meses."},
    {"_id":"cl003","nombre":"Laura Martínez López","email":"lmartinez@yahoo.com","telefono":"4773334455","ciudad":"Irapuato","ocupacion":"Empresaria","ingresosMensuales":85000,"vendedorId":"u002","estatus":"activo","fechaRegistro":fecha(20),"notas":"Pago de contado, quiere auto de lujo."},
    {"_id":"cl004","nombre":"Javier Sánchez Mora","email":"jsanchez@gmail.com","telefono":"4774445566","ciudad":"León","ocupacion":"Contador","ingresosMensuales":35000,"vendedorId":"u002","estatus":"activo","fechaRegistro":fecha(15),"notas":"Primer auto, presupuesto ajustado, necesita seguro incluido."},
    {"_id":"cl005","nombre":"Patricia Flores Ruiz","email":"pflores@empresa.mx","telefono":"4775556677","ciudad":"Salamanca","ocupacion":"Directora Comercial","ingresosMensuales":72000,"vendedorId":"u003","estatus":"activo","fechaRegistro":fecha(12),"notas":"Quiere cambiar su Jetta 2019 por algo más nuevo."},
    {"_id":"cl006","nombre":"Miguel Ángel Torres Gómez","email":"matorres@gmail.com","telefono":"4776667788","ciudad":"León","ocupacion":"Médico","ingresosMensuales":95000,"vendedorId":"u001","estatus":"activo","fechaRegistro":fecha(8),"notas":"Interesado en Mazda CX-5 o Toyota RAV4, necesita espacio."},
    {"_id":"cl007","nombre":"Ana Lucía Vega Morales","email":"alvega@outlook.com","telefono":"4777778899","ciudad":"Celaya","ocupacion":"Profesora universitaria","ingresosMensuales":28000,"vendedorId":"u003","estatus":"activo","fechaRegistro":fecha(5),"notas":"Busca auto económico para ir al trabajo, sin lujos."},
    {"_id":"cl008","nombre":"Fernando Cruz Delgado","email":"fcruz@negocio.com","telefono":"4778889900","ciudad":"León","ocupacion":"Empresario","ingresosMensuales":120000,"vendedorId":"u002","estatus":"convertido","fechaRegistro":fecha(60),"notas":"Compró Kia Sportage, muy satisfecho. Posible referido de su hermano."},
    {"_id":"cl009","nombre":"Carolina Reyes Jiménez","email":"creyes@gmail.com","telefono":"4779990011","ciudad":"León","ocupacion":"Diseñadora","ingresosMensuales":32000,"vendedorId":"u001","estatus":"convertido","fechaRegistro":fecha(90),"notas":"Compró Nissan Versa de contado."},
    {"_id":"cl010","nombre":"Arturo Mendoza Castillo","email":"amendoza@hotmail.com","telefono":"4770001122","ciudad":"Guanajuato","ocupacion":"Abogado","ingresosMensuales":65000,"vendedorId":"u003","estatus":"activo","fechaRegistro":fecha(3),"notas":"Muy exigente con detalles, quiere historial de mantenimiento."},
    {"_id":"cl011","nombre":"Valeria Ochoa Peña","email":"vochoa@gmail.com","telefono":"4771122334","ciudad":"León","ocupacion":"Nutrióloga","ingresosMensuales":38000,"vendedorId":"u002","estatus":"activo","fechaRegistro":fecha(7),"notas":"Quiere algo práctico y seguro, tiene bebé."},
    {"_id":"cl012","nombre":"Ernesto Vargas Ríos","email":"evargas@correo.mx","telefono":"4772233445","ciudad":"Silao","ocupacion":"Gerente de planta","ingresosMensuales":78000,"vendedorId":"u001","estatus":"perdido","fechaRegistro":fecha(120),"notas":"Se fue a otra agencia. Quería descuento mayor."},
]
with open(f"{OUT}/ClientRecords.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=clientes[0].keys()); w.writeheader(); w.writerows(clientes)
print("✓ ClientRecords.csv")

# ─────────────────────────────────────────
# 4. OPORTUNIDADES (Opportunities)
# ─────────────────────────────────────────
opps = [
    {"_id":"op001","clienteId":"cl001","vendedorId":"u001","autoId":"c001","interes":"Kia Sportage 2023","etapa":"negociacion","monto":485000,"probabilidad":70,"fechaCreacion":fecha(25),"fechaEstimadaCierre":fecha(-10),"notas":"Pide descuento de 15k. Casi cerrado."},
    {"_id":"op002","clienteId":"cl002","vendedorId":"u001","autoId":"c005","interes":"Nissan Altima 2023","etapa":"presentacion","monto":440000,"probabilidad":40,"fechaCreacion":fecha(18),"fechaEstimadaCierre":fecha(-5),"notas":"Cotizó también en AutoMac. Necesita respuesta rápida."},
    {"_id":"op003","clienteId":"cl003","vendedorId":"u002","autoId":"c010","interes":"Mazda CX-5 Grand Touring","etapa":"cierre","monto":545000,"probabilidad":90,"fechaCreacion":fecha(10),"fechaEstimadaCierre":fecha(-2),"notas":"Pago de contado confirmado. Esperando factura."},
    {"_id":"op004","clienteId":"cl004","vendedorId":"u002","autoId":"c008","interes":"Nissan Versa","etapa":"calificacion","monto":285000,"probabilidad":30,"fechaCreacion":fecha(12),"fechaEstimadaCierre":fecha(-20),"notas":"Necesita revisar capacidad de crédito con su banco."},
    {"_id":"op005","clienteId":"cl005","vendedorId":"u003","autoId":"c016","interes":"Volkswagen Jetta 2023","etapa":"negociacion","monto":375000,"probabilidad":60,"fechaCreacion":fecha(8),"fechaEstimadaCierre":fecha(-7),"notas":"Ofrece Jetta 2019 como parte de pago, valuado en 210k."},
    {"_id":"op006","clienteId":"cl006","vendedorId":"u001","autoId":"c010","interes":"Mazda CX-5 / CX-30","etapa":"presentacion","monto":520000,"probabilidad":50,"fechaCreacion":fecha(6),"fechaEstimadaCierre":fecha(-15),"notas":"Duda entre CX-5 y CX-30. Quiere prueba de manejo."},
    {"_id":"op007","clienteId":"cl007","vendedorId":"u003","autoId":"c008","interes":"Nissan Versa o Kia Forte","etapa":"calificacion","monto":290000,"probabilidad":35,"fechaCreacion":fecha(4),"fechaEstimadaCierre":fecha(-25),"notas":"Presupuesto muy ajustado. Revisando financiamiento."},
    {"_id":"op008","clienteId":"cl010","vendedorId":"u003","autoId":"c012","interes":"Mazda3 Carbon Edition","etapa":"negociacion","monto":420000,"probabilidad":65,"fechaCreacion":fecha(2),"fechaEstimadaCierre":fecha(-12),"notas":"Quiere ver historial de mantenimiento completo."},
    {"_id":"op009","clienteId":"cl011","vendedorId":"u002","autoId":"c007","interes":"Nissan Kicks 2024","etapa":"presentacion","monto":455000,"probabilidad":45,"fechaCreacion":fecha(5),"fechaEstimadaCierre":fecha(-18),"notas":"Le encantó el Kicks, preguntó por garantía extendida."},
]
with open(f"{OUT}/Opportunities.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=opps[0].keys()); w.writeheader(); w.writerows(opps)
print("✓ Opportunities.csv")

# ─────────────────────────────────────────
# 5. VENTAS (Ventas)
# ─────────────────────────────────────────
ventas = [
    {"_id":"v001","clienteId":"cl008","vendedorId":"u001","autoId":"c021","auto":"Kia Sportage 2021","precioVenta":360000,"enganche":72000,"saldoFinanciado":288000,"tipoVenta":"credito","plazoMeses":48,"fechaVenta":fecha(60),"estatus":"completada","notasVenta":"Financiamiento HSBC aprobado en 24h."},
    {"_id":"v002","clienteId":"cl009","vendedorId":"u001","autoId":"c022","auto":"Nissan Sentra 2022","precioVenta":285000,"enganche":285000,"saldoFinanciado":0,"tipoVenta":"contado","plazoMeses":0,"fechaVenta":fecha(90),"estatus":"completada","notasVenta":"Pago efectivo completo. Entrega inmediata."},
    {"_id":"v003","clienteId":"cl003","vendedorId":"u002","autoId":"c023","auto":"Mazda CX-9 2021","precioVenta":620000,"enganche":124000,"saldoFinanciado":496000,"tipoVenta":"credito","plazoMeses":60,"fechaVenta":fecha(45),"estatus":"completada","notasVenta":"Financiamiento Banorte. Muy buena experiencia."},
    {"_id":"v004","clienteId":"cl004","vendedorId":"u003","autoId":"c024","auto":"Toyota RAV4 2022","precioVenta":580000,"enganche":116000,"saldoFinanciado":464000,"tipoVenta":"credito","plazoMeses":48,"fechaVenta":fecha(30),"estatus":"completada","notasVenta":"Auto para empresa, necesita factura a nombre de LLC."},
    {"_id":"v005","clienteId":"cl006","vendedorId":"u002","autoId":"c025","auto":"Honda Civic 2023","precioVenta":410000,"enganche":82000,"saldoFinanciado":328000,"tipoVenta":"credito","plazoMeses":36,"fechaVenta":fecha(15),"estatus":"completada","notasVenta":"Buen prospecto. Posiblemente regrese por camioneta."},
    {"_id":"v006","clienteId":"cl005","vendedorId":"u003","autoId":"c027","auto":"Kia Soul 2022","precioVenta":325000,"enganche":65000,"saldoFinanciado":260000,"tipoVenta":"credito","plazoMeses":36,"fechaVenta":fecha(7),"estatus":"completada","notasVenta":"Aceptó Jetta 2019 como parte de pago."},
]
with open(f"{OUT}/Ventas.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=ventas[0].keys()); w.writeheader(); w.writerows(ventas)
print("✓ Ventas.csv")

# ─────────────────────────────────────────
# 6. CRÉDITOS (Creditos)
# ─────────────────────────────────────────
creditos = [
    {"_id":"cr001","clienteId":"cl008","ventaId":"v001","banco":"HSBC","montoAprobado":288000,"tasa":12.5,"plazoMeses":48,"mensualidad":7200,"estatus":"activo","fechaAprobacion":fecha(58),"fechaPrimerPago":fecha(50)},
    {"_id":"cr002","clienteId":"cl003","ventaId":"v003","banco":"Banorte","montoAprobado":496000,"tasa":11.8,"plazoMeses":60,"mensualidad":11100,"estatus":"activo","fechaAprobacion":fecha(43),"fechaPrimerPago":fecha(35)},
    {"_id":"cr003","clienteId":"cl004","ventaId":"v004","banco":"BBVA","montoAprobado":464000,"tasa":13.2,"plazoMeses":48,"mensualidad":12500,"estatus":"activo","fechaAprobacion":fecha(28),"fechaPrimerPago":fecha(20)},
    {"_id":"cr004","clienteId":"cl006","ventaId":"v005","banco":"Santander","montoAprobado":328000,"tasa":12.0,"plazoMeses":36,"mensualidad":10900,"estatus":"activo","fechaAprobacion":fecha(13),"fechaPrimerPago":fecha(5)},
    {"_id":"cr005","clienteId":"cl001","ventaId":"","banco":"Banamex","montoAprobado":400000,"tasa":11.5,"plazoMeses":48,"mensualidad":10400,"estatus":"preaprobado","fechaAprobacion":fecha(2),"fechaPrimerPago":""},
]
with open(f"{OUT}/Creditos.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=creditos[0].keys()); w.writeheader(); w.writerows(creditos)
print("✓ Creditos.csv")

# ─────────────────────────────────────────
# 7. ACTIVIDADES (Activities)
# ─────────────────────────────────────────
actividades = [
    {"_id":"a001","clienteId":"cl001","vendedorId":"u001","tipo":"llamada","descripcion":"Primera llamada. Cliente interesada en Sportage 2023. Agendó visita para el sábado.","fecha":fecha(25),"duracion":15},
    {"_id":"a002","clienteId":"cl001","vendedorId":"u001","tipo":"visita","descripcion":"Visita a la agencia. Prueba de manejo del Sportage. Le gustó mucho, pide descuento de 15k.","fecha":fecha(20),"duracion":90},
    {"_id":"a003","clienteId":"cl001","vendedorId":"u001","tipo":"whatsapp","descripcion":"Envió cotización formal por WhatsApp. Precio final 475,000. Esperando respuesta.","fecha":fecha(18),"duracion":5},
    {"_id":"a004","clienteId":"cl002","vendedorId":"u001","tipo":"llamada","descripcion":"Cliente solicitó cotización por Instagram. Se le llamó para agendar visita.","fecha":fecha(18),"duracion":20},
    {"_id":"a005","clienteId":"cl002","vendedorId":"u001","tipo":"visita","descripcion":"Visita. Comparó Altima vs Camry. Se inclina por Altima. Regresa con esposa.","fecha":fecha(14),"duracion":60},
    {"_id":"a006","clienteId":"cl003","vendedorId":"u002","tipo":"llamada","descripcion":"Cliente confirmó pago de contado. Pidió factura para siguiente semana.","fecha":fecha(5),"duracion":12},
    {"_id":"a007","clienteId":"cl005","vendedorId":"u003","tipo":"whatsapp","descripcion":"Envió fotos de su Jetta 2019 para valuación. Le cotizamos 210k.","fecha":fecha(8),"duracion":0},
    {"_id":"a008","clienteId":"cl005","vendedorId":"u003","tipo":"visita","descripcion":"Trajo el Jetta para valuación física. Acordado parte de pago. Firma este viernes.","fecha":fecha(4),"duracion":45},
    {"_id":"a009","clienteId":"cl006","vendedorId":"u001","tipo":"email","descripcion":"Enviada ficha técnica completa de CX-5 y CX-30. Solicitó prueba de manejo para el lunes.","fecha":fecha(6),"duracion":0},
    {"_id":"a010","clienteId":"cl007","vendedorId":"u003","tipo":"llamada","descripcion":"Lead de Facebook. Estudiante universitaria, primero de su familia en comprar auto.","fecha":fecha(4),"duracion":25},
    {"_id":"a011","clienteId":"cl010","vendedorId":"u003","tipo":"visita","descripcion":"Llegó sin cita. Muy interesado en Mazda3 Carbon. Pidió historial completo del auto.","fecha":fecha(2),"duracion":50},
    {"_id":"a012","clienteId":"cl011","vendedorId":"u002","tipo":"whatsapp","descripcion":"Preguntó por garantía del Kicks. Se le envió brochure de garantía Nissan 5 años.","fecha":fecha(5),"duracion":0},
]
with open(f"{OUT}/Activities.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=actividades[0].keys()); w.writeheader(); w.writerows(actividades)
print("✓ Activities.csv")

# ─────────────────────────────────────────
# 8. LEADS (ALeads)
# ─────────────────────────────────────────
leads = [
    {"_id":"l001","nombre":"Pedro Alvarado Nava","email":"palvarado@gmail.com","telefono":"4771234001","fuente":"Facebook","interes":"Kia Sportage","presupuesto":450000,"fecha":fecha(3),"estatus":"nuevo","vendedorId":"","notas":""},
    {"_id":"l002","nombre":"Gabriela Núñez Salas","email":"gnunez@hotmail.com","telefono":"4772234002","fuente":"Instagram","interes":"Mazda CX-30","presupuesto":510000,"fecha":fecha(2),"estatus":"nuevo","vendedorId":"","notas":""},
    {"_id":"l003","nombre":"Héctor Ramírez Domínguez","email":"hramirez@outlook.com","telefono":"4773234003","fuente":"Mercado Libre","interes":"Nissan X-Trail","presupuesto":500000,"fecha":fecha(1),"estatus":"nuevo","vendedorId":"","notas":""},
    {"_id":"l004","nombre":"Isabella Morales Campos","email":"imorales@gmail.com","telefono":"4774234004","fuente":"Referido (cl008)","interes":"Nissan Kicks o similar","presupuesto":460000,"fecha":fecha(1),"estatus":"nuevo","vendedorId":"","notas":"La recomendó Fernando Cruz."},
    {"_id":"l005","nombre":"Luis Ángel Reina Vargas","email":"lreina@gmail.com","telefono":"4775234005","fuente":"Google Ads","interes":"Sedan económico","presupuesto":300000,"fecha":fecha(0),"estatus":"nuevo","vendedorId":"","notas":""},
]
with open(f"{OUT}/ALeads.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=leads[0].keys()); w.writeheader(); w.writerows(leads)
print("✓ ALeads.csv")

# ─────────────────────────────────────────
# 9. PAGOS (nueva colección)
# ─────────────────────────────────────────
pagos = [
    {"_id":"p001","clienteId":"cl008","ventaId":"v001","concepto":"Enganche Kia Sportage","monto":72000,"tipo":"ingreso","fecha":fecha(60),"metodo":"transferencia","referencia":"TRF2024001"},
    {"_id":"p002","clienteId":"cl009","ventaId":"v002","concepto":"Pago total contado Nissan Sentra","monto":285000,"tipo":"ingreso","fecha":fecha(90),"metodo":"cheque","referencia":"CHQ2024001"},
    {"_id":"p003","clienteId":"cl003","ventaId":"v003","concepto":"Enganche Mazda CX-9","monto":124000,"tipo":"ingreso","fecha":fecha(45),"metodo":"transferencia","referencia":"TRF2024002"},
    {"_id":"p004","clienteId":"cl004","ventaId":"v004","concepto":"Enganche Toyota RAV4","monto":116000,"tipo":"ingreso","fecha":fecha(30),"metodo":"efectivo","referencia":"EFT2024001"},
    {"_id":"p005","clienteId":"cl006","ventaId":"v005","concepto":"Enganche Honda Civic","monto":82000,"tipo":"ingreso","fecha":fecha(15),"metodo":"transferencia","referencia":"TRF2024003"},
    {"_id":"p006","clienteId":"","ventaId":"","concepto":"Publicidad Facebook Ads — Julio","monto":15000,"tipo":"egreso","fecha":fecha(5),"metodo":"tarjeta","referencia":"FB2024JUL"},
    {"_id":"p007","clienteId":"","ventaId":"","concepto":"Servicios de limpieza y detailing","monto":8500,"tipo":"egreso","fecha":fecha(10),"metodo":"efectivo","referencia":"DET2024007"},
    {"_id":"p008","clienteId":"","ventaId":"","concepto":"Comisiones vendedores Junio","monto":42000,"tipo":"egreso","fecha":fecha(20),"metodo":"transferencia","referencia":"COM2024JUN"},
    {"_id":"p009","clienteId":"cl005","ventaId":"v006","concepto":"Enganche Kia Soul (parte de pago)","monto":65000,"tipo":"ingreso","fecha":fecha(7),"metodo":"traspaso","referencia":"TP2024001"},
    {"_id":"p010","clienteId":"","ventaId":"","concepto":"Renta local agencia — Julio","monto":28000,"tipo":"egreso","fecha":fecha(1),"metodo":"transferencia","referencia":"RENTA2024JUL"},
]
with open(f"{OUT}/Pagos.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=pagos[0].keys()); w.writeheader(); w.writerows(pagos)
print("✓ Pagos.csv")

# ─────────────────────────────────────────
# 10. COMISIONES (nueva colección)
# ─────────────────────────────────────────
comisiones = [
    {"_id":"com001","vendedorId":"u001","vendedor":"Carlos Mendoza","clienteId":"cl008","ventaId":"v001","autoVendido":"Kia Sportage 2021","montoVenta":360000,"pct":1.5,"monto":5400,"estatus":"pagada","fechaVenta":fecha(60),"fechaPago":fecha(55)},
    {"_id":"com002","vendedorId":"u001","vendedor":"Carlos Mendoza","clienteId":"cl009","ventaId":"v002","autoVendido":"Nissan Sentra 2022","montoVenta":285000,"pct":1.5,"monto":4275,"estatus":"pagada","fechaVenta":fecha(90),"fechaPago":fecha(85)},
    {"_id":"com003","vendedorId":"u002","vendedor":"Sofía Ramírez","clienteId":"cl003","ventaId":"v003","autoVendido":"Mazda CX-9 2021","montoVenta":620000,"pct":1.5,"monto":9300,"estatus":"pagada","fechaVenta":fecha(45),"fechaPago":fecha(40)},
    {"_id":"com004","vendedorId":"u003","vendedor":"Diego Torres","clienteId":"cl004","ventaId":"v004","autoVendido":"Toyota RAV4 2022","montoVenta":580000,"pct":1.5,"monto":8700,"estatus":"pagada","fechaVenta":fecha(30),"fechaPago":fecha(25)},
    {"_id":"com005","vendedorId":"u002","vendedor":"Sofía Ramírez","clienteId":"cl006","ventaId":"v005","autoVendido":"Honda Civic 2023","montoVenta":410000,"pct":1.5,"monto":6150,"estatus":"pendiente","fechaVenta":fecha(15),"fechaPago":""},
    {"_id":"com006","vendedorId":"u003","vendedor":"Diego Torres","clienteId":"cl005","ventaId":"v006","autoVendido":"Kia Soul 2022","montoVenta":325000,"pct":1.5,"monto":4875,"estatus":"pendiente","fechaVenta":fecha(7),"fechaPago":""},
]
with open(f"{OUT}/Comisiones.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=comisiones[0].keys()); w.writeheader(); w.writerows(comisiones)
print("✓ Comisiones.csv")

# ─────────────────────────────────────────
# 11. SOLICITUDES DE COMPRA (nueva colección)
# ─────────────────────────────────────────
solicitudes = [
    {"_id":"sc001","vendedorId":"u001","vendedor":"Carlos Mendoza","clienteId":"cl001","marca":"Kia","modelo":"Sportage","año":2023,"version":"EX Plus","colorPreferido":"Blanco o Gris","presupuestoMax":490000,"estatus":"buscando","fechaSolicitud":fecha(15),"notas":"Cliente aprobó crédito Banamex. Urgente encontrar unidad."},
    {"_id":"sc002","vendedorId":"u002","vendedor":"Sofía Ramírez","clienteId":"cl011","marca":"Nissan","modelo":"Kicks","año":2024,"version":"Exclusive","colorPreferido":"cualquiera excepto rojo","presupuestoMax":460000,"estatus":"encontrado","fechaSolicitud":fecha(8),"notas":"Se encontró unidad en inventario c007. Pendiente cierre."},
    {"_id":"sc003","vendedorId":"u003","vendedor":"Diego Torres","clienteId":"cl006","marca":"Mazda","modelo":"CX-5","año":2023,"version":"Grand Touring","colorPreferido":"Rojo Soul","presupuestoMax":550000,"estatus":"buscando","fechaSolicitud":fecha(5),"notas":"Cliente prefiere Rojo Soul. Revisando disponibilidad con distribuidores."},
]
with open(f"{OUT}/SolicitudesCompra.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=solicitudes[0].keys()); w.writeheader(); w.writerows(solicitudes)
print("✓ SolicitudesCompra.csv")

# ─────────────────────────────────────────
# 12. FACTURAS (Facturas)
# ─────────────────────────────────────────
facturas = [
    {"_id":"f001","clienteId":"cl008","ventaId":"v001","folio":"WCB-2024-001","rfc":"HERC800101AB1","razonSocial":"Roberto Hernández Cruz","monto":360000,"iva":57600,"total":417600,"fechaEmision":fecha(58),"estatus":"timbrada","uuid":"UUID-001-PLACEHOLDER","xmlUrl":"","pdfUrl":""},
    {"_id":"f002","clienteId":"cl009","ventaId":"v002","folio":"WCB-2024-002","rfc":"REGM900215CD2","razonSocial":"Carolina Reyes García Morales","monto":285000,"iva":45600,"total":330600,"fechaEmision":fecha(88),"estatus":"timbrada","uuid":"UUID-002-PLACEHOLDER","xmlUrl":"","pdfUrl":""},
    {"_id":"f003","clienteId":"cl003","ventaId":"v003","folio":"WCB-2024-003","rfc":"MALP750310EF3","razonSocial":"Laura Martínez López","monto":620000,"iva":99200,"total":719200,"fechaEmision":fecha(43),"estatus":"timbrada","uuid":"UUID-003-PLACEHOLDER","xmlUrl":"","pdfUrl":""},
    {"_id":"f004","clienteId":"cl004","ventaId":"v004","folio":"WCB-2024-004","rfc":"SAMJ850520GH4","razonSocial":"Javier Sánchez Mora","monto":580000,"iva":92800,"total":672800,"fechaEmision":fecha(28),"estatus":"timbrada","uuid":"UUID-004-PLACEHOLDER","xmlUrl":"","pdfUrl":""},
    {"_id":"f005","clienteId":"cl006","ventaId":"v005","folio":"WCB-2024-005","rfc":"TOTG901108IJ5","razonSocial":"Miguel Ángel Torres Gómez","monto":410000,"iva":65600,"total":475600,"fechaEmision":fecha(13),"estatus":"timbrada","uuid":"UUID-005-PLACEHOLDER","xmlUrl":"","pdfUrl":""},
]
with open(f"{OUT}/Facturas.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.DictWriter(f,fieldnames=facturas[0].keys()); w.writeheader(); w.writerows(facturas)
print("✓ Facturas.csv")

print("\n✅ Todos los CSVs generados en:", OUT)
print("   Archivos listos para importar en Wix CMS (Dataset Import).")
