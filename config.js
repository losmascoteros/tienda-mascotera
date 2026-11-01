// Configuración de la tienda. Cambiá solo lo que está entre comillas o los números.
const CONFIG = {
  CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYaPgMudFTXwIPImAm3Kcl_eRFcqiYl8NZEEnauKgiLXOptxGPUS1dDRdRQiX5PWNT_t_GnmSbbMVp/pub?gid=408294802&single=true&output=csv",
  WHATSAPP: "5493413533033",
  INSTAGRAM: "losmascoterosario",
  STOCK_BAJO: 3,   // con este stock o menos se muestra "¡Últimas!"

  // Formas de pago que aparecen en el pedido (podés sacar o agregar)
  PAGOS: ["Mercado Pago", "Transferencia", "Efectivo"],

  // Texto debajo de la dirección cuando elige envío
  ENVIO_TEXTO: "El costo del envío lo confirmamos por WhatsApp.",

  // Regalo por monto: con REGALO_DESDE en 0 está apagado. Ejemplo: 60000
  REGALO_DESDE: 0,
  REGALO_TEXTO: "un regalo sorpresa para tu mascota",

  // Novedades de la semana: pegá acá el link .csv de la pestaña "Novedades". Vacío = apagado.
  NOVEDADES_URL: "",

  // Medición anónima. Pegá acá la dirección de tu script de Google SOLO después de
  // hacer la Parte 5. Vacío = apagada.
    EVENTOS_URL: "https://script.google.com/macros/s/AKfycbxkcqTgX5l6wWWEkE-Yqai5kQ6EuC4f7GuT9-Um3ADb4Rsq7VMkyGJGIOzqHVVBRPHIQg/exec",

  // Información al final del inicio. Las que tengan el texto vacío no se muestran.
  INFO: [
    { t: "🕒 Horarios", x: "" },
    { t: "🛵 Envíos", x: "" },
    { t: "💳 Formas de pago", x: "" },
    { t: "🏪 Retiro", x: "" }
  ]
};