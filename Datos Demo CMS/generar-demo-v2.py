#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera CSVs de demostración v2 — weCars Bajío
Datos de presentación: alto volumen, ventas reales, márgenes visibles.
"""
import csv, os, random
from datetime import datetime, timedelta

OUT = os.path.dirname(os.path.abspath(__file__))

# IDs REALES de Wix (confirmados por el usuario)
ID_EDUARDO  = "3e027843-3e39-44c9-8e33-adc48b5ec45d"
EMAIL_EDUARDO = "Brandonu446@gmail.com"
NOMBRE_EDUARDO = "Brandon Eduardo Zuñiga"

ID_WECARS   = "7cc6241e-e93a-4704-8da3-bea04ffecd51"
EMAIL_WECARS = "op.wecars@gmail.com"
NOMBRE_WECARS = "weCars Bajío"

def f(dias):
    """Fecha absoluta: hoy - dias."""
    return (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")

def fhoy():
    return datetime.now().strftime("%Y-%m-%d")

def csv_write(name, rows):
    path = f"{OUT}/{name}.csv"
    with open(path, "w", newline="", encoding="utf-8-sig") as fp:
        w = csv.DictWriter(fp, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)
    print(f"✓ {name}.csv  ({len(rows)} registros)")

# ─────────────────────────────────────────────────────────────
# CARS — Inventario con los 5 autos vendidos + disponibles
# ─────────────────────────────────────────────────────────────
cars = [
    # ── VENDIDOS ESTE MES (los 5 reales) ────────────────────
    {"_id":"car-lobo","marca":"Ford","modelo":"Lobo","año":2022,"version":"Raptor",
     "color":"Gris Magnético","km":28000,"precio":1000000,
     "costoAdquisicion":865000,"utilidad":135000,"pctUtilidad":15.6,
     "estatus":"vendido","combustible":"Gasolina","transmision":"Automática","carroceria":"Pickup",
     "descripcion":"Ford Lobo Raptor 2022, equipada al máximo. Motor EcoBoost V6 3.5L biturbo 450hp. Fox Racing shocks, techo panorámico, Bang & Olufsen 18 bocinas, asientos calefaccionados y ventilados. Un solo dueño, factura original, sin accidentes.",
     "fotos":""},
    {"_id":"car-sportage","marca":"Kia","modelo":"Sportage","año":2018,"version":"EX Premium",
     "color":"Blanco Perla","km":62000,"precio":220000,
     "costoAdquisicion":192000,"utilidad":28000,"pctUtilidad":12.7,
     "estatus":"vendido","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV",
     "descripcion":"Kia Sportage 2018 EX Premium, panorámico, cuero, cámara 360, sensores, llantas nuevas. Todo al corriente.",
     "fotos":""},
    {"_id":"car-altima","marca":"Nissan","modelo":"Altima","año":2018,"version":"Advance",
     "color":"Negro Onix","km":74000,"precio":190000,
     "costoAdquisicion":165000,"utilidad":25000,"pctUtilidad":13.2,
     "estatus":"vendido","combustible":"Gasolina","transmision":"CVT",
     "carroceria":"Sedán",
     "descripcion":"Nissan Altima 2018 Advance. Motor 2.5L, pantalla 8\", cámara trasera, Apple CarPlay. En perfectas condiciones, mantenimientos en agencia.",
     "fotos":""},
    {"_id":"car-mazda3","marca":"Mazda","modelo":"Mazda3","año":2019,"version":"iSport",
     "color":"Rojo Soul","km":55000,"precio":210000,
     "costoAdquisicion":183000,"utilidad":27000,"pctUtilidad":14.8,
     "estatus":"vendido","combustible":"Gasolina","transmision":"Automática",
     "carroceria":"Hatchback",
     "descripcion":"Mazda3 2019 hatchback Rojo Soul. G-Vectoring, rines 18\", Mazda Connect, CarPlay. Sin golpes ni pintura.",
     "fotos":""},
    {"_id":"car-peugeot","marca":"Peugeot","modelo":"Partner","año":2017,"version":"Active",
     "color":"Blanco","km":91000,"precio":165000,
     "costoAdquisicion":143000,"utilidad":22000,"pctUtilidad":13.3,
     "estatus":"vendido","combustible":"Diesel","transmision":"Manual",
     "carroceria":"Van",
     "descripcion":"Peugeot Partner 2017 diesel, ideal para empresa o carga. Motor BlueHDi económico, caja grande, segunda fila de asientos. Documentos en orden.",
     "fotos":""},
    # ── DISPONIBLES (para mostrar inventario activo) ─────────
    {"_id":"car-s001","marca":"Kia","modelo":"Sportage","año":2023,"version":"EX Plus",
     "color":"Blanco Nieve","km":12000,"precio":485000,
     "costoAdquisicion":418000,"utilidad":67000,"pctUtilidad":13.8,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV",
     "descripcion":"Un solo dueño, garantía de agencia vigente, factura original.","fotos":""},
    {"_id":"car-s002","marca":"Nissan","modelo":"Altima","año":2023,"version":"Advance",
     "color":"Blanco Perla","km":18000,"precio":440000,
     "costoAdquisicion":382000,"utilidad":58000,"pctUtilidad":13.2,
     "estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"Sedán",
     "descripcion":"Motor 2.5L, pantalla 8\", cámara 360°, asientos de piel.","fotos":""},
    {"_id":"car-s003","marca":"Mazda","modelo":"CX-5","año":2023,"version":"Grand Touring",
     "color":"Rojo Soul","km":14000,"precio":545000,
     "costoAdquisicion":470000,"utilidad":75000,"pctUtilidad":13.8,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV",
     "descripcion":"AWD, asientos calefaccionados, Head-Up Display, Bose audio.","fotos":""},
    {"_id":"car-s004","marca":"Ford","modelo":"Lobo","año":2021,"version":"Lariat",
     "color":"Azul Marino","km":45000,"precio":720000,
     "costoAdquisicion":622000,"utilidad":98000,"pctUtilidad":13.6,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"Pickup",
     "descripcion":"V8 5.0L, 4x4, caja corta, paquete Lariat Sport. Excelente estado.","fotos":""},
    {"_id":"car-s005","marca":"Volkswagen","modelo":"Tiguan","año":2022,"version":"Comfortline",
     "color":"Gris Limestone","km":31000,"precio":490000,
     "costoAdquisicion":424000,"utilidad":66000,"pctUtilidad":13.5,
     "estatus":"disponible","combustible":"Gasolina","transmision":"DSG","carroceria":"SUV",
     "descripcion":"7 asientos, techo panorámico, cámara trasera 180°.","fotos":""},
    {"_id":"car-s006","marca":"Toyota","modelo":"Camry","año":2022,"version":"XSE",
     "color":"Negro Magnético","km":29000,"precio":510000,
     "costoAdquisicion":440000,"utilidad":70000,"pctUtilidad":13.7,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"Sedán",
     "descripcion":"V6 3.5L Sport, JBL audio, asientos ventilados.","fotos":""},
    {"_id":"car-s007","marca":"Honda","modelo":"CR-V","año":2023,"version":"Touring",
     "color":"Rojo Lunar","km":11000,"precio":535000,
     "costoAdquisicion":462000,"utilidad":73000,"pctUtilidad":13.6,
     "estatus":"disponible","combustible":"Gasolina","transmision":"CVT","carroceria":"SUV",
     "descripcion":"Turbo 1.5L, Honda Sensing, carga inalámbrica, Bose audio.","fotos":""},
    {"_id":"car-s008","marca":"Nissan","modelo":"Frontier","año":2023,"version":"PRO-4X",
     "color":"Gris Titan","km":8000,"precio":620000,
     "costoAdquisicion":536000,"utilidad":84000,"pctUtilidad":13.5,
     "estatus":"disponible","combustible":"Diesel","transmision":"Automática","carroceria":"Pickup",
     "descripcion":"4x4, off-road factory, rolladera, winch, 6 airbags.","fotos":""},
    {"_id":"car-s009","marca":"Mazda","modelo":"CX-30","año":2024,"version":"Grand Touring",
     "color":"Azul Polaris","km":2100,"precio":510000,
     "costoAdquisicion":440000,"utilidad":70000,"pctUtilidad":13.7,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV",
     "descripcion":"2024 de agencia, garantía 5 años, G-Vectoring Plus.","fotos":""},
    {"_id":"car-s010","marca":"Chevrolet","modelo":"Equinox","año":2023,"version":"Premier",
     "color":"Blanco Ártico","km":19000,"precio":450000,
     "costoAdquisicion":389000,"utilidad":61000,"pctUtilidad":13.6,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV",
     "descripcion":"Wi-Fi integrado, pantalla 8\", OnStar 4G.","fotos":""},
    {"_id":"car-s011","marca":"Kia","modelo":"Seltos","año":2024,"version":"EX+",
     "color":"Azul Eléctrico","km":3200,"precio":520000,
     "costoAdquisicion":449000,"utilidad":71000,"pctUtilidad":13.6,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV",
     "descripcion":"2024, tecnología de punta, asientos de piel, techo panorámico.","fotos":""},
    {"_id":"car-s012","marca":"BMW","modelo":"Serie 3","año":2021,"version":"320i Sport",
     "color":"Blanco Alpino","km":38000,"precio":620000,
     "costoAdquisicion":536000,"utilidad":84000,"pctUtilidad":13.5,
     "estatus":"disponible","combustible":"Gasolina","transmision":"Automática","carroceria":"Sedán",
     "descripcion":"Motor TwinPower Turbo, asientos M Sport, techo panorámico, CarPlay.","fotos":""},
    {"_id":"car-a001","marca":"Toyota","modelo":"RAV4","año":2020,"version":"XLE",
     "color":"Plata","km":58000,"precio":395000,
     "costoAdquisicion":342000,"utilidad":53000,"pctUtilidad":13.4,
     "estatus":"apartado","combustible":"Gasolina","transmision":"Automática","carroceria":"SUV",
     "descripcion":"Apartado — cliente en proceso de crédito.","fotos":""},
    {"_id":"car-a002","marca":"Honda","modelo":"HR-V","año":2022,"version":"Touring",
     "color":"Rojo","km":22000,"precio":430000,
     "costoAdquisicion":372000,"utilidad":58000,"pctUtilidad":13.5,
     "estatus":"apartado","combustible":"Gasolina","transmision":"CVT","carroceria":"SUV",
     "descripcion":"Apartado — cliente firma esta semana.","fotos":""},
]
csv_write("Cars", cars)

# ─────────────────────────────────────────────────────────────
# CLIENTES — 80 clientes, embudo impresionante con razones reales
# Distribución: 15 Nuevo · 8 Contactado · 47 En proceso · 5 Ganado · 5 Perdido
# ─────────────────────────────────────────────────────────────
nombres = [
    ("Alejandro","Fuentes Mora"),("Daniela","Reyes Castillo"),
    ("Ricardo","Olvera Blanco"),("Sofía","Gutiérrez Nava"),
    ("Héctor","Sánchez Peña"),("Valeria","Cruz López"),
    ("Fernando","Herrera Vega"),("Mariana","Domínguez Ruiz"),
    ("Eduardo","Salinas Torres"),("Lupita","Ramírez Orozco"),
    ("José Luis","Vargas Medina"),("Gabriela","Ochoa Pérez"),
    ("Carlos","Mendoza Ríos"),("Andrea","Flores Jiménez"),
    ("Roberto","Núñez Casas"),("Paola","Ibarra Sandoval"),
    ("Arturo","León Espinoza"),("Claudia","Méndez Salas"),
    ("Javier","Guerrero Alba"),("Diana","Contreras Mora"),
    ("Miguel","Acosta Ríos"),("Elena","Barrera Soto"),
    ("Sergio","Villanueva Díaz"),("Patricia","Aguilar Noriega"),
    ("Tomás","Espinoza Fuentes"),("Lorena","Delgado Vargas"),
    ("Armando","Cisneros López"),("Natalia","Morales Blanco"),
    ("Gustavo","Salazar Peña"),("Cristina","Jiménez Rueda"),
    ("Rubén","Castro Vela"),("Alejandra","Montes García"),
    ("Omar","Hernández Cruz"),("Rebeca","Torres Campos"),
    ("Iván","Robles Alvarado"),("Luz María","Soto Medina"),
    ("David","Quiroz Rivas"),("Fernanda","Leal Moreno"),
    ("Enrique","Palacios Ruiz"),("Beatriz","Santana Vega"),
    # +40 clientes adicionales para volumen
    ("Alfonso","Guerrero Ríos"),("Silvia","Navarro Peña"),
    ("Benjamín","Ramos Cruz"),("Rocío","Elizondo García"),
    ("Gerardo","Padilla Soto"),("Verónica","Montoya Blanco"),
    ("Ignacio","Reyna Vargas"),("Susana","Alonso Torres"),
    ("Ernesto","Cabrera Díaz"),("Alicia","Peralta Ruiz"),
    ("Ramón","Guzmán López"),("Irene","Solís Medina"),
    ("Braulio","Aguilar Fuentes"),("Adriana","Vázquez Ríos"),
    ("Leandro","Ibáñez Mora"),("Margarita","Cervantes Salas"),
    ("Teodoro","Espino Nava"),("Yolanda","Orozco Vega"),
    ("Pascual","Trujillo Castro"),("Lidia","Serna Campos"),
    ("Arcadio","Mendez Alba"),("Esperanza","Lara Ortiz"),
    ("Nemesio","Quiroga Rueda"),("Concepción","Villanueva Ponce"),
    ("Rodolfo","Estrada Bravo"),("Amparo","Fonseca Téllez"),
    ("Aurelio","Salcedo Reyes"),("Hortensia","Barrios Méndez"),
    ("Celestino","Paredes Ibarra"),("Celia","Valdés Castañeda"),
    ("Abundio","Ríos Guerrero"),("Refugio","Tapia Noriega"),
    ("Marcelino","Cárdenas Peña"),("Dolores","Esquivel Mora"),
    ("Porfirio","Alvarado Soto"),("Josefina","Téllez Fuentes"),
    ("Anacleto","Cruz Vargas"),("Perpetua","Moreno Salinas"),
    ("Macario","Ibarra López"),("Serafina","Canales Díaz"),
]
ocupaciones = ["Médico","Ingeniero","Empresario","Contador","Directora Comercial","Abogado",
               "Arquitecto","Nutrióloga","Gerente de planta","Docente universitario",
               "Diseñador","Administrador","Enfermero","Piloto","Físico","Dentista",
               "Veterinario","Psicólogo","Consultor","Agente de seguros"]
ciudades = ["León","León","León","Guanajuato","Irapuato","Silao","Celaya","Salamanca","San Miguel de Allende","León"]
ingresos = [28000,35000,38000,42000,48000,55000,65000,72000,80000,95000,110000,130000]
intereses = [
    "Kia Sportage 2023","Nissan Altima 2023","Mazda CX-5","Ford Lobo Lariat",
    "Toyota RAV4","Honda CR-V","VW Tiguan","BMW Serie 3",
    "Kia Seltos","Chevrolet Equinox","Nissan Frontier","Mazda CX-30"
]
vendedores_email = [EMAIL_EDUARDO, EMAIL_WECARS, EMAIL_EDUARDO, EMAIL_WECARS, EMAIL_EDUARDO]

# Razones de pérdida realistas
razones_perdido = [
    "PERDIDO — Buró de crédito con observaciones. No calificó en ningún banco. Se le recomendó limpiar su historial y regresar en 6 meses.",
    "PERDIDO — El modelo que buscaba (Kia Seltos 2024 azul eléctrico) no está disponible en León. No acepta otro color ni modelo alternativo.",
    "PERDIDO — Buró manchado, deuda activa en buró. Sin opciones de financiamiento. Caso cerrado.",
    "PERDIDO — El cliente buscaba Ford Bronco Sport 2023 en específico. No tenemos unidades en León ni en plaza cercana. Se fue a otro distribuidor.",
    "PERDIDO — Revisión de buró reveló adeudo en SAT y dos tarjetas en cartera vencida. Sin opciones de financiamiento. Descartado.",
]

notas_activos = [
    "Interesado en financiamiento, tiene auto para dejar en toma.",
    "Pago de contado, necesita factura a nombre de empresa.",
    "Quiere hacer parte de pago con su auto actual (Jetta 2018).",
    "Muy calificado, pre-aprobado por Kuna por $420k.",
    "Urgente — necesita el auto esta semana para trabajo de campo.",
    "Busca SUV familiar, tiene 2 hijos, le importa mucho la garantía.",
    "Referido de cliente satisfecho. Llega muy confiado y motivado.",
    "Viene a segunda visita, está casi decidido, solo compara precio.",
    "Quiere financiamiento a 48 meses con enganche del 20%.",
    "Interesado en Lobo pickup, lo necesita para negocio de construcción.",
    "Primera vez que compra auto seminuevo. Muy receptivo al asesoramiento.",
    "Tiene presupuesto definido. No quiere salirse de su rango de precio.",
]

# Índices de ventas cerradas (GANADO)
idx_ganados = {0, 2, 4, 6, 8}
# Índices de Perdidos (5 perdidos con razones)
idx_perdidos = {15, 22, 30, 37, 44}
# Índices de Contactado (solo 8 — llegaron hace poco, próximos a trabajar)
idx_contactado = {5, 7, 17, 19, 55, 65, 70, 75}
# Índices de Nuevo (solo 15 — llegaron esta semana)
idx_nuevo = {9, 21, 23, 39, 43, 47, 49, 58, 60, 62, 64, 66, 68, 72, 76}
# Resto = En proceso (pipeline activo)

clientes = []
for i, (nom, apat) in enumerate(nombres):
    if i >= 80:
        break
    if i in idx_ganados:
        estatus = "Ganado"
        notas = "Cliente satisfecho. Venta completada este mes."
    elif i in idx_perdidos:
        estatus = "Perdido"
        notas = razones_perdido[list(idx_perdidos).index(i) % len(razones_perdido)]
    elif i in idx_contactado:
        estatus = "Contactado"
        notas = notas_activos[(i + 3) % len(notas_activos)]
    elif i in idx_nuevo:
        estatus = "Nuevo"
        notas = notas_activos[(i + 1) % len(notas_activos)]
    else:
        estatus = "En proceso"
        notas = notas_activos[i % len(notas_activos)]

    vendedor_email = vendedores_email[i % len(vendedores_email)]
    ingreso = ingresos[i % len(ingresos)]
    origenes_pool = ["Facebook Ads","Facebook Ads","Facebook Ads","Instagram","Instagram",
                     "Google Ads","MercadoLibre","Referido","WhatsApp directo","Sitio web",
                     "Llamada entrante","Expo Auto"]
    tipos_auto_pool = ["SUV","SUV","SUV","Pickup","Pickup","Sedán","Sedán",
                       "Hatchback","Van","Compacto","Lujo","SUV"]
    nom_slug = nom.lower().replace(' ','.').replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u').replace('ñ','n')
    # ultimaActividad: en proceso → 0-1 días, contactado → 1-2 días, nuevo → hoy, ganado/perdido → más viejo
    if estatus == "En proceso":
        dias_ult = random.randint(0, 1)
    elif estatus == "Contactado":
        dias_ult = random.randint(1, 2)
    elif estatus in ("Ganado", "Perdido"):
        dias_ult = random.randint(5, 20)
    else:  # Nuevo
        dias_ult = 0

    clientes.append({
        "_id": f"cl{i+1:03d}",
        "nombre": f"{nom} {apat}",
        "email": f"{nom_slug}{i+1}@gmail.com",
        "telefono": f"477{random.randint(1000000,9999999)}",
        "ciudad": ciudades[i % len(ciudades)],
        "ocupacion": ocupaciones[i % len(ocupaciones)],
        "ingresosMensuales": ingreso,
        "vendedorAsignado": vendedor_email,
        "estatus": estatus,
        "origen": origenes_pool[i % len(origenes_pool)],
        "tipoInteres": tipos_auto_pool[i % len(tipos_auto_pool)],
        "fechaRegistro": f(random.randint(0, 28)),
        "ultimaActividad": f(dias_ult),
        "interes": intereses[i % len(intereses)],
        "presupuesto": ingreso * random.randint(4, 8),
        "notas": notas,
    })
csv_write("ClientRecords", clientes)

# ─────────────────────────────────────────────────────────────
# VENTAS — las 5 reales
# ─────────────────────────────────────────────────────────────
ventas = [
    {"_id":"v001","clienteId":"cl001","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "autoId":"car-lobo","auto":"Ford Lobo Raptor 2022",
     "precioVenta":1000000,"costoAdquisicion":950000,"utilidadBruta":50000,"pctUtilidad":5.0,
     "enganche":200000,"saldoFinanciado":800000,"tipoVenta":"credito","plazoMeses":60,
     "fechaVenta":f(8),"estatus":"completada",
     "notasVenta":"Financiamiento Scotiabank aprobado en 48h. Cliente muy satisfecho, deja Dodge Ram 2019 en toma valuada en $280,000."},
    {"_id":"v002","clienteId":"cl003","vendedorId":ID_WECARS,"vendedor":NOMBRE_WECARS,
     "autoId":"f2f725bd-4d3d-4be5-bd3b-a26bfcc66067","auto":"Kia Sportage 2018 EX Premium",
     "precioVenta":299400,"costoAdquisicion":264400,"utilidadBruta":35000,"pctUtilidad":11.7,
     "enganche":44000,"saldoFinanciado":176000,"tipoVenta":"credito","plazoMeses":36,
     "fechaVenta":f(5),"estatus":"completada",
     "notasVenta":"Financiamiento Kuna. Dejó Nissan March 2016 en toma valuada en $72,000."},
    {"_id":"v003","clienteId":"cl005","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "autoId":"0cca6be9-881e-4153-a48e-bf1d5d0e259a","auto":"Nissan Altima 2018 Advance",
     "precioVenta":210000,"costoAdquisicion":185000,"utilidadBruta":25000,"pctUtilidad":11.9,
     "enganche":210000,"saldoFinanciado":0,"tipoVenta":"contado","plazoMeses":0,
     "fechaVenta":f(12),"estatus":"completada",
     "notasVenta":"Pago de contado completo. Cliente profesionista, compra para su hija."},
    {"_id":"v004","clienteId":"cl007","vendedorId":ID_WECARS,"vendedor":NOMBRE_WECARS,
     "autoId":"car-mazda3","auto":"Mazda 3 2019 iSport Hatchback",
     "precioVenta":280000,"costoAdquisicion":243600,"utilidadBruta":36400,"pctUtilidad":13.0,
     "enganche":280000,"saldoFinanciado":0,"tipoVenta":"contado","plazoMeses":0,
     "fechaVenta":f(15),"estatus":"completada",
     "notasVenta":"Pago efectivo. Muy rápida la negociación, 1 visita y cerró."},
    {"_id":"v005","clienteId":"cl009","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "autoId":"car-peugeot","auto":"Peugeot Partner 2017 Active Diesel",
     "precioVenta":130000,"costoAdquisicion":100000,"utilidadBruta":30000,"pctUtilidad":23.1,
     "enganche":130000,"saldoFinanciado":0,"tipoVenta":"contado","plazoMeses":0,
     "fechaVenta":f(18),"estatus":"completada",
     "notasVenta":"Pago de contado. Cliente empresa — compra para su negocio de distribución."},
]
csv_write("Ventas", ventas)

# ─────────────────────────────────────────────────────────────
# 100 LEADS
# ─────────────────────────────────────────────────────────────
nombres_leads = [
    "Pedro Alvarado","Gabriela Núñez","Héctor Ramírez","Isabella Morales","Luis Reina",
    "Sandra Vega","Mauricio Ríos","Concepción Leal","Ernesto Valdez","Yolanda Bravo",
    "Francisco Ponce","Leticia Espinosa","Aurelio Tapia","Norma Garza","Benjamín Ruiz",
    "Celia Montes","Hilario Cruz","Esperanza Ávila","Rodrigo Cisneros","Minerva Salas",
    "Gilberto Peña","Rocío Aguilera","Isidro Campos","Carmen Delgado","Baltazar Fuentes",
    "Delia Mendoza","Porfirio Salinas","Gloria Ortiz","Celestino Vargas","Amalia Ibarra",
    "Zacarías Herrera","Consuelo Naranjo","Tadeo Guerrero","Pilar Acosta","Leobardo Soto",
    "Refugio Luna","Wenceslao Flores","Soledad Paredes","Gumersindo Medina","Rosalba Cano",
    "Serafín Téllez","Zenaida Castellanos","Amado Rojas","Ofelia Barón","Nicanor Reyes",
    "Perpetua Díaz","Filemón Guzmán","Catalina Trejo","Sotero Ramos","Dolores Cárdenas",
    "Jacinto Mora","Micaela Estrada","Próspero Orozco","Benita Arriaga","Desiderio Nava",
    "Marcelina Sandoval","Abundio Rivera","Teodora Carrillo","Servando Espejo","Aurelia Loza",
    "Nepomuceno Quiroz","Facunda Torres","Eustaquio Vela","Obdulia Cervantes","Cástulo Prado",
    "Natividad Serrano","Cleto Villanueva","Prudencia Uribe","Anatolio Pedraza","Sabina Núñez",
    "Basilio Esquivel","Nieves Padilla","Benigno Colón","Victorina Almaraz","Anacleto Salgado",
    "Nazaria Blanco","Genovevo Fuentes","Margarita Téllez","Herculano Vázquez","Epifania Ríos",
    "Abundancio Cruz","Bonifacia León","Primitivo Meza","Maravillas Rojo","Crescencio Alonso",
    "Felicísima Gutiérrez","Pantaleón Montoya","Encarnación Silva","Valerio Mendoza","Angélica Reyes",
    "Teófilo Jiménez","Purificación Castro","Agapito Morales","Estanislaa Flores","Dámaso Espinoza",
    "Brígida Acosta","Crescenciano Nava","Magdalena Ríos","Isidoro Guerrero","Filomena Gómez",
]
fuentes_leads = ["Facebook Ads"]*30 + ["Instagram"]*20 + ["Google Ads"]*15 + ["MercadoLibre"]*12 + \
                ["Referido"]*10 + ["WhatsApp directo"]*7 + ["Sitio web"]*4 + ["Expo Auto"]*2
random.shuffle(fuentes_leads)
intereses_leads = ["Kia Sportage","Nissan Altima","Mazda CX-5","Ford Lobo","Toyota RAV4",
                   "Honda CR-V","VW Tiguan","Nissan Frontier","Kia Seltos","BMW Serie 3",
                   "Mazda 3","Chevrolet Equinox","Honda HR-V","Nissan Kicks","Mazda CX-30"]
leads = []
for i, nombre in enumerate(nombres_leads[:100]):
    leads.append({
        "_id": f"lead{i+1:03d}",
        "nombre": nombre,
        "email": f"lead{i+1}@wecars-demo.mx",
        "telefono": f"477{random.randint(1000000,9999999)}",
        "fuente": fuentes_leads[i % len(fuentes_leads)],
        "interes": intereses_leads[i % len(intereses_leads)],
        "presupuesto": random.choice([180000,220000,280000,350000,420000,480000,550000,650000,900000]),
        "fecha": f(random.randint(0, 28)),
        "estatus": random.choice(["Nuevo","Contactado","Contactado","Contactado"]),
        "vendedorId": random.choice([ID_EDUARDO, ID_WECARS]),
        "notas": "",
    })
csv_write("ALeads", leads)

# ─────────────────────────────────────────────────────────────
# OPORTUNIDADES — pipeline activo con tomas incluidas
# ─────────────────────────────────────────────────────────────
opp_data = [
    # (clienteId, vendedorId, vendedorEmail, autoId, interes, etapa, monto, prob%, diasAnte, notas)
    ("cl002",ID_EDUARDO,EMAIL_EDUARDO,"car-s001","Kia Sportage 2023","Documentación",485000,85,3,"Listo para firmar esta semana. Tiene Jetta 2019 en toma valuado $215k."),
    ("cl004",ID_WECARS,EMAIL_WECARS,"car-s002","Nissan Altima 2023","Negociación",440000,65,7,"Pide descuento de $10k. Viene con su esposa el sábado."),
    ("cl006",ID_EDUARDO,EMAIL_EDUARDO,"car-s003","Mazda CX-5 2023","Cita agendada",545000,45,10,"Segunda visita. Tiene Versa 2018 para toma ~$95k."),
    ("cl008",ID_WECARS,EMAIL_WECARS,"car-s004","Ford Lobo 2021 Lariat","Negociación",720000,70,5,"Ofrece Toyota Hilux 2020 en toma valuada $380k. Casi cerrado."),
    ("cl010",ID_EDUARDO,EMAIL_EDUARDO,"car-s005","VW Tiguan 2022","Contactado",490000,30,14,"Primer contacto. Muy interesado. Pre-aprobado Kuna $450k."),
    ("cl012",ID_WECARS,EMAIL_WECARS,"car-s006","Toyota Camry 2022","Cita agendada",510000,50,9,"Duda entre Camry y CR-V. Tiene Focus 2019 para toma."),
    ("cl014",ID_EDUARDO,EMAIL_EDUARDO,"car-s007","Honda CR-V 2023","Crédito / Pago",535000,72,4,"Enganche de $100k listo. Aprobación de crédito Atria en proceso."),
    ("cl016",ID_WECARS,EMAIL_WECARS,"car-a001","Toyota RAV4 2020","Entregado",395000,90,2,"APARTADO. Firma mañana. Crédito Scotiabank aprobado."),
    ("cl018",ID_EDUARDO,EMAIL_EDUARDO,"car-a002","Honda HR-V 2022","Documentación",430000,88,1,"APARTADO. Enganche entregado. Contrato listo."),
    ("cl020",ID_WECARS,EMAIL_WECARS,"car-s008","Nissan Frontier PRO-4X","Cita agendada",620000,40,12,"Empresario. Quiere para su rancho. Tiene Ram 2018 en toma ~$320k."),
    ("cl022",ID_EDUARDO,EMAIL_EDUARDO,"car-s009","Mazda CX-30 2024","Contactado",510000,35,16,"Joven profesionista. Primer auto propio. Crédito solicitado."),
    ("cl024",ID_WECARS,EMAIL_WECARS,"car-s010","Chevrolet Equinox 2023","Negociación",450000,60,6,"Señora con presupuesto firme $440k. Acepta la diferencia en toma de Aveo."),
    ("cl026",ID_EDUARDO,EMAIL_EDUARDO,"car-s011","Kia Seltos 2024","Cita agendada",520000,48,8,"Pareja joven. Les encantó. Preguntan por financiamiento."),
    ("cl028",ID_WECARS,EMAIL_WECARS,"car-s012","BMW Serie 3 2021","Lead nuevo",620000,38,11,"Profesionista de alto ingreso. Deja G-Class 2015 en toma ~$540k."),
    ("cl030",ID_EDUARDO,EMAIL_EDUARDO,"car-s001","Kia Sportage 2023","Negociación",485000,55,7,"Contador. Quiere el Sportage para su esposa. Pago contado posible."),
    ("cl032",ID_WECARS,EMAIL_WECARS,"car-s003","Mazda CX-5 2023","Cita agendada",545000,45,1,"Segunda visita mañana. Interesado en financiamiento a 60 meses."),
    ("cl034",ID_EDUARDO,EMAIL_EDUARDO,"car-s004","Ford Lobo 2021 Lariat","Negociación",720000,60,2,"Negociando toma de Ranger 2020. Casi cerrado."),
    ("cl036",ID_WECARS,EMAIL_WECARS,"car-s006","Toyota Camry 2022","Contactado",510000,30,1,"Primer contacto hoy. Viene a ver el auto mañana."),
    ("cl038",ID_EDUARDO,EMAIL_EDUARDO,"car-s007","Honda CR-V 2023","Crédito / Pago",535000,70,1,"Enganche depositado. Esperando aprobación Kuna."),
    ("cl040",ID_WECARS,EMAIL_WECARS,"car-s008","Nissan Frontier PRO-4X","Negociación",620000,65,2,"Empresario. Quiere 2 unidades para su empresa."),
    ("cl042",ID_EDUARDO,EMAIL_EDUARDO,"car-s010","Chevrolet Equinox 2023","Cita agendada",450000,50,1,"Visita agendada mañana con su esposo."),
    ("cl046",ID_WECARS,EMAIL_WECARS,"car-s011","Kia Seltos 2024","Negociación",520000,68,0,"Viene hoy a firmar. Crédito aprobado Scotiabank."),
    ("cl048",ID_EDUARDO,EMAIL_EDUARDO,"car-s012","BMW Serie 3 2021","Cita agendada",620000,45,2,"Segunda cita. Deja GLA 2018 en toma ~$280k."),
    ("cl050",ID_WECARS,EMAIL_WECARS,"car-s001","Kia Sportage 2023","Documentación",485000,82,1,"Listo para firma. Contratos enviados para revisión."),
    ("cl052",ID_EDUARDO,EMAIL_EDUARDO,"car-s002","Nissan Altima 2023","Negociación",440000,55,2,"Pide incluir garantía extendida. Casi cerrado."),
    ("cl054",ID_WECARS,EMAIL_WECARS,"car-s003","Mazda CX-5 2023","Crédito / Pago",545000,75,1,"Crédito Atria aprobado. Enganche listo."),
    ("cl056",ID_EDUARDO,EMAIL_EDUARDO,"car-s005","VW Tiguan 2022","Cita agendada",490000,40,0,"Visita hoy por la tarde. Muy interesado."),
    ("cl058",ID_WECARS,EMAIL_WECARS,"car-s009","Mazda CX-30 2024","Negociación",510000,60,1,"Joven profesionista. Pago de contado confirmado."),
    ("cl061",ID_EDUARDO,EMAIL_EDUARDO,"car-s006","Toyota Camry 2022","Documentación",510000,88,0,"Firma hoy. Enganche recibido. Auto reservado."),
    ("cl063",ID_WECARS,EMAIL_WECARS,"car-s007","Honda CR-V 2023","Negociación",535000,62,2,"Negocia enganche. Tiene Civic 2020 para toma ~$175k."),
    ("cl065",ID_EDUARDO,EMAIL_EDUARDO,"car-s008","Nissan Frontier PRO-4X","Cita agendada",620000,48,1,"Primera visita al piso mañana."),
    ("cl067",ID_WECARS,EMAIL_WECARS,"car-s010","Chevrolet Equinox 2023","Crédito / Pago",450000,72,0,"Crédito Kuna aprobado hoy. Pendiente firma."),
    ("cl069",ID_EDUARDO,EMAIL_EDUARDO,"car-s011","Kia Seltos 2024","Negociación",520000,58,1,"Pareja joven. Quieren color gris. Disponible."),
    ("cl071",ID_WECARS,EMAIL_WECARS,"car-s012","BMW Serie 3 2021","Cita agendada",620000,42,2,"Directora comercial. Segunda cita este jueves."),
    ("cl073",ID_EDUARDO,EMAIL_EDUARDO,"car-s001","Kia Sportage 2023","Documentación",485000,85,1,"Documentación completa. Firma el viernes."),
    ("cl074",ID_WECARS,EMAIL_WECARS,"car-s002","Nissan Altima 2023","Crédito / Pago",440000,70,0,"Enganche de $88k transferido. Esperando liberación."),
    ("cl077",ID_EDUARDO,EMAIL_EDUARDO,"car-s004","Ford Lobo 2021 Lariat","Negociación",720000,65,1,"Toma aceptada. Solo afina detalles de financiamiento."),
    ("cl078",ID_WECARS,EMAIL_WECARS,"car-s003","Mazda CX-5 2023","Cita agendada",545000,44,2,"Viene el sábado con su familia."),
    ("cl079",ID_EDUARDO,EMAIL_EDUARDO,"car-s006","Toyota Camry 2022","Negociación",510000,62,1,"Empresario. Compra para su director de ventas."),
    ("cl080",ID_WECARS,EMAIL_WECARS,"car-s007","Honda CR-V 2023","Documentación",535000,80,0,"Todo listo. Firma esta tarde."),
    # ── 4 APARTADOS NUEVOS ──────────────────────────────────────────────────────
    ("cl025",ID_EDUARDO,EMAIL_EDUARDO,"demo-mazda3-2022","Mazda 3 2022 Signature","Documentación",344700,90,1,"APARTADO. Enganche recibido $69k. Firma mañana. Cliente muy puntual."),
    ("cl027",ID_WECARS,EMAIL_WECARS,"demo-trax-2022","Chevrolet Trax 2022 Premier","Documentación",268000,88,0,"APARTADO. Crédito Atria aprobado $215k. Contrato listo para firma hoy."),
    ("cl029",ID_EDUARDO,EMAIL_EDUARDO,"demo-jetta-2016","Volkswagen Jetta 2016 Comfortline","Crédito / Pago",165000,75,1,"APARTADO. Depósito de $33k recibido. Crédito Kuna en proceso final."),
    ("cl031",ID_WECARS,EMAIL_WECARS,"demo-captiva-2022","Chevrolet Captiva 2022 Premier","Documentación",319000,92,0,"APARTADO. Pago de contado confirmado. Entrega programada esta semana."),
]
def _forma_pago(notas_txt, idx):
    n = notas_txt.lower()
    if "contado" in n:
        return "Contado", ""
    if "scotiabank" in n:
        return "Crédito", "Scotiabank"
    if "atria" in n:
        return "Crédito", "Atria"
    if "kuna" in n:
        return "Crédito", "Kuna"
    # Asignar cíclicamente para el resto
    bancos = ["Kuna", "Atria", "Scotiabank", "Kuna", "Atria"]
    return "Crédito", bancos[idx % len(bancos)]

opps = []
for i, (cid,vid,vemail,aid,auto,etapa,monto,prob,dias,notas) in enumerate(opp_data):
    forma, inst = _forma_pago(notas, i)
    opps.append({
        "_id": f"op{i+1:03d}",
        "clienteId": cid,
        "vendedorId": vid,
        "vendedorEmail": vemail,
        "autoId": aid,
        "interes": auto,
        "etapa": etapa,
        "monto": monto,
        "probabilidad": prob,
        "formaPago": forma,
        "institucionFinanciera": inst,
        "fechaCreacion": f(dias*2),
        "fechaEstimadaCierre": f(-dias),
        "notas": notas,
    })
csv_write("Opportunities", opps)

# ─────────────────────────────────────────────────────────────
# ACTIVIDADES — todo al corriente, sin pendientes
# ─────────────────────────────────────────────────────────────
tipos = ["llamada","visita","whatsapp","llamada","whatsapp","email","visita","whatsapp"]
descripciones = [
    "Contacto inicial. Muy interesado. Agendó visita para ver el auto en persona.",
    "Prueba de manejo realizada. Le encantó el auto. Solicitó cotización formal.",
    "Enviada cotización con financiamiento a 48 meses. Esperando respuesta.",
    "Confirmó que va a traer a su esposa/esposo el fin de semana.",
    "Resolvió dudas sobre garantía y trámites. Listo para avanzar.",
    "Seguimiento: sigue interesado, espera quincena para dar enganche.",
    "Reunión de cierre. Revisaron contrato. Firma pendiente de aval de banco.",
    "Checó opciones de financiamiento en línea. Recibe respuesta en 24h.",
    "Visita sin cita. Muy decidido. Pidió apartar con depósito.",
    "WhatsApp enviado con fotos adicionales del auto. Respondió positivamente.",
    "Llamada de seguimiento post-cotización. Negociando precio final.",
    "Cliente confirma que tiene el enganche listo. Cita para firma el viernes.",
]
actividades = []
act_id = 1
for i, cl in enumerate(clientes[:30]):
    # Extraer días desde hoy del cliente para basar las actividades en eso
    from datetime import datetime, timezone
    reg_str = cl["fechaRegistro"]
    reg_dt = datetime.fromisoformat(reg_str.replace("Z", "+00:00"))
    now_utc = datetime.now(timezone.utc)
    if reg_dt.tzinfo is None:
        reg_dt = reg_dt.replace(tzinfo=timezone.utc)
    dias_registro = max(0, (now_utc - reg_dt).days)

    num_acts = random.randint(2, 4)
    for j in range(num_acts):
        # Primera actividad: 1-3 días DESPUÉS del registro (primer contacto)
        # Actividades subsecuentes: cada 3-7 días adicionales
        if j == 0:
            offset = random.randint(1, 3)
        else:
            offset = random.randint(3, 7) * j
        dias_act = max(0, dias_registro - offset)  # más reciente que el registro
        actividades.append({
            "_id": f"act{act_id:03d}",
            "clienteId": cl["_id"],
            "vendedorId": vendedores_email[i % len(vendedores_email)],
            "autor": [NOMBRE_EDUARDO, NOMBRE_WECARS][i % 2],
            "tipo": tipos[(i+j) % len(tipos)],
            "descripcion": descripciones[(i+j) % len(descripciones)],
            "fecha": f(dias_act),
            "resultado": "positivo",
            "proximoPaso": "Llamar para confirmar cita de firma" if j == num_acts-1 else "",
        })
        act_id += 1
csv_write("Activities", actividades)

# ─────────────────────────────────────────────────────────────
# CRÉDITOS activos (para las 2 ventas a crédito)
# ─────────────────────────────────────────────────────────────
creditos = [
    {"_id":"cr001","clienteId":"cl001","ventaId":"v001","banco":"Scotiabank",
     "montoAprobado":800000,"tasa":11.5,"plazoMeses":60,
     "mensualidad":17600,"estatus":"activo",
     "fechaAprobacion":f(10),"fechaPrimerPago":f(-20),
     "vehiculo":"Ford Lobo Raptor 2022"},
    {"_id":"cr002","clienteId":"cl003","ventaId":"v002","banco":"Kuna",
     "montoAprobado":255400,"tasa":12.9,"plazoMeses":36,
     "mensualidad":8500,"estatus":"activo",
     "fechaAprobacion":f(7),"fechaPrimerPago":f(-25),
     "vehiculo":"Kia Sportage 2018"},
    # Pipeline con créditos en proceso
    {"_id":"cr003","clienteId":"cl014","ventaId":"","banco":"Atria",
     "montoAprobado":435000,"tasa":12.5,"plazoMeses":48,
     "mensualidad":12200,"estatus":"preaprobado",
     "fechaAprobacion":f(3),"fechaPrimerPago":"",
     "vehiculo":"Honda CR-V 2023"},
    {"_id":"cr004","clienteId":"cl016","ventaId":"","banco":"Scotiabank",
     "montoAprobado":350000,"tasa":11.8,"plazoMeses":48,
     "mensualidad":9400,"estatus":"aprobado",
     "fechaAprobacion":f(4),"fechaPrimerPago":"",
     "vehiculo":"Toyota RAV4 2020"},
    {"_id":"cr005","clienteId":"cl002","ventaId":"","banco":"Kuna",
     "montoAprobado":420000,"tasa":12.0,"plazoMeses":48,
     "mensualidad":11700,"estatus":"en-tramite",
     "fechaAprobacion":"","fechaPrimerPago":"",
     "vehiculo":"Kia Sportage 2023"},
    {"_id":"cr006","clienteId":"cl038","ventaId":"","banco":"Atria",
     "montoAprobado":435000,"tasa":12.3,"plazoMeses":48,
     "mensualidad":12000,"estatus":"en-tramite",
     "fechaAprobacion":"","fechaPrimerPago":"",
     "vehiculo":"Honda CR-V 2023"},
    {"_id":"cr007","clienteId":"cl046","ventaId":"","banco":"Scotiabank",
     "montoAprobado":480000,"tasa":11.9,"plazoMeses":60,
     "mensualidad":10800,"estatus":"aprobado",
     "fechaAprobacion":f(1),"fechaPrimerPago":"",
     "vehiculo":"Kia Seltos 2024"},
]
csv_write("Creditos", creditos)

# ─────────────────────────────────────────────────────────────
# PAGOS — ingresos de las 5 ventas + egresos operativos
# ─────────────────────────────────────────────────────────────
pagos = [
    {"_id":"p001","clienteId":"cl001","ventaId":"v001","concepto":"Enganche Ford Lobo Raptor — toma RAM 2019 + efectivo","monto":480000,"tipo":"ingreso","fecha":f(8),"metodo":"transferencia+toma","referencia":"TRF2026-001"},
    {"_id":"p002","clienteId":"cl001","ventaId":"v001","concepto":"Diferencia enganche Lobo Raptor — transferencia","monto":200000,"tipo":"ingreso","fecha":f(8),"metodo":"transferencia","referencia":"TRF2026-002"},
    {"_id":"p003","clienteId":"cl003","ventaId":"v002","concepto":"Enganche Kia Sportage 2018 — toma March + efectivo","monto":116000,"tipo":"ingreso","fecha":f(5),"metodo":"transferencia+toma","referencia":"TRF2026-003"},
    {"_id":"p004","clienteId":"cl005","ventaId":"v003","concepto":"Liquidación Nissan Altima 2018 — contado","monto":190000,"tipo":"ingreso","fecha":f(12),"metodo":"transferencia","referencia":"TRF2026-004"},
    {"_id":"p005","clienteId":"cl007","ventaId":"v004","concepto":"Liquidación Mazda 3 2019 — contado","monto":210000,"tipo":"ingreso","fecha":f(15),"metodo":"efectivo","referencia":"EFT2026-001"},
    {"_id":"p006","clienteId":"cl009","ventaId":"v005","concepto":"Liquidación Peugeot Partner 2017 — contado empresa","monto":165000,"tipo":"ingreso","fecha":f(18),"metodo":"cheque","referencia":"CHQ2026-001"},
    {"_id":"p007","clienteId":"","ventaId":"","concepto":"Publicidad Facebook + Instagram — Julio","monto":22000,"tipo":"egreso","fecha":f(6),"metodo":"tarjeta","referencia":"FB2026-JUL"},
    {"_id":"p008","clienteId":"","ventaId":"","concepto":"Detailing y preparación de unidades — Julio","monto":9500,"tipo":"egreso","fecha":f(10),"metodo":"efectivo","referencia":"DET2026-003"},
    {"_id":"p009","clienteId":"","ventaId":"","concepto":"Renta local agencia — Julio 2026","monto":28000,"tipo":"egreso","fecha":f(2),"metodo":"transferencia","referencia":"RENTA2026-JUL"},
    {"_id":"p010","clienteId":"","ventaId":"","concepto":"Comisiones vendedores — Julio","monto":51000,"tipo":"egreso","fecha":f(3),"metodo":"transferencia","referencia":"COM2026-JUL"},
    {"_id":"p011","clienteId":"","ventaId":"","concepto":"Adquisición Kia Sportage 2023 (nuevo inventario)","monto":418000,"tipo":"egreso","fecha":f(25),"metodo":"transferencia","referencia":"COMP2026-001"},
    {"_id":"p012","clienteId":"","ventaId":"","concepto":"Adquisición Ford Lobo Lariat 2021","monto":622000,"tipo":"egreso","fecha":f(22),"metodo":"transferencia","referencia":"COMP2026-002"},
]
csv_write("Pagos", pagos)

# ─────────────────────────────────────────────────────────────
# COMISIONES — para Eduardo y weCars
# ─────────────────────────────────────────────────────────────
comisiones = [
    {"_id":"com001","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "clienteId":"cl001","ventaId":"v001","autoVendido":"Ford Lobo Raptor 2022",
     "montoVenta":1000000,"pct":1.5,"monto":15000,"estatus":"pagada",
     "fechaVenta":f(8),"fechaPago":f(5)},
    {"_id":"com002","vendedorId":ID_WECARS,"vendedor":NOMBRE_WECARS,
     "clienteId":"cl003","ventaId":"v002","autoVendido":"Kia Sportage 2018",
     "montoVenta":220000,"pct":1.5,"monto":3300,"estatus":"pagada",
     "fechaVenta":f(5),"fechaPago":f(3)},
    {"_id":"com003","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "clienteId":"cl005","ventaId":"v003","autoVendido":"Nissan Altima 2018",
     "montoVenta":190000,"pct":1.5,"monto":2850,"estatus":"pagada",
     "fechaVenta":f(12),"fechaPago":f(9)},
    {"_id":"com004","vendedorId":ID_WECARS,"vendedor":NOMBRE_WECARS,
     "clienteId":"cl007","ventaId":"v004","autoVendido":"Mazda 3 2019",
     "montoVenta":210000,"pct":1.5,"monto":3150,"estatus":"pagada",
     "fechaVenta":f(15),"fechaPago":f(12)},
    {"_id":"com005","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "clienteId":"cl009","ventaId":"v005","autoVendido":"Peugeot Partner 2017",
     "montoVenta":165000,"pct":1.5,"monto":2475,"estatus":"pendiente",
     "fechaVenta":f(18),"fechaPago":""},
]
csv_write("Comisiones", comisiones)

# ─────────────────────────────────────────────────────────────
# FACTURAS
# ─────────────────────────────────────────────────────────────
facturas = [
    {"_id":"f001","clienteId":"cl001","ventaId":"v001","folio":"WCB-2026-001",
     "rfc":"FUAM880312AB1","razonSocial":"Alejandro Fuentes Mora",
     "monto":862069,"iva":137931,"total":1000000,
     "fechaEmision":f(8),"estatus":"emitida","uuid":"UUID-2026-001","xmlUrl":"","pdfUrl":""},
    {"_id":"f002","clienteId":"cl003","ventaId":"v002","folio":"WCB-2026-002",
     "rfc":"RECR910705CD2","razonSocial":"Ricardo Olvera Blanco",
     "monto":258103,"iva":41297,"total":299400,
     "fechaEmision":f(5),"estatus":"emitida","uuid":"UUID-2026-002","xmlUrl":"","pdfUrl":""},
    {"_id":"f003","clienteId":"cl005","ventaId":"v003","folio":"WCB-2026-003",
     "rfc":"HEPS850520EF3","razonSocial":"Héctor Sánchez Peña",
     "monto":181034,"iva":28966,"total":210000,
     "fechaEmision":f(12),"estatus":"emitida","uuid":"UUID-2026-003","xmlUrl":"","pdfUrl":""},
    {"_id":"f004","clienteId":"cl007","ventaId":"v004","folio":"WCB-2026-004",
     "rfc":"FEHR920630GH4","razonSocial":"Fernando Herrera Vega",
     "monto":241379,"iva":38621,"total":280000,
     "fechaEmision":f(15),"estatus":"pendiente","uuid":"","xmlUrl":"","pdfUrl":""},
    {"_id":"f005","clienteId":"cl009","ventaId":"v005","folio":"WCB-2026-005",
     "rfc":"ESAE880914IJ5","razonSocial":"Eduardo Salinas Torres",
     "monto":112069,"iva":17931,"total":130000,
     "fechaEmision":f(18),"estatus":"pendiente","uuid":"","xmlUrl":"","pdfUrl":""},
]
csv_write("Facturas", facturas)

# ─────────────────────────────────────────────────────────────
# SOLICITUDES DE COMPRA — tomas activas
# ─────────────────────────────────────────────────────────────
solicitudes = [
    {"_id":"sc001","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "clienteId":"cl002","marca":"VW","modelo":"Jetta","año":2019,
     "version":"Comfortline","colorPreferido":"cualquiera","presupuestoMax":215000,
     "estatus":"encontrado","fechaSolicitud":f(4),
     "notas":"Cliente entrega Jetta en toma al cerrar compra del Sportage 2023. Valuado $215k."},
    {"_id":"sc002","vendedorId":ID_WECARS,"vendedor":NOMBRE_WECARS,
     "clienteId":"cl008","marca":"Toyota","modelo":"Hilux","año":2020,
     "version":"Base","colorPreferido":"cualquiera","presupuestoMax":380000,
     "estatus":"buscando","fechaSolicitud":f(3),
     "notas":"Ofrece Hilux 2020 como toma para la Lobo Lariat 2021. Revisando papeles."},
    {"_id":"sc003","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "clienteId":"cl012","marca":"Ford","modelo":"Focus","año":2019,
     "version":"SE","colorPreferido":"cualquiera","presupuestoMax":95000,
     "estatus":"buscando","fechaSolicitud":f(5),
     "notas":"Focus 2019 para toma en compra de Camry 2022. Pendiente valuación física."},
    {"_id":"sc004","vendedorId":ID_WECARS,"vendedor":NOMBRE_WECARS,
     "clienteId":"cl020","marca":"Ram","modelo":"1500","año":2018,
     "version":"Big Horn","colorPreferido":"cualquiera","presupuestoMax":320000,
     "estatus":"buscando","fechaSolicitud":f(7),
     "notas":"Empresario ofrece Ram 2018 en toma para Frontier 2023. Alta probabilidad."},
    {"_id":"sc005","vendedorId":ID_EDUARDO,"vendedor":NOMBRE_EDUARDO,
     "clienteId":"cl024","marca":"Chevrolet","modelo":"Aveo","año":2020,
     "version":"LT","colorPreferido":"cualquiera","presupuestoMax":88000,
     "estatus":"encontrado","fechaSolicitud":f(6),
     "notas":"Aveo 2020 aceptado como parte de pago. Valuado $88k, diferencia de $362k en Equinox."},
    {"_id":"sc006","vendedorId":ID_WECARS,"vendedor":NOMBRE_WECARS,
     "clienteId":"cl028","marca":"Mercedes-Benz","modelo":"GLA","año":2015,
     "version":"200","colorPreferido":"cualquiera","presupuestoMax":540000,
     "estatus":"buscando","fechaSolicitud":f(2),
     "notas":"Profesionista ofrece GLA 2015 para bajar precio del BMW Serie 3. Pendiente valuación."},
]
csv_write("SolicitudesCompra", solicitudes)

# ─────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────
total_ventas = sum(v["precioVenta"] for v in ventas)
total_utilidad = sum(v["utilidadBruta"] for v in ventas)
pct_prom = round(total_utilidad / total_ventas * 100, 1)

print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Datos demo v2 generados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Autos en inventario : {len(cars)} unidades
  Clientes            : {len(clientes)}
  Leads este mes      : {len(leads)}
  Ventas cerradas     : {len(ventas)}
  Total ventas        : ${total_ventas:,}
  Utilidad bruta      : ${total_utilidad:,}
  Margen promedio     : {pct_prom}%
  Oportunidades abiertas : {len(opps)}
  Tomas activas       : {len(solicitudes)}
  Actividades         : {len(actividades)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
