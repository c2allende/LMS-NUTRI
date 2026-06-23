# AGENTS.md — LMS CNDPR

Plataforma de educación continua del **Colegio de Nutricionistas y Dietistas de Puerto Rico (CNDPR)**.
Proveedor EC Núm. 00062 · Ley Núm. 82 del 31 de mayo de 1972.
Estado: **prototipo demostrativo** — contenido no oficial.

---

## Stack técnico

- HTML5 / CSS3 / JS vanilla — sin frameworks
- Firebase Auth + Firestore v8 (compat SDK) — credenciales pendientes de producción
- `styles/main.css` — design system único, **NUNCA modificar**
- Google Fonts: DM Sans (`ital,wght@0,400;0,500;0,600;1,400`)
- Sin bundler, sin npm, sin TypeScript — archivos estáticos directos

---

## Reglas absolutas

1. **NUNCA modificar `styles/main.css`** — es el design system compartido
2. **NUNCA modificar scripts externos** (`catalog-data.js`, `ui-controller.js`, `auth-guard.js`, etc.)
3. **NUNCA trabajar sobre originales** — siempre crear prototipos primero (`-prototipo-v1.html`, `-v2.html`)
4. **NUNCA inventar contenido académico** — usar solo el provisto por el usuario
5. **Estilos adicionales van en `<style>` dentro del `<head>` de cada archivo** — nunca en main.css
6. **Trabajo incremental**: un archivo a la vez → reporte de validación → aprobación explícita → siguiente
7. **No reemplazar originales** hasta aprobación explícita con la palabra "aprobado"

---

## Flujo de trabajo estándar

```
1. Leer el archivo original
2. Crear prototipo: [nombre]-prototipo-v1.html o [nombre]-v2.html
3. Aplicar cambios al prototipo
4. Entregar reporte de validación contra checklist
5. Esperar aprobación explícita
6. Reemplazar original: Copy-Item [prototipo] [original] -Force (PowerShell)
```

---

## Estructura de archivos

### Páginas públicas (sin autenticación)
| Archivo | Descripción |
|---|---|
| `home.html` | Landing page con hero, catálogo preview, testimonios |
| `catalogo.html` | Catálogo completo con filtros |
| `oferta_detalle.html` | Ficha dinámica de oferta (query param `?id=`) |
| `index.html` | Login / autenticación |

### Dashboard LMS (autenticado)
| Archivo | Descripción |
|---|---|
| `dashboard.html` | Dashboard del estudiante |
| `perfil.html` | Perfil del usuario |

### Oferta E1 — Curso: Manejo Nutricional DM2 (EC-2026-001 | 15h EC | Premium)
| Archivo | Descripción |
|---|---|
| `modulo1_intro.html` | Intro Módulo 1 |
| `leccion1_1.html` | Lección 1.1 |
| `leccion1_2.html` | Lección 1.2 |
| `recursos_modulo1.html` | Recursos del módulo |
| `actividad_modulo1.html` | Actividad práctica |
| `foro_modulo1.html` | Foro de discusión |
| `evaluacion_modulo1.html` | Evaluación |
| `certificado_modulo1.html` | Certificado |
| `modulo2_intro.html` | Intro Módulo 2 (placeholder) |
| `modulo3_intro.html` | Intro Módulo 3 (placeholder) |

### Oferta E2 — Mini-Taller: Conteo CHO (EC-2026-003 | 3h EC | Gratuito)
| Archivo | Descripción |
|---|---|
| `taller_conteo_intro.html` | Intro del taller |
| `taller_conteo_contenido.html` | Contenido teórico |
| `taller_conteo_practica.html` | Calculadora CHO interactiva |
| `taller_conteo_materiales.html` | Materiales descargables |
| `taller_conteo_evaluacion.html` | Evaluación (5 preguntas, 80%) |
| `taller_conteo_certificado.html` | Certificado |

### Oferta E3 — Lectura Dirigida: Microbiota Intestinal (LM-2025-001 | 1h EC | Gratuito)
| Archivo | Descripción |
|---|---|
| `lectura_microbiota_intro.html` | Intro de la lectura |
| `lectura_microbiota_contenido.html` | Lectura con TOC y glosario |
| `lectura_microbiota_evaluacion.html` | Evaluación (5 preguntas, 80%) |
| `lectura_microbiota_certificado.html` | Certificado |

### Oferta E4 — Presentación Temática: Alimentación Plant-Based (PB-2025-001 | 1h EC | Gratuito)
| Archivo | Descripción |
|---|---|
| `presentacion_plantbased_intro.html` | Intro de la presentación |
| `presentacion_plantbased_slides.html` | Visor interactivo de 7 slides con pips, notas e índice |
| `presentacion_plantbased_evaluacion.html` | Evaluación (5 preguntas, 80%) |
| `presentacion_plantbased_certificado.html` | Certificado (código PB2025-XXXXXX) |

### Oferta E5 — Podcast: La Nutrición y el Corazón (POD-2025-001 | 0.5h EC | Gratuito)
| Archivo | Descripción |
|---|---|
| `podcast_nutricoracon_intro.html` | Intro del podcast |
| `podcast_nutricoracon_episodio.html` | Apple Podcasts embed + transcripción con preguntas de reflexión |
| `podcast_nutricoracon_evaluacion.html` | Evaluación (5 preguntas, 80%) |
| `podcast_nutricoracon_certificado.html` | Certificado (código POD2025-XXXXXX) |

### Admin
| Archivo | Descripción |
|---|---|
| `admin_dashboard.html` | Panel de administración |
| `admin_usuarios.html` | Gestión de usuarios |
| `admin_anuncios.html` | Gestión de anuncios |

### Templates y placeholders
`leccion_template.html`, `actividad_template.html`, `recursos_template.html`,
`leccion2_1.html`, `leccion3_1.html`

### Prototipos activos (no reemplazados aún)
| Prototipo | Estado |
|---|---|
| `home-prototipo-v1.html` | Versión obsoleta — referencia `podcast_sindrometabol_intro.html` (inexistente). Descartar |
| `catalogo-prototipo-v1.html` | Versión obsoleta — misma referencia al podcast inexistente. Descartar |
| `lectura_microbiota_intro-v2.html` | Versión intermedia (26 315 B) sin par "final" directo — revisar antes de borrar |

---

## Scripts

| Script | Tipo | Descripción |
|---|---|---|
| `firebase-config.js` | externo | Inicialización Firebase |
| `auth-guard.js` | módulo ES | Redirección si no autenticado |
| `admin-guard.js` | módulo ES | Redirección si no es admin |
| `ui-controller.js` | externo | Sidebar mobile, topbar |
| `catalog-data.js` | externo | Array `CATALOG_OFFERINGS` + `getOfferingById()`, `searchOfferings()` |
| `progress-tracker.js` | externo | Seguimiento de progreso por lección |
| `quiz-controller.js` | externo | Quiz genérico (Módulo 1) |
| `taller-quiz-controller.js` | externo | Quiz del Taller CHO |
| `lectura-microbiota-quiz-controller.js` | externo | Quiz de la Lectura Microbiota |
| `presentacion-quiz-controller.js` | externo | Quiz de la Presentación Plant-Based |
| `podcast-quiz-controller.js` | externo | Quiz del Podcast La Nutrición y el Corazón |
| `cho-calculator.js` | externo | Calculadora de carbohidratos |
| `user-service.js` | externo | Operaciones de usuario en Firestore |
| `perfil-certificados-controller.js` | externo | Repositorio de Certificados en perfil — Storage upload, contador horas EC, fecha renovación licencia |

### Orden de carga de scripts (obligatorio)
```html
<!-- 1. Firebase SDKs (siempre primero) -->
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
<!-- 2. Configuración Firebase -->
<script src="scripts/firebase-config.js"></script>
<!-- 3. UI controller -->
<script src="scripts/ui-controller.js"></script>
<!-- 4. Script específico de la página -->
<script src="scripts/[script-especifico].js"></script>
```

### auth-guard.js (posición en head)
```html
<head>
  ...
  <link rel="stylesheet" href="styles/main.css">
  <script type="module" src="scripts/auth-guard.js"></script>  <!-- type="module" obligatorio -->
</head>
```

---

## Design system

### App Shell (páginas autenticadas)
```
[Banner demo]
.app-shell
  aside.sidebar #lms-sidebar
    .sidebar-brand (logo)
    nav.sidebar-nav (.nav-link, .is-active)
    .sidebar-footer (.sidebar-user, .avatar, .user-info)
  main.main-content
    header.topbar (mobile menu + título + acciones)
    .page-wrapper (contenido de la página)
```

### Patrón de intro de oferta (páginas LMS internas)
```html
<!-- Dentro de .page-wrapper -->
<div class="instruction-box">Aviso importante</div>  <!-- si aplica -->
<div class="offer-hero">                              <!-- hero verde oscuro -->
  <div class="offer-type-badge">...</div>
  <p class="hero-eyebrow">...</p>                    <!-- si hay curso padre -->
  <h1>...</h1>
  <p class="hero-lead">...</p>
  <div class="meta-pills">...</div>
</div>
<div class="offer-layout">                           <!-- 2 columnas -->
  <div>                                              <!-- columna principal -->
    <h2 class="section-title-offer">...</h2>
    <ul class="learning-list">...</ul>               <!-- objetivos con checks -->
    <h2 class="section-title-offer">...</h2>
    <div class="reading-structure">...</div>         <!-- secciones numeradas -->
    <a class="cta-primary">...</a>
    <div class="support-callout">...</div>           <!-- cumplimiento regulatorio -->
  </div>
  <aside>                                            <!-- sidebar derecho -->
    <div class="info-card">
      <div class="info-rows">...</div>               <!-- detalles con íconos SVG -->
      <div class="instruc-box">...</div>             <!-- box ámbar -->
      <a class="cta-sidebar">...</a>
      <div class="instructor-row">...</div>
    </div>
  </aside>
</div>
```

### Tokens locales (bloque `<style>` en cada archivo del patrón)
```css
:root {
  --teal:        #1D9E75;
  --teal-light:  #E1F5EE;
  --teal-dark:   #085041;   /* color del hero */
  --amber:       #EF9F27;
  --amber-light: #FAEEDA;
  --amber-dark:  #633806;
  --card-bg:     #EEECEA;
  --text-main:   #1a1a1a;
  --text-muted:  #4b5563;
  --text-small:  #888780;
  --border:      rgba(0,0,0,0.08);
}
```

### Tarjetas del catálogo (`.offer-card`)
```
fondo: #EEECEA → hover: #E8E6E3 + translateY(-2px)
badge tipo: .card-type-badge (teal) / .card-type-badge.amber — va ANTES del .card-title
  teal: Curso, Taller, Presentación
  amber: Lectura dirigida, Podcast
título: .card-title con .kw-teal (#1D9E75) o .kw-amber (#EF9F27)
footer: .card-icon + .card-meta (horas + badge) + .card-arrow (círculo gris → ámbar en hover)
  .card-footer SIN border-top
filtros: .filter-btn / .filter-btn.active (teal)
grid: .cards-grid (auto-fill, minmax 260px)
  home.html: max-width: 900px centrado
  catalogo.html: sin max-width (llena container-xl)
```

### Colores del hero
- Fondo: `#085041` (verde oscuro)
- Texto: `white` y `rgba(255,255,255,0.8)`
- Badge / pills: `background: rgba(255,255,255,0.15); color: white`
- `.meta-pill.amber`: conserva colores amber (diferenciador)

---

## Evaluaciones y certificados

### Keys de sessionStorage por oferta
| Oferta | Key resultado | Key aprobado |
|---|---|---|
| Módulo 1 | `quiz_result` | `quiz_passed` |
| Taller CHO | `taller_quiz_result` | `taller_quiz_passed` |
| Lectura Microbiota | `quiz_lectura_microbiota_result` | `quiz_lectura_microbiota_passed` |
| Presentación Plant-Based | `quiz_presentacion_plantbased_result` | `quiz_presentacion_plantbased_passed` |
| Podcast Nutrición y Corazón | `quiz_podcast_nutricoracon_result` | `quiz_podcast_nutricoracon_passed` |

### Umbral de aprobación
- Todas las evaluaciones: **80%** (4/5 preguntas correctas en quizzes de 5 preguntas)

### Certificados
- Validación: código aleatorio `[PREFIX]-` + 6 chars `Math.random().toString(36)`
- Print: `@media print { size: letter landscape }` — oculta banner, sidebar, topbar, botón imprimir
- Watermark `PROTOTIPO` con `opacity: 0.08`

---

## Ofertas del catálogo (`catalog-data.js`)

| ID | Tipo | Título corto | Horas | Precio |
|---|---|---|---|---|
| `dm2-actualizacion-clinica` | curso | Manejo Nutricional DM2 | 15h | Premium |
| `conteo-carbohidratos` | taller | Conteo CHO Avanzado | 3h | Gratis |
| *(lectura microbiota)* | lectura | Microbiota Intestinal | 1h | Gratis |
| *(plant-based)* | presentacion | Alimentación Plant-Based | 1h | Gratis |
| *(nutricoracon)* | podcast | La Nutrición y el Corazón | 0.5h | Gratis |

---

## Convenciones de nomenclatura

| Patrón | Uso |
|---|---|
| `[nombre]-prototipo-v1.html` | Primer prototipo de rediseño |
| `[nombre]-v2.html` | Segunda versión (correcciones menores) |
| `[nombre]-v3.html` | Tercera versión |
| `data-page-id="[id]"` | Atributo en `<body>` para identificar la página |
| `data-module-id="[id]"` | Atributo en `<body>` para identificar el módulo |

---

## Firestore — esquema del perfil de estudiante

### Documento raíz `usuarios/{uid}`
| Campo | Tipo | Descripción |
|---|---|---|
| `licenseRenewalDate` | string ISO (YYYY-MM-DD) | Fecha de renovación de licencia profesional |

### Subcolección `usuarios/{uid}/certificados_plataforma`
| Campo | Tipo | Descripción |
|---|---|---|
| `offerTitle` | string | Nombre de la oferta |
| `offerType` | string | Tipo: curso, taller, lectura, presentación, podcast |
| `completedAt` | Timestamp | Fecha de completado |
| `hours` | number | Horas EC |
| `validationCode` | string | Código del certificado |
| `url` | string | Ruta relativa al HTML del certificado |

### Subcolección `usuarios/{uid}/certificados_externos`
| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre del certificado (requerido) |
| `institution` | string \| null | Institución emisora (opcional) |
| `date` | string ISO | Fecha de obtención (requerida) |
| `hours` | number | Horas contacto — múltiplo de 0.5, mín 0.5 (requerido) |
| `fileName` | string | Nombre original del PDF |
| `fileSize` | number | Bytes |
| `storagePath` | string | Ruta completa en Storage |
| `fileUrl` | string | URL de descarga |
| `uploadedAt` | Timestamp | Timestamp del servidor |

### Storage
`usuarios/{uid}/certificados-externos/{timestamp}_{filename}`

---

## Firebase

- SDK v8 compat (no modular) — carga desde CDN de Google
- `firebase-config.js` contiene las credenciales del proyecto
- Auth: email/password — guard en todas las páginas LMS
- Firestore: progreso del estudiante, resultados de evaluaciones
- Estado actual: scaffolding completo, credenciales de producción pendientes

---

## Usuario demo

```
Nombre: Dra. Ana M. Rodríguez
Licencia: 1234
Avatar: "A"
sessionStorage.student_name = 'Dra. Ana M. Rodríguez Vega'
```

---

## Instructoras

| Oferta | Instructora | Credenciales | Avatar |
|---|---|---|---|
| DM2 / Lectura | Lcda. Sofía M. Berríos Colón | MS, RDN, LD, CDCES | SB |
| Taller CHO | Lcda. María L. Torres Rivera | RDN, LD, CDCES | ML |
| Presentación Plant-Based | Lcda. Sofía M. Berríos Colón | MS, RDN, LD, CDCES | SB |
| Podcast Nutrición y Corazón | Lcda. Sofía M. Berríos Colón | MS, RDN, LD, CDCES | SB |
| Coordinadora académica | Lcda. Sofía M. Berríos Colón, RD, CDE | — | — |

---

## Deuda técnica conocida

- **DT-001**: Sidebar "Completados" usa el mismo anchor `#` en todos los ítems
- **DT-002**: Clases utilitarias `.mt-4`, `.mb-4` referenciadas en sidebar sin definición en main.css
- **DT-003**: ✅ Cerrado (2026-06-23) — `lectura_microbiota_contenido-v2.html` y `lectura_microbiota_evaluacion-v2.html` ya reemplazados por sus originales y eliminadas las copias redundantes (byte-idénticas)
