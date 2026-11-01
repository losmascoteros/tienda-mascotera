(function () {
  "use strict";

  const vista = document.getElementById("vista");

  const ANIMALES = [
    { clave: "perro", nombre: "Perro", emoji: "🐶" },
    { clave: "gato", nombre: "Gato", emoji: "🐱" },
    { clave: "roedores", nombre: "Roedores", emoji: "🐹" },
    { clave: "peces", nombre: "Peces", emoji: "🐠" }
  ];

  const EMOJI_CAT = {
    juguetes: "🎾", higiene: "🧼", alimentoseco: "🥣", alimentohumedo: "🥫", paseos: "🦮",
    camaseindumentaria: "🛏️", snacksygolosinas: "🍖", accesorios: "🎀",
    alimentos: "🐟", entretenimiento: "🪶", cama: "🛏️"
  };

  // Dibujos propios para gatos (el de "Paseos" de perros es un perro guía)
  const EMOJI_CAT_GATO = { paseos: "🧳", higiene: "🧹", alimentos: "🐟", entretenimiento: "🪶", cama: "🛏️" };

  const ETIQUETAS = { nuevo: "🆕 Nuevo", oferta: "🔥 Oferta", maspedido: "⭐ Más pedido" };

  let productos = [];
  let orden = "destacados";

  // ---------- Pedido (carrito) ----------
  const CLAVE_PEDIDO = "mascoteros_pedido_v1";
  let carro = leerCarro();          // { idProducto: cantidad }
  let carroAjustado = false;        // true si el stock cambió y hubo que corregir el pedido
  let alCambiarCarro = null;        // función que repinta el pedido si está abierto

  function leerCarro() {
    try {
      const o = JSON.parse(localStorage.getItem(CLAVE_PEDIDO) || "{}");
      const limpio = {};
      Object.keys(o || {}).forEach(function (k) {
        const n = Math.floor(Number(o[k]));
        if (n > 0) limpio[k] = n;
      });
      return limpio;
    } catch (e) { return {}; }
  }
  function guardarCarro() {
    try { localStorage.setItem(CLAVE_PEDIDO, JSON.stringify(carro)); } catch (e) { /* sin guardado */ }
  }
  function dinero(n) { return "$" + Math.round(n).toLocaleString("es-AR"); }
  function productoPorId(id) { return productos.filter(function (p) { return p.id === id; })[0]; }
  function cantidadEn(p) { return carro[p.id] || 0; }
  function comprable(p) { return p.stock > 0 && !isNaN(p.precio); }

  function itemsCarro() {
    const out = [];
    Object.keys(carro).forEach(function (id) {
      const p = productoPorId(id);
      if (p && comprable(p)) out.push({ p: p, n: Math.min(carro[id], p.stock) });
    });
    return out;
  }
  function totalCarro() { return itemsCarro().reduce(function (s, i) { return s + i.p.precio * i.n; }, 0); }
  function unidadesCarro() { return itemsCarro().reduce(function (s, i) { return s + i.n; }, 0); }

  function fijarCantidad(p, n) {
      const antes = cantidadEn(p);
    n = Math.max(0, Math.min(Math.floor(n), p.stock));
    if (n > antes) medir("agregar", p.nombre);
    if (n > 0) carro[p.id] = n; else delete carro[p.id];
    guardarCarro();
    refrescarAcciones();
    actualizarBarra();
    if (alCambiarCarro) alCambiarCarro();
  }

  // Después de cargar el catálogo: saca lo que ya no está y respeta el stock actual
  function sanearCarro() {
    let cambio = false;
    Object.keys(carro).forEach(function (id) {
      const p = productoPorId(id);
      if (!p || !comprable(p)) { delete carro[id]; cambio = true; }
      else if (carro[id] > p.stock) { carro[id] = p.stock; cambio = true; }
    });
    if (cambio) { guardarCarro(); carroAjustado = true; }
  }

  function stepper(p, n) {
    const s = el("div", "stepper");
    const menos = el("button", "", "−");
    menos.type = "button";
    menos.setAttribute("aria-label", "Quitar uno");
    const num = el("span", "stepper-n", String(n));
    const mas = el("button", "", "+");
    mas.type = "button";
    mas.setAttribute("aria-label", "Agregar uno");
    mas.disabled = n >= p.stock;
    menos.addEventListener("click", function () { fijarCantidad(p, cantidadEn(p) - 1); });
    mas.addEventListener("click", function () { fijarCantidad(p, cantidadEn(p) + 1); });
    s.appendChild(menos);
    s.appendChild(num);
    s.appendChild(mas);
    return s;
  }

  function pintarAccion(acc, p) {
    acc.innerHTML = "";
    if (p.stock <= 0) {
      const a = el("a", "boton-wa suave", "🔔 Avisame cuando llegue");
      a.target = "_blank";
      a.rel = "noopener";
      a.href = urlWA("¡Hola Los Mascoteros! Avisenme cuando llegue: " + p.nombre + ".");
      acc.appendChild(a);
      return;
    }
    if (isNaN(p.precio)) {
      const a = el("a", "boton-wa suave", "💬 Consultar precio");
      a.target = "_blank";
      a.rel = "noopener";
      a.href = urlWA("¡Hola Los Mascoteros! Quiero consultar el precio de: " + p.nombre + ".");
      acc.appendChild(a);
      return;
    }
    const n = cantidadEn(p);
    if (n === 0) {
      const b = el("button", "boton-wa", "🛒 Agregar");
      b.type = "button";
      b.addEventListener("click", function () { fijarCantidad(p, 1); });
      acc.appendChild(b);
      return;
    }
    const fila = el("div", "accion-fila");
    fila.appendChild(el("span", "accion-texto", n >= p.stock ? "En tu pedido (máximo)" : "En tu pedido"));
    fila.appendChild(stepper(p, n));
    acc.appendChild(fila);
  }

  function refrescarAcciones() {
    const accs = document.querySelectorAll(".accion[data-id]");
    for (let i = 0; i < accs.length; i++) {
      const p = productoPorId(accs[i].getAttribute("data-id"));
      if (p) pintarAccion(accs[i], p);
    }
  }

   function actualizarBarra() {
    const insignia = document.getElementById("menu-n");
    if (insignia) {
      const cant = unidadesCarro();
      insignia.textContent = cant;
      insignia.hidden = !cant;
    }
    const barra = document.getElementById("carro-barra");
    if (!barra) return;
    const u = unidadesCarro();
    const enPedido = location.hash.indexOf("#/pedido") === 0;
    barra.hidden = !u || enPedido;
    if (u) {
      document.getElementById("carro-texto").textContent =
        "🛒 Mi pedido · " + u + (u === 1 ? " producto" : " productos") + " · " + dinero(totalCarro()) + "  ›";
    }
  }

  // ---------- Utilidades ----------
  function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  // Minúsculas, sin acentos ni espacios: "Camas e indumentaria" -> "camaseindumentaria"
  function norm(t) {
    return String(t === undefined || t === null ? "" : t)
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  }

  // Número que puede venir como "3200", "$3.200", "$3,200" o "3200,50"
  function numero(t) {
    let s = String(t || "").replace(/[^\d.,-]/g, "");
    if (!s) return NaN;
    if (s.indexOf(".") !== -1 && s.indexOf(",") !== -1) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) {
      s = s.replace(/[.,]/g, "");
    } else {
      s = s.replace(",", ".");
    }
    return parseFloat(s);
  }

  function claveAnimal(t) {
    const n = norm(t);
    if (n.indexOf("perr") === 0) return "perro";
    if (n.indexOf("gat") === 0) return "gato";
    if (n.indexOf("roed") === 0) return "roedores";
    if (n.indexOf("pez") === 0 || n.indexOf("pec") === 0) return "peces";
    return "";
  }

  function animalDe(clave) { return ANIMALES.filter(function (a) { return a.clave === clave; })[0]; }
  function cantidadAnimal(clave) { return productos.filter(function (p) { return p.animal === clave; }).length; }
  function emojiCat(animal, cat) {
    const k = norm(cat);
    if (animal === "gato" && EMOJI_CAT_GATO[k]) return EMOJI_CAT_GATO[k];
    return EMOJI_CAT[k] || animalDe(animal).emoji;
  }
  function emojiProducto(p) { return emojiCat(p.animal, p.cat); }
  function precioTxt(p) { return isNaN(p.precio) ? "Consultar" : "$" + Math.round(p.precio).toLocaleString("es-AR"); }
  function urlWA(texto) { return "https://wa.me/" + CONFIG.WHATSAPP + "?text=" + encodeURIComponent(texto); }

  function enlace() {
    return "#/" + Array.prototype.slice.call(arguments).map(encodeURIComponent).join("/");
  }

  function detalleError(err) {
    return String(err && err.message ? err.message : err);
  }

  // ---------- Lectura del CSV ----------
  function parsearCSV(texto) {
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
    const filas = [];
    let fila = [], campo = "", comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto.charAt(i);
      if (comillas) {
        if (c === '"') {
          if (texto.charAt(i + 1) === '"') { campo += '"'; i++; } else { comillas = false; }
        } else { campo += c; }
      } else if (c === '"') { comillas = true; }
      else if (c === ",") { fila.push(campo); campo = ""; }
      else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
      else if (c !== "\r") { campo += c; }
    }
    if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
    return filas;
  }
  // Fecha en formato 02/11/2026 (o 2026-11-02). Devuelve el final de ese día, o null si no se entiende.
  function parseFecha(t) {
    const s = String(t || "").trim();
    if (!s) return null;
    let d, m, y;
    let r = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (r) {
      d = Number(r[1]); m = Number(r[2]); y = Number(r[3]);
    } else {
      r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!r) return null;
      y = Number(r[1]); m = Number(r[2]); d = Number(r[3]);
    }
    if (y < 100) y += 2000;
    const f = new Date(y, m - 1, d, 23, 59, 59);
    return isNaN(f.getTime()) ? null : f;
  }

  function fechaCorta(d) {
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function armarProductos(filas) {
    if (!filas.length) throw new Error("La planilla llegó vacía");
    const enc = filas[0].map(norm);
    function col(n) { return enc.indexOf(n); }
    const requeridas = { animal: "Animal", categoria: "Categoría", nombre: "Nombre", precio: "Precio", stock: "Stock" };
    const faltan = Object.keys(requeridas).filter(function (k) { return col(k) === -1; }).map(function (k) { return requeridas[k]; });
    if (faltan.length) { const e = new Error("Faltan columnas: " + faltan.join(", ")); e.faltan = faltan; throw e; }

    function get(f, n) { const i = col(n); return i === -1 ? "" : String(f[i] === undefined ? "" : f[i]).trim(); }

    const out = [];
    for (let i = 1; i < filas.length; i++) {
      const f = filas[i];
      const nombre = get(f, "nombre");
      if (!nombre) continue;
      const act = norm(get(f, "activo"));
      if (act === "no" || act === "false" || act === "0") continue;
      const animal = claveAnimal(get(f, "animal"));
      if (!animal) continue;
      const stock = numero(get(f, "stock"));
      const precioBase = numero(get(f, "precio"));
      const anterior = numero(get(f, "precioanterior"));
      const hasta = parseFecha(get(f, "ofertahasta"));
      let precioFinal = precioBase;
      let oferta = false;
      let antes = NaN;
      if (!isNaN(precioBase) && !isNaN(anterior) && anterior > precioBase) {
        if (hasta && new Date() > hasta) precioFinal = anterior;   // la oferta terminó: vuelve al precio de siempre
        else { oferta = true; antes = anterior; }
      }
      out.push({
        id: get(f, "id") || ("fila" + i),
        animal: animal,
        cat: get(f, "categoria") || "Otros",
        sub: get(f, "subcategoria"),
        marca: get(f, "marca"),
        nombre: nombre,
        desc: get(f, "descripcion"),
                precio: precioFinal,
        oferta: oferta,
        antes: antes,
        ofertaHasta: oferta ? hasta : null,
        descuento: oferta ? Math.round((1 - precioBase / anterior) * 100) : 0,
        stock: isNaN(stock) ? 0 : Math.max(0, Math.floor(stock)),
        tam: get(f, "tamano"),
        etapa: get(f, "etapa"),
        kg: parseFloat(get(f, "kgbolsa").replace(",", ".")) || 0,
        etiquetas: get(f, "etiquetas").split(/[,;]/).map(norm).filter(Boolean),
        foto: get(f, "foto"),
        orden: i
      });
    }
    return out;
  }

  // Categorías de un animal, en el orden en que aparecen en la planilla
  function categoriasDe(clave) {
    const lista = [];
    const vistos = {};
    productos.filter(function (p) { return p.animal === clave; }).forEach(function (p) {
      if (!vistos[p.cat]) { vistos[p.cat] = { nombre: p.cat, cantidad: 0, subs: [] }; lista.push(vistos[p.cat]); }
      const c = vistos[p.cat];
      c.cantidad++;
      if (p.sub && c.subs.indexOf(p.sub) === -1) c.subs.push(p.sub);
    });
    return lista;
  }

  function ordenar(lista) {
    const pr = function (p) { return isNaN(p.precio) ? Infinity : p.precio; };
    return lista.slice().sort(function (a, b) {
      const sinStock = (b.stock > 0) - (a.stock > 0);   // lo agotado va al final
      if (sinStock) return sinStock;
      if (orden === "menor") return pr(a) - pr(b);
      if (orden === "mayor") return pr(b) - pr(a);
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      return a.orden - b.orden;
    });
  }

  // ---------- Piezas de pantalla ----------
  function migas(items) {
    const nav = el("nav", "migas");
    nav.setAttribute("aria-label", "Dónde estás");
    items.forEach(function (it, i) {
      if (i) nav.appendChild(document.createTextNode(" › "));
      if (it.h) { const a = el("a", "", it.t); a.href = it.h; nav.appendChild(a); }
      else nav.appendChild(el("strong", "", it.t));
    });
    return nav;
  }

  function buscador(valor) {
    const f = el("form", "buscador");
    f.setAttribute("role", "search");
    const i = document.createElement("input");
    i.type = "search";
    i.placeholder = "Buscar un producto…";
    i.value = valor || "";
    i.setAttribute("aria-label", "Buscar un producto");
    const b = el("button", "", "🔍");
    b.type = "submit";
    b.setAttribute("aria-label", "Buscar");
    f.appendChild(i);
    f.appendChild(b);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = i.value.trim();
            if (q) { medir("buscar", q); location.hash = enlace("buscar", q); }
    });
    return f;
  }

  function baldosa(href, emoji, titulo, sub, apagada) {
    const a = el(apagada ? "div" : "a", "baldosa" + (apagada ? " apagada" : ""));
    if (!apagada) a.href = href;
    a.appendChild(el("span", "baldosa-emoji", emoji));
    a.appendChild(el("strong", "", titulo));
    a.appendChild(el("small", "", sub));
    return a;
  }

  function tarjeta(p) {
    const art = el("article", "prod" + (p.stock <= 0 ? " agotado" : ""));

    const foto = el("div", "prod-foto");
    const emoji = el("span", "prod-emoji", emojiProducto(p));
    foto.appendChild(emoji);
    // Si la planilla no indica foto, se busca fotos/<ID>.jpg (por ejemplo fotos/JUG-001.jpg)
    const archivoFoto = p.foto || (/^fila\d+$/.test(p.id) ? "" : p.id + ".jpg");
    if (archivoFoto) {
      const img = document.createElement("img");
      img.alt = p.nombre;
      img.loading = "lazy";
      img.src = "fotos/" + encodeURIComponent(archivoFoto);
      img.addEventListener("load", function () { emoji.hidden = true; });
      img.addEventListener("error", function () { img.remove(); });
      foto.appendChild(img);
    }
    art.appendChild(foto);

    const info = el("div", "prod-info");
       const etq = p.etiquetas.filter(function (t) { return ETIQUETAS[t] && !(p.oferta && t === "oferta"); });
    if (etq.length || p.oferta) {
      const fila = el("div", "prod-etiquetas");
      if (p.oferta) fila.appendChild(el("span", "etiqueta oferta", "🔥 -" + p.descuento + "%"));
      etq.forEach(function (t) { fila.appendChild(el("span", "etiqueta", ETIQUETAS[t])); });
      info.appendChild(fila);
    }
    info.appendChild(el("h3", "", p.nombre));
    if (p.marca) info.appendChild(el("p", "prod-marca", p.marca));
    if (p.desc) info.appendChild(el("p", "prod-desc", p.desc));
    if (p.oferta && p.ofertaHasta) info.appendChild(el("p", "oferta-hasta", "Oferta hasta el " + fechaCorta(p.ofertaHasta)));
    art.appendChild(info);

    const pie = el("div", "prod-pie");
       const cajaPrecio = el("div", "precio-caja");
    cajaPrecio.appendChild(el("span", "precio", precioTxt(p)));
    if (p.oferta) cajaPrecio.appendChild(el("s", "precio-antes", dinero(p.antes)));
    pie.appendChild(cajaPrecio);
    let st;
    if (p.stock <= 0) st = el("span", "stock sin", "Sin stock");
    else if (p.stock <= CONFIG.STOCK_BAJO) st = el("span", "stock bajo", "¡Últimas " + p.stock + "!");
    else st = el("span", "stock", "Stock: " + p.stock);
    pie.appendChild(st);
    art.appendChild(pie);

        const acc = el("div", "accion");
    acc.setAttribute("data-id", p.id);
    pintarAccion(acc, p);
    art.appendChild(acc);
    return art;
  }

  function listaDeTarjetas(lista) {
    const cont = el("div", "lista");
    lista.forEach(function (p) { cont.appendChild(tarjeta(p)); });
    return cont;
  }

  // ---------- Pantallas ----------
  function vistaInicio() {
      const saludoNombre = (function () {
      try { return (JSON.parse(localStorage.getItem("mascoteros_datos_v1") || "{}").nombre || "").split(" ")[0]; } catch (e) { return ""; }
    })();
    if (saludoNombre) vista.appendChild(el("p", "saludo", "Hola, " + saludoNombre + " 👋"));
    vista.appendChild(el("h2", "titulo", "¿Para quién compramos hoy?"));
    const nov = cajaNovedades();
    if (nov) vista.appendChild(nov);
    setTimeout(function () {
      const info = cajaInfo();
      const enInicio = !location.hash.replace(/^#\/?/, "");
      if (info && enInicio && !vista.querySelector(".info-caja")) vista.appendChild(info);
    }, 0);

    const enOferta = productos.filter(function (p) { return p.oferta && p.stock > 0; });
    if (enOferta.length) {
      const banner = el("a", "banner-ofertas");
      banner.href = enlace("ofertas");
      banner.appendChild(el("strong", "", "🔥 Ofertas de la semana"));
      banner.appendChild(el("span", "", enOferta.length + (enOferta.length === 1 ? " producto" : " productos") + " con descuento · tocá para verlos"));
      vista.appendChild(banner);
    }
    vista.appendChild(buscador(""));

    const g = el("div", "baldosas");
    ANIMALES.forEach(function (a) {
      const n = cantidadAnimal(a.clave);
      g.appendChild(baldosa(enlace(a.clave), a.emoji, a.nombre, n ? n + (n === 1 ? " producto" : " productos") : "Próximamente", !n));
    });
    vista.appendChild(g);

    const dest = productos.filter(function (p) {
      return p.stock > 0 && (p.etiquetas.indexOf("oferta") > -1 || p.etiquetas.indexOf("maspedido") > -1 || p.etiquetas.indexOf("nuevo") > -1);
    }).slice(0, 4);
    if (dest.length) {
      vista.appendChild(el("h2", "subtitulo", "⭐ Destacados"));
      vista.appendChild(listaDeTarjetas(dest));
    }
  }

  function vistaAnimal(clave) {
    const a = animalDe(clave);
    vista.appendChild(migas([{ t: "Inicio", h: "#/" }, { t: a.nombre }]));
    vista.appendChild(el("h2", "titulo", a.emoji + " " + a.nombre));
    vista.appendChild(buscador(""));
    const g = el("div", "baldosas");
    categoriasDe(clave).forEach(function (c) {
      g.appendChild(baldosa(enlace(clave, c.nombre), emojiCat(clave, c.nombre), c.nombre,
        c.cantidad + (c.cantidad === 1 ? " producto" : " productos"), false));
    });
    vista.appendChild(g);
  }

  function vistaListado(clave, cat, sub) {
    const a = animalDe(clave);
    const c = categoriasDe(clave).filter(function (x) { return x.nombre === cat; })[0];
    if (!c) { vistaAnimal(clave); return; }

    const items = [{ t: "Inicio", h: "#/" }, { t: a.nombre, h: enlace(clave) }];
    if (sub) { items.push({ t: cat, h: enlace(clave, cat) }); items.push({ t: sub }); }
    else items.push({ t: cat });
    vista.appendChild(migas(items));
    vista.appendChild(el("h2", "titulo", emojiCat(clave, cat) + " " + cat));

    if (c.subs.length > 0) {
      const chips = el("div", "chips");
      const todas = el("a", "chip" + (sub ? "" : " on"), "Todas");
      todas.href = enlace(clave, cat);
      chips.appendChild(todas);
      let activo = sub ? null : todas;
      c.subs.forEach(function (s) {
        const ch = el("a", "chip" + (s === sub ? " on" : ""), s);
        ch.href = enlace(clave, cat, s);
        if (s === sub) activo = ch;
        chips.appendChild(ch);
      });
      vista.appendChild(chips);
      if (activo) setTimeout(function () { chips.scrollLeft = Math.max(0, activo.offsetLeft - 24); }, 0);
    }

    const lista = productos.filter(function (p) {
      return p.animal === clave && p.cat === cat && (!sub || p.sub === sub);
    });

    const barra = el("div", "barra-lista");
    barra.appendChild(el("span", "", lista.length + (lista.length === 1 ? " producto" : " productos")));
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", "Ordenar productos");
    [["destacados", "Orden: destacados"], ["menor", "Menor precio"], ["mayor", "Mayor precio"], ["nombre", "Nombre A-Z"]].forEach(function (o) {
      sel.appendChild(new Option(o[1], o[0]));
    });
    sel.value = orden;
    sel.addEventListener("change", function () { orden = sel.value; render(false); });
    barra.appendChild(sel);
    vista.appendChild(barra);

    if (!lista.length) vista.appendChild(el("p", "vacio", "Todavía no hay productos en esta sección."));
    else vista.appendChild(listaDeTarjetas(ordenar(lista)));
  }

  function vistaBuscar(q) {
    vista.appendChild(migas([{ t: "Inicio", h: "#/" }, { t: "Búsqueda" }]));
    vista.appendChild(el("h2", "titulo", "🔍 Resultados"));
    vista.appendChild(buscador(q));

    const palabras = q.split(/\s+/).map(norm).filter(Boolean);
    const lista = productos.filter(function (p) {
      const texto = norm([p.nombre, p.marca, p.desc, p.cat, p.sub, animalDe(p.animal).nombre].join(" "));
      return palabras.every(function (w) { return texto.indexOf(w) !== -1; });
    });

    if (!lista.length) { vista.appendChild(el("p", "vacio", "No encontramos nada para “" + q + "”. Probá con otra palabra o escribinos por WhatsApp.")); return; }
    vista.appendChild(el("p", "vacio", lista.length + (lista.length === 1 ? " producto encontrado" : " productos encontrados")));
    vista.appendChild(listaDeTarjetas(ordenar(lista)));
  }
  function vistaOfertas() {
    vista.appendChild(migas([{ t: "Inicio", h: "#/" }, { t: "Ofertas" }]));
    vista.appendChild(el("h2", "titulo", "🔥 Ofertas de la semana"));

    const lista = productos.filter(function (p) { return p.oferta && p.stock > 0; })
      .sort(function (a, b) { return b.descuento - a.descuento; });

    if (!lista.length) {
      vista.appendChild(el("p", "vacio", "Esta semana no hay ofertas cargadas. ¡Volvé pronto!"));
      const volver = el("a", "boton-wa", "Ver productos");
      volver.href = "#/";
      vista.appendChild(volver);
      return;
    }

    const fechas = [];
    lista.forEach(function (p) {
      if (p.ofertaHasta) {
        const f = fechaCorta(p.ofertaHasta);
        if (fechas.indexOf(f) === -1) fechas.push(f);
      }
    });
    vista.appendChild(el("p", "oferta-vigencia",
      fechas.length === 1 ? "Vigentes hasta el " + fechas[0] + " o hasta agotar stock." : "Cada producto indica hasta cuándo dura su oferta."));

    vista.appendChild(listaDeTarjetas(lista));

    const comp = el("a", "boton-wa suave", "📲 Compartir las ofertas");
    comp.target = "_blank";
    comp.rel = "noopener";
    comp.href = "https://wa.me/?text=" + encodeURIComponent("🔥 Ofertas de la semana en Los Mascoteros: " + location.origin + location.pathname + "#/ofertas");
    comp.style.marginTop = "16px";
    vista.appendChild(comp);
  }
  function vistaPedido() {
    vista.appendChild(migas([{ t: "Inicio", h: "#/" }, { t: "Mi pedido" }]));
    vista.appendChild(el("h2", "titulo", "🛒 Mi pedido"));

    if (!itemsCarro().length) {
      vista.appendChild(el("p", "vacio", "Todavía no agregaste productos."));
      const volver = el("a", "boton-wa", "Ver productos");
      volver.href = "#/";
      vista.appendChild(volver);
      return;
    }

    if (carroAjustado) {
      vista.appendChild(el("p", "aviso-pedido", "Actualizamos tu pedido según el stock disponible ahora."));
      carroAjustado = false;
    }

    const PAGOS = (typeof CONFIG !== "undefined" && CONFIG.PAGOS && CONFIG.PAGOS.length) ? CONFIG.PAGOS : ["Mercado Pago", "Transferencia", "Efectivo"];
    const REGALO_DESDE = (typeof CONFIG !== "undefined" && Number(CONFIG.REGALO_DESDE)) || 0;
    const REGALO_TEXTO = (typeof CONFIG !== "undefined" && CONFIG.REGALO_TEXTO) || "un regalo";
    const ENVIO_TEXTO = (typeof CONFIG !== "undefined" && CONFIG.ENVIO_TEXTO) || "El costo del envío lo confirmamos por WhatsApp.";

    let entrega = "retiro";

    const lineas = el("div", "pedido-lineas");
    const totales = el("div", "pedido-totales");
    vista.appendChild(lineas);
    vista.appendChild(totales);

    // ----- Datos del pedido -----
    const form = el("form", "pedido-form");
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    const cNombre = el("div", "campo");
    cNombre.appendChild(el("label", "", "Tu nombre (opcional)"));
    const inNombre = document.createElement("input");
    inNombre.type = "text";
    inNombre.maxLength = 60;
    inNombre.autocomplete = "name";
    inNombre.setAttribute("aria-label", "Tu nombre");
    cNombre.appendChild(inNombre);
    form.appendChild(cNombre);

    const cEntrega = el("div", "campo");
    cEntrega.appendChild(el("label", "", "¿Cómo lo recibís?"));
    const botones = el("div", "eleccion");
    const bRetiro = el("button", "eleccion-btn on", "🏪 Retiro");
    const bEnvio = el("button", "eleccion-btn", "🛵 Envío");
    bRetiro.type = "button";
    bEnvio.type = "button";
    botones.appendChild(bRetiro);
    botones.appendChild(bEnvio);
    cEntrega.appendChild(botones);
    form.appendChild(cEntrega);

    const cDir = el("div", "campo");
    cDir.hidden = true;
    cDir.appendChild(el("label", "", "Dirección o barrio"));
    const inDir = document.createElement("input");
    inDir.type = "text";
    inDir.maxLength = 120;
    inDir.autocomplete = "street-address";
    inDir.setAttribute("aria-label", "Dirección o barrio");
    cDir.appendChild(inDir);
    cDir.appendChild(el("small", "nota", ENVIO_TEXTO));
    form.appendChild(cDir);

    const cPago = el("div", "campo");
    cPago.appendChild(el("label", "", "¿Cómo pagás?"));
    const selPago = document.createElement("select");
    selPago.setAttribute("aria-label", "Forma de pago");
    PAGOS.forEach(function (x) { selPago.appendChild(new Option(x, x)); });
    cPago.appendChild(selPago);
    cPago.appendChild(el("small", "nota", "Primero confirmamos el stock y después te pasamos los datos para pagar."));
    form.appendChild(cPago);

    const cNota = el("div", "campo");
    cNota.appendChild(el("label", "", "Aclaraciones (opcional)"));
    const inNota = document.createElement("textarea");
    inNota.maxLength = 250;
    inNota.rows = 2;
    inNota.setAttribute("aria-label", "Aclaraciones");
    cNota.appendChild(inNota);
    form.appendChild(cNota);

    const enviar = el("a", "boton-wa enviar", "💬 Enviar pedido por WhatsApp");
    enviar.target = "_blank";
    enviar.rel = "noopener";
    form.appendChild(enviar);
    form.appendChild(el("p", "nota-pedido", "El pedido queda sujeto a confirmación de stock. No se cobra nada hasta que lo confirmemos."));

    const vaciarCaja = el("div", "vaciar-caja");
    const vaciar = el("button", "boton-link", "Vaciar pedido");
    vaciar.type = "button";
    vaciarCaja.appendChild(vaciar);
    form.appendChild(vaciarCaja);
    vista.appendChild(form);

    function armarMensaje() {
      const items = itemsCarro();
      const l = ["¡Hola Los Mascoteros! Quiero hacer este pedido:", ""];
      items.forEach(function (i) { l.push("• " + i.n + " x " + i.p.nombre + " — " + dinero(i.p.precio * i.n)); });
      l.push("");
      l.push("Total: " + dinero(totalCarro()));
      const dir = inDir.value.trim();
      l.push("Entrega: " + (entrega === "envio" ? "Envío a domicilio" + (dir ? " (" + dir + ")" : "") : "Retiro por el local"));
      l.push("Pago: " + selPago.value);
      if (inNombre.value.trim()) l.push("A nombre de: " + inNombre.value.trim());
      if (inNota.value.trim()) l.push("Aclaraciones: " + inNota.value.trim());
      l.push("");
      l.push("Entiendo que el pedido está sujeto a confirmación de stock.");
      return l.join("\n");
    }

    function actualizarEnlace() { enviar.href = urlWA(armarMensaje()); }

    function pintarLineas() {
      const items = itemsCarro();
      if (!items.length) { render(false); return; }
      lineas.innerHTML = "";
      items.forEach(function (i) {
        const f = el("div", "pedido-linea");
        const info = el("div", "pedido-info");
        info.appendChild(el("strong", "", i.p.nombre));
        info.appendChild(el("span", "pedido-unit", dinero(i.p.precio) + " c/u"));
        f.appendChild(info);
        const der = el("div", "pedido-der");
        der.appendChild(stepper(i.p, i.n));
        der.appendChild(el("span", "pedido-sub", dinero(i.p.precio * i.n)));
        f.appendChild(der);
        lineas.appendChild(f);
      });

      totales.innerHTML = "";
      const total = totalCarro();
      const t = el("div", "pedido-total");
      t.appendChild(el("span", "", "Total"));
      t.appendChild(el("strong", "", dinero(total)));
      totales.appendChild(t);

      if (REGALO_DESDE > 0) {
        const r = el("div", "regalo");
        if (total >= REGALO_DESDE) {
          r.appendChild(el("p", "", "🎁 ¡Sumaste " + REGALO_TEXTO + "!"));
        } else {
          r.appendChild(el("p", "", "🎁 Te faltan " + dinero(REGALO_DESDE - total) + " para sumar " + REGALO_TEXTO));
          const barra = el("div", "regalo-barra");
          const llena = el("div", "regalo-llena");
          llena.style.width = Math.min(100, Math.round((total / REGALO_DESDE) * 100)) + "%";
          barra.appendChild(llena);
          r.appendChild(barra);
        }
        totales.appendChild(r);
      }
      actualizarEnlace();
    }

    function elegir(modo) {
      entrega = modo;
      bRetiro.classList.toggle("on", modo === "retiro");
      bEnvio.classList.toggle("on", modo === "envio");
      cDir.hidden = modo !== "envio";
      actualizarEnlace();
    }
    bRetiro.addEventListener("click", function () { elegir("retiro"); });
    bEnvio.addEventListener("click", function () { elegir("envio"); });
    [inNombre, inDir, inNota].forEach(function (x) { x.addEventListener("input", actualizarEnlace); });
    selPago.addEventListener("change", actualizarEnlace);

    // Vaciar: confirmación dentro de la página (las ventanas emergentes se bloquean en algunos navegadores)
    vaciar.addEventListener("click", function () {
      vaciarCaja.innerHTML = "";
      vaciarCaja.appendChild(el("p", "", "¿Vaciar todo el pedido?"));
      const si = el("button", "boton-wa", "Sí, vaciar");
      si.type = "button";
      const no = el("button", "boton-wa suave", "Cancelar");
      no.type = "button";
      si.addEventListener("click", function () { carro = {}; guardarCarro(); actualizarBarra(); render(false); });
      no.addEventListener("click", function () {
        vaciarCaja.innerHTML = "";
        vaciarCaja.appendChild(vaciar);
      });
      vaciarCaja.appendChild(si);
      vaciarCaja.appendChild(no);
    });

      alCambiarCarro = pintarLineas;
    pintarLineas();

    // Recordar nombre, dirección, entrega y pago para la próxima vez
    function guardarDatos() {
      try {
        localStorage.setItem("mascoteros_datos_v1", JSON.stringify({
          nombre: inNombre.value.trim(), dir: inDir.value.trim(), pago: selPago.value, entrega: entrega
        }));
      } catch (e) { /* sin guardado */ }
    }
    try {
      const g = JSON.parse(localStorage.getItem("mascoteros_datos_v1") || "{}");
      if (g.nombre) inNombre.value = g.nombre;
      if (g.dir) inDir.value = g.dir;
      if (g.pago && PAGOS.indexOf(g.pago) !== -1) selPago.value = g.pago;
      if (g.entrega === "envio") elegir("envio"); else actualizarEnlace();
    } catch (e) { /* sin datos guardados */ }
    [inNombre, inDir].forEach(function (x) { x.addEventListener("input", guardarDatos); });
    selPago.addEventListener("change", guardarDatos);
    bRetiro.addEventListener("click", guardarDatos);
    bEnvio.addEventListener("click", guardarDatos);
    enviar.addEventListener("click", function () {
      medir("pedido_whatsapp", unidadesCarro() + " productos · " + dinero(totalCarro()));
    });
  }
  // ---------- Medición anónima (apagada si EVENTOS_URL está vacío) ----------
  function sesionId() {
    let s = null;
    try { s = sessionStorage.getItem("mascoteros_sesion_tienda"); } catch (e) { /* sin guardado */ }
    if (!s) {
      s = Math.random().toString(36).slice(2, 10);
      try { sessionStorage.setItem("mascoteros_sesion_tienda", s); } catch (e) { /* sin guardado */ }
    }
    return s;
  }

  function medir(evento, detalle) {
    try {
      if (typeof CONFIG === "undefined" || String(CONFIG.EVENTOS_URL || "").indexOf("https://") !== 0) return;
      if (location.protocol === "file:") return;
      const p = new URLSearchParams();
      p.append("tipo", "tienda");
      p.append("evento", evento);
      p.append("detalle", String(detalle || "").slice(0, 120));
      p.append("sesion", sesionId());
      fetch(CONFIG.EVENTOS_URL, { method: "POST", mode: "no-cors", body: p, keepalive: true }).catch(function () {});
    } catch (e) { /* la medición nunca debe romper la tienda */ }
  }

  // ---------- Novedades de la semana ----------
  let novedades = [];

  function fechaFinDia(t) {
    const s = String(t || "").trim();
    if (!s) return null;
    let d, m, y;
    let r = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (r) {
      d = Number(r[1]); m = Number(r[2]); y = Number(r[3]);
    } else {
      r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!r) return null;
      y = Number(r[1]); m = Number(r[2]); d = Number(r[3]);
    }
    if (y < 100) y += 2000;
    const f = new Date(y, m - 1, d, 23, 59, 59);
    return isNaN(f.getTime()) ? null : f;
  }

  function cargarNovedades() {
    if (typeof CONFIG === "undefined" || String(CONFIG.NOVEDADES_URL || "").indexOf("https://") !== 0) return;
    fetch(CONFIG.NOVEDADES_URL)
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (texto) {
        if (!texto) return;
        const filas = parsearCSV(texto);
        if (filas.length < 2) return;
        const enc = filas[0].map(norm);
        const get = function (f, n) {
          const i = enc.indexOf(n);
          return i === -1 ? "" : String(f[i] === undefined ? "" : f[i]).trim();
        };
        const hoy = new Date();
        novedades = filas.slice(1).map(function (f) {
          return { titulo: get(f, "titulo"), texto: get(f, "texto"), hasta: get(f, "hasta"), activo: norm(get(f, "activo")) };
        }).filter(function (x) {
          if (!x.titulo || x.activo === "no") return false;
          const fin = fechaFinDia(x.hasta);
          return !fin || hoy <= fin;
        }).slice(0, 3);
        if (novedades.length && productos.length && !location.hash.replace(/^#\/?/, "")) render(false);
      })
      .catch(function () { /* sin novedades */ });
  }

  function cajaNovedades() {
    if (!novedades.length) return null;
    const caja = el("div", "novedades");
    caja.appendChild(el("p", "novedades-titulo", "📣 Esta semana"));
    novedades.forEach(function (n) {
      const c = el("div", "novedad");
      c.appendChild(el("strong", "", n.titulo));
      if (n.texto) c.appendChild(el("p", "", n.texto));
      caja.appendChild(c);
    });
    return caja;
  }

  // ---------- Horarios, envíos y pagos ----------
  function cajaInfo() {
    const lista = (typeof CONFIG !== "undefined" && Array.isArray(CONFIG.INFO) ? CONFIG.INFO : [])
      .filter(function (i) { return i && i.x && String(i.x).trim(); });
    if (!lista.length) return null;
    const det = el("details", "info-caja");
    det.appendChild(el("summary", "", "ℹ️ Horarios, envíos y formas de pago"));
    const dl = document.createElement("dl");
    lista.forEach(function (i) {
      dl.appendChild(el("dt", "", i.t || ""));
      dl.appendChild(el("dd", "", i.x));
    });
    det.appendChild(dl);
    return det;
  }
  function mensaje(titulo, texto, reintentar, detalle) {
    vista.innerHTML = "";
    const m = el("div", "mensaje");
    m.appendChild(el("h2", "", titulo));
    m.appendChild(el("p", "", texto));
    if (detalle) m.appendChild(el("p", "vacio", "Detalle técnico: " + detalle));
    if (reintentar) {
      const b = el("button", "", "Reintentar");
      b.type = "button";
      b.addEventListener("click", cargar);
      m.appendChild(b);
    }
    vista.appendChild(m);
  }
  // Menú de arriba: marca la sección actual y muestra solo lo que tiene productos
  function actualizarMenu(partes) {
    const menu = document.getElementById("menu");
    if (!menu) return;
    menu.hidden = false;
    const hayOfertas = productos.some(function (p) { return p.oferta && p.stock > 0; });
    const secciones = ["perro", "gato", "roedores", "peces", "ofertas", "pedido"];
    const actual = secciones.indexOf(partes[0]) !== -1 ? partes[0] : "inicio";
    const items = menu.querySelectorAll(".menu-item");
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getAttribute("data-ruta");
      if (r === "perro" || r === "gato" || r === "roedores" || r === "peces") items[i].hidden = !cantidadAnimal(r);
      if (r === "ofertas") items[i].hidden = !hayOfertas;
      items[i].classList.toggle("on", r === actual);
      if (r === actual) items[i].setAttribute("aria-current", "page");
      else items[i].removeAttribute("aria-current");
    }
  }
  // ---------- Navegación ----------
  function render(arriba) {
    vista.innerHTML = "";
    let partes = [];
    try {
      partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    } catch (e) { partes = []; }

        alCambiarCarro = null;
    if (partes[0] === "pedido") {
      vistaPedido();
        } else if (partes[0] === "ofertas") {
      vistaOfertas();
    } else if (partes[0] === "buscar") {
      vistaBuscar(partes.slice(1).join("/"));
    } else if (partes[0] && animalDe(partes[0]) && cantidadAnimal(partes[0])) {
      if (partes[1]) vistaListado(partes[0], partes[1], partes[2] || "");
      else vistaAnimal(partes[0]);
    } else {
            vistaInicio();
    }
    actualizarBarra();
    actualizarMenu(partes);
    if (arriba) window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", function () { if (productos.length) render(true); });

  // ---------- Carga ----------
  function cargar() {
    vista.innerHTML = "";
    vista.appendChild(el("p", "vacio", "Cargando productos…"));

    if (typeof CONFIG === "undefined") {
      mensaje("No se encontró config.js", "Revisá que el archivo se llame exactamente config.js y que esté en la misma carpeta que index.html.", false);
      return;
    }
    if (String(CONFIG.CSV_URL).indexOf("https://") !== 0) {
      mensaje("Falta el link del catálogo", "Pegá el link .csv entre las comillas de CSV_URL, en el archivo config.js.", false);
      return;
    }

    fetch(CONFIG.CSV_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("El servidor respondió " + r.status);
        return r.text();
      })
      .then(function (texto) {
        try {
          productos = armarProductos(parsearCSV(texto));
          sanearCarro();
        } catch (err) {
          console.error(err);
          if (err && err.faltan) {
            mensaje("Hay un detalle en la planilla", "Falta la columna: " + err.faltan.join(", ") + ". Revisá los títulos de la fila 1.", false);
          } else {
            mensaje("No pudimos leer la planilla", "Los datos llegaron, pero no se pudieron interpretar.", true, detalleError(err));
          }
          return;
        }
        if (!productos.length) { mensaje("Todavía no hay productos", "Estamos cargando el catálogo. Volvé en un rato.", false); return; }
        try {
          render(true);
        } catch (err) {
          console.error(err);
          mensaje("Algo falló al mostrar los productos", "Mandanos una captura de este mensaje para arreglarlo.", true, detalleError(err));
        }
      })
      .catch(function (err) {
        console.error(err);
        if (location.protocol === "file:") {
          mensaje("Falta publicar la tienda",
            "Abriste la tienda desde la carpeta de tu computadora, y el navegador no deja que lea la planilla de Google desde ahí. Es normal. Subila a Netlify (arrastrando la carpeta) y abrí la dirección que te da: ahí sí carga el catálogo.", false);
        } else {
          mensaje("No pudimos cargar los productos", "No se pudo conectar con el catálogo. Revisá tu conexión e intentá de nuevo.", true,
            detalleError(err) + " (abierta desde: " + location.protocol + "//" + location.host + ")");
        }
      });
  }

  // ---------- Inicio ----------
  if (typeof CONFIG !== "undefined") {
    document.getElementById("pie-ig").href = "https://instagram.com/" + CONFIG.INSTAGRAM;
    document.getElementById("pie-wa").href = urlWA("¡Hola Los Mascoteros! Quiero hacer una consulta.");
  }
  cargarNovedades();
  let origen = "directo";
  try { if (document.referrer) origen = new URL(document.referrer).hostname || "directo"; } catch (e) { /* sin origen */ }
  medir("visita", origen);
  cargar();
})();
