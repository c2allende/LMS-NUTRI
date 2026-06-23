# Instrucciones de Desarrollo y Diseño - LMS_CNDPR

Este documento detalla las directrices críticas para la integración visual y técnica del proyecto, basadas en la auditoría senior de UX/UI.

## 1. Reglas de Oro (Estrictas)
- **No alterar el contenido académico:** Los textos de lecciones, actividades y objetivos son intocables.
- **No frameworks externos:** Prohibido el uso de Tailwind, Bootstrap o similares. Todo debe basarse en `styles/main.css`.
- **Cero colores hardcoded:** No usar `#hex` o `rgb()` en los archivos HTML. Usar exclusivamente las variables de `main.css` (ej. `--color-primary`).
- **Preservar funcionalidad:** No modificar scripts en `scripts/` ni rutas de Firebase sin autorización.
- **Enfoque incremental:** Los cambios se realizan por fases y requieren aprobación previa.

## 2. Flujo de Trabajo por Fases
1. **Fase 1 (Normalización):** Limpieza de estilos inline y validación de enlaces CSS.
2. **Fase 2 (Piloto):** Implementación del App Shell únicamente en `dashboard.html`.
3. **Fase 3 (Replicación):** Extensión del diseño aprobado a las demás páginas.
4. **Fase 4-7 (Refinamiento):** Aplicación de componentes específicos (KPIs, Tablas, DUA).
5. **Fase 8 (Logo):** Integración de versión transparente.
6. **Fase 9 (QA):** Verificación final de accesibilidad y responsive.

## 3. Uso del Design System (`main.css`)
Cualquier nuevo elemento debe usar los tokens definidos:
- **Layout:** `.app-shell`, `.sidebar`, `.topbar`, `.main-content`.
- **Tipografía:** Usar clases como `.text-sm`, `.text-lg`, `.font-display`.
- **Componentes:** `.btn`, `.card`, `.badge`, `.alert`.
- **Instruccional:** `.learning-outcomes`, `.instruction-box`, `.lesson-layout`.

## 4. Contacto y Aprobaciones
Cada fase debe ser presentada con un resumen de cambios y resultados esperados. Solo tras la confirmación del usuario se procede a la siguiente etapa.
