> **Handoff único para Claude Code/Codex.** Este documento fusiona la especificación v0.5.1 con el Anexo de actualización v0.5.1→v0.5.2 (el anexo prevalece en caso de conflicto; ya integrado en el texto, no como apéndice separado). La actualización incorpora: (1) la referencia normativa al AI Omnibus (Reglamento (UE) 2026/1744) verificada contra fuentes oficiales de la UE, (2) dos sub-checks de aplicabilidad en el detector T1, y (3) captura estructurada de señales de la excepción de obviedad. **No amplía el alcance del piloto ni reabre gates ya superados.** Construir por fases; no avanzar de fase sin el gate anterior en verde.

# IAXCORE · AI Transparency Scanner — Especificación de implementación v0.5.2

*Versión de consenso · sustituye a v0.5.1 · incorpora actualización regulatoria y refinamiento de T1*

**Tesis del producto:** una web autónoma que analiza una URL pública, documenta señales observables de transparencia de IA, ofrece correcciones concretas y permite verificar el resultado mediante un informe fechado y firmado. No determina por sí sola el cumplimiento legal del AI Act.

---

## 0. Contexto de producto: dónde encaja este piloto dentro de IAXCORE

IAXCORE es la marca paraguas: un estándar abierto, versionado y basado en evidencia para evaluar calidad, confianza y preparación digital observable de un dominio. No sustituye auditorías legales, de seguridad o accesibilidad manuales; mide señales públicas, reproducibles y comparables. El ciclo de producto completo es **Scan → Fix → Rescan → Verify**, y solo se incorporan utilidades que corrijan un hallazgo de IAXCORE, generen evidencia o refuercen la verificación (quedan fuera de la marca: PDF a Word, unir PDFs, QR de menús/Wi-Fi, facturación, acortadores, eliminación de fondos, transcripción — pueden ser negocios independientes pero diluyen la marca).

**El AI Transparency Scanner (T1/T2/T3) es la primera vertical de ese estándar**, y este documento es su especificación de implementación completa. No se implementa en este piloto: score global multi-área, certificación legal, rankings públicos, verificación de propietario, badge, monitorización, ni el resto de herramientas Fix (Security Headers, robots.txt, Sitemap, Metadata, Favicon/PWA, Image Optimizer, Link Checker) — esas quedan documentadas aquí solo como **referencia de arquitectura futura**, para que el modelo de datos y el motor de reglas del scanner no cierren puertas a que otros inspectores se añadan después con la misma forma (`Evaluation` → `Finding` → `Evidence` → `ReportArtifact`).

Modelo comercial futuro de referencia (no se construye en este piloto): Free (una página, hallazgos limitados, PDF con marca), Pro 12–19 €/mes (dominio completo, histórico, reanálisis, herramientas Fix), Agency 49–99 €/mes (multi-dominio, marca blanca, API limitada), Enterprise (integración y gobierno corporativo).

---

## 1. Decisión ejecutiva

El MVP **no** es un "escáner de cumplimiento del artículo 50". Es un **escáner de señales observables de transparencia de IA**, con un control principal evaluable, un bloque informativo y un bloque experimental **que no se construye en este piloto** (ver §5.3 y §10).

| Elemento | Decisión v0.5.2 |
|---|---|
| Producto | IAXCORE AI Transparency Scanner |
| Entrada | Una URL pública |
| Salida | Informe privado compartible, fechado, con identificador verificable y JSON canónico firmado |
| Control central | T1 · AI Interaction Disclosure (produce 3 sub-findings, ver §5.1) |
| Bloque informativo | T2 · Visible AI Labelling (alcance reducido en el piloto, ver §5.2) |
| Bloque experimental | T3 · Machine-readable Provenance — **fuera del piloto**, solo se define su contrato (ver §5.3) |
| Score global | No se implementa |
| Certificación legal | No se ofrece |
| Intervención humana en runtime | No existe adjudicación manual de resultados |
| Publicación | Privada por defecto; sin rankings ni fichas públicas de terceros |

---

## 2. Hipótesis de producto que se va a probar

| Hipótesis | Cómo se valida | Señal de éxito |
|---|---|---|
| H1. Una persona entiende el valor sin explicación humana. | Landing + URL + informe autocontenido. | La mayoría de escaneos iniciados llega al informe sin soporte. |
| H2. El control de avisos de interacción con IA puede automatizarse con precisión útil. | Fixtures etiquetados y corpus de webs reales. | Muy pocos falsos "action recommended"; alta trazabilidad. |
| H3. El usuario valora más la evidencia y el fix que una nota arbitraria. | Uso de detalle de evidencia, copia del fix y rescan. | Interacción con Fix y repetición del escaneo. |
| H4. El producto puede operar sin una persona como consultor o revisor. | Estados cerrados y resultado determinista. | Los casos inconclusos quedan como tales y no generan tickets de adjudicación. |
| H5. La transparencia IA es una cuña suficientemente diferenciada. | Conversión a expediente completo y rescans. | Interés medible antes de ampliar IAXCORE a otros módulos. |

**No se valida todavía:** que IAXCORE sea un estándar internacional, que exista demanda masiva de suscripción, o que un score global sea defendible. Fuera de alcance hasta que el motor produzca resultados fiables y útiles.

---

## 3. Definición exacta del producto

Propuesta pública de valor: *"Comprueba qué señales de transparencia de IA puede observar un usuario en tu web y qué puedes mejorar."*

| Sí es | No es |
|---|---|
| Un escáner técnico de señales observables. | Una opinión jurídica sobre la empresa. |
| Un informe reproducible con alcance y fecha. | Una auditoría legal completa. |
| Un motor que explica la evidencia encontrada. | Una declaración "cumple/no cumple". |
| Una herramienta que genera fixes y reevalúa. | Una consultoría dependiente de una persona. |
| Una base futura del framework IAXCORE. | El estándar definitivo desde el primer día. |

---

## 4. Límite regulatorio y semántico

El artículo 50 del Reglamento (UE) 2024/1689 se aplica desde el 2 de agosto de 2026. Las guías de la Comisión distinguen obligaciones de proveedores y deployers, y exigen que la información sobre una interacción directa con IA se proporcione desde el inicio, de forma clara, distinguible y accesible [R1][R2].

**Actualización v0.5.2:** el Reglamento (UE) 2026/1744 ("AI Omnibus"), en vigor desde el 27 de julio de 2026, modificó el calendario del AI Act [R6][R7]. Introduce una transición limitada hasta el **2 de diciembre de 2026**, aplicable **exclusivamente al marcado técnico del artículo 50.2** para sistemas generativos puestos en el mercado o en servicio antes del 2 de agosto de 2026 [R8]. Esta transición **no afecta al artículo 50.1** (aviso de interacción con IA), que es el único control evaluable de este piloto (T1). No se implementa ningún cambio de comportamiento en T1 por este motivo; se documenta aquí por trazabilidad y para que `/method` cite la normativa vigente completa, no solo el estado previo al Omnibus.

| Área | Qué puede observar IAXCORE | Qué no puede concluir |
|---|---|---|
| Interacción con IA | Canal conversacional, evidencia de IA, aviso inicial, visibilidad y accesibilidad. | Que todo el sistema cumpla jurídicamente en cualquier contexto. |
| Etiquetado visible | Etiquetas, leyendas y declaraciones visibles junto al contenido. | Que el contenido no etiquetado sea necesariamente generado por IA o esté obligado a etiquetarse. |
| Procedencia técnica | C2PA y otras señales presentes en una muestra de archivos descargables (post-piloto). | Que la ausencia actual de metadatos pruebe incumplimiento o ausencia de marcado en origen. |

**Lenguaje obligatorio:** usar "detectado", "no detectado dentro del alcance", "no verificable", "evidencia insuficiente" y "acción recomendada". Prohibir "cumple", "incumple", "certificado", "seguro", "garantizado" y equivalentes — test automático de copy debe fallar el build si aparecen.

**Excepción de "obviedad" (Art. 50(1)):** existe un caso donde el motor puede concluir de más — un canal obviamente presentado como IA podría estar exento del aviso formal. La Comisión indica que esta excepción debe interpretarse restrictivamente [R2][R8]. La mitigación es de **copy, no de código**: el texto de `action_recommended` dirá siempre "se recomienda añadir un aviso explícito" y **nunca** "falta un aviso obligatorio". El `detail` de ese finding incluye `context_exceptions_note: true` **y**, a partir de v0.5.2, un objeto `obviousness_signals` con evidencia estructurada (ver §5.1 y §15) para que una revisión humana futura no dependa de texto libre.

---

## 5. Módulos del piloto

### 5.1 T1 · AI Interaction Disclosure — módulo principal (único evaluable)

Se ejecuta en tres capas que nunca deben confundirse, y **produce tres sub-findings independientes**, cada uno con su propio `observationStatus`:

1. `t1.channel` — detección de un canal de interacción o chat.
2. `t1.ai_evidence` — evidencia de que el canal utiliza un sistema de IA.
3. `t1.disclosure` — inspección del aviso de interacción con IA antes o al inicio del primer intercambio.

**Actualización v0.5.2 — dos criterios de aplicabilidad añadidos a `t1.channel`:** la aplicabilidad del artículo 50.1 requiere cuatro criterios acumulativos según la guía de la Comisión: (1) sistema de IA, (2) intercambio genuino con personas — no solo recogida de datos o salida automática simple, (3) interacción directa **sin intermediario humano** que comunique el resultado, (4) con **personas físicas** [R2][R8]. La v0.5.1 cubría (1) y (2) implícitamente pero no testeaba (3) ni (4) de forma explícita. Se añade el campo:

```
t1.channel.human_intermediary_detected: boolean
```

- Si el canal enruta a una persona humana que comunica el resultado final (p. ej. "un agente te responderá por email en 24h", formulario sin respuesta automática), `t1.channel` deriva a `not_detected` con `human_intermediary_detected: true`.
- Si el canal es exclusivamente máquina-a-máquina (webhook, API, integración sin exposición a persona física), igualmente `not_detected`.
- Esto es una corrección de **qué cuenta como canal**, no una dimensión nueva de resultado — mismo principio que evitó introducir `applicability` como campo separado en v0.5.1.

El `assessmentStatus` existe **solo a nivel de control T1**, derivado de los tres sub-findings por una función pura y testeada: `deriveT1Assessment(channel, ai_evidence, disclosure)`. No se introduce una dimensión `applicability` separada: lo que faltaba era granularidad de findings, no un campo nuevo.

Tabla de derivación:

| `t1.channel` | `t1.ai_evidence` | `t1.disclosure` | `assessmentStatus` (T1) | Nota |
|---|---|---|---|---|
| `not_detected` (incl. `human_intermediary_detected: true`) | — | — | `not_applicable` | No hay canal conversacional aplicable, o el canal deriva a una persona humana / es máquina-a-máquina. |
| `detected` | `not_detected`, `evidence_of_human: true` | — | `not_applicable` | Chat humano explícito (ver A3 más abajo). Copy: "Se detectó un canal de atención que se declara atendido por personas; las señales de transparencia de IA no aplican dentro del alcance observado." |
| `detected` | `not_detected` (sin evidencia de humano ni de IA) | — | `insufficient_evidence` | Ambigüedad real (p. ej. widget tipo Intercom sin señales en ningún sentido). |
| `detected` | `detected` | `detected`, visible antes del primer input posible | `aligned` | Incluye `disclosure_timing: "on_open"` si el aviso aparece al abrir el panel y antes de poder enviar el primer mensaje (ver A2). |
| `detected` | `detected` | `not_detected` antes del primer input posible | `action_recommended` | Caso más común en el mundo real. |
| `not_assessable` (widget no se puede abrir/inspeccionar) | — | — | `insufficient_evidence` | |
| `error` (el escáner es bloqueado o falla) | — | — | `insufficient_evidence` | |

**Restricción dura:** el motor puede abrir el widget, pero no debe enviar mensajes, crear conversaciones, activar flujos comerciales ni aceptar términos en nombre del visitante.

**Captura de evidencia de obviedad (`obviousness_signals`):** cuando `context_exceptions_note: true` en `t1.disclosure`, el `detail` del finding debe incluir:

```json
"obviousness_signals": {
  "assistant_name_suggests_ai": boolean,
  "assistant_avatar_type": "robot_icon | human_photo | abstract | none",
  "simulates_human_identity": boolean,
  "initial_message_sample": "string (primeros ~200 caracteres)"
}
```

Esto no automatiza ninguna decisión sobre si la excepción de obviedad aplica — el motor sigue sin poder decidirlo. Solo deja evidencia estructurada y reproducible para revisión humana posterior, en línea con la regla de que toda conclusión debe poder vincularse a evidencia, no solo a una nota de texto libre.

### 5.2 T2 · Visible AI Labelling — bloque informativo (alcance reducido para el piloto)

Busca etiquetas y declaraciones visibles sobre contenido generado o manipulado mediante IA. No intenta decidir si un contenido no etiquetado debía estarlo. **Para el piloto se reduce a su mitad barata:**

- Texto visible: "generado con IA", "AI-generated", "synthetic media" y equivalentes multilingües.
- Atributos cercanos a imágenes, audio, vídeo o artículos: `figcaption`, `alt`, `aria-label`.
- Resultado exclusivamente descriptivo: número, localización y tipo de señales encontradas.

**Pospuesto (no en el piloto):** seguir declaraciones de transparencia enlazadas desde la página — amplía el crawl y los falsos positivos de F12.

**Regla dura:** T2 nunca produce `fail` ni `action_recommended` solo por no detectar una etiqueta.

### 5.3 T3 · Machine-readable Provenance — fuera del piloto

**No se construye en este piloto, ni con feature flag.** Es la fase con más riesgo de mantenimiento (Node/C2PA, formatos, CDNs) y cero impacto en la decisión GO/STOP. En Fase 0 se define únicamente su **contrato** (forma del `Detector`, esquema de `Finding`/`Evidence` que usaría) para no cerrar la puerta a construirlo post-piloto:

- C2PA válido, presente pero no validable, o ausente en la muestra.
- IPTC DigitalSourceType y EXIF informativo.
- Número de activos muestreados y errores de descarga.
- Leyenda fija obligatoria en cualquier salida futura: la ausencia observable no demuestra incumplimiento ni ausencia de marcado en origen.

---

## 6. Modelo de resultado

Se separan hechos observados, valoración metodológica y calidad de la inspección. Un único campo `status` no es suficiente, y **T1 no es un único finding sino tres** (§5.1).

| Dimensión | Valores públicos |
|---|---|
| Observation status | `detected` · `not_detected` · `partially_detected` · `not_assessable` · `error` |
| Assessment status | `aligned` · `action_recommended` · `not_applicable` · `insufficient_evidence` · `experimental` |
| Evidence confidence | `high` · `medium` · `low` |
| Scan coverage | páginas seleccionadas / páginas analizadas |
| Detector completeness | `complete` · `partial` · `unavailable` |
| Freshness | fecha/hora UTC y versión metodológica |

`warning` **no existe** en este vocabulario; no debe aparecer en ningún fixture, copy ni código (ver A2 en §12).

Ejemplo de salida T1 (tres líneas):

```
t1.channel:      detected (confidence: high)
t1.ai_evidence:  detected (confidence: high)
t1.disclosure:   not_detected — disclosure_timing: n/a
T1 assessment:   action_recommended
Pages analysed:  4/5
Method:          iaxcore-ai-transparency@0.1.0
```

---

## 7. Experiencia autónoma

| Paso | Acción del sistema | Intervención humana |
|---|---|---|
| 1. Scan | El usuario introduce una URL; se crea una evaluación inmutable. | Ninguna. |
| 2. Observe | El worker navega, registra alcance y recoge evidencia mínima. | Ninguna. |
| 3. Explain | El informe explica observación, valoración, evidencia y limitación. | Ninguna. |
| 4. Fix | Genera un aviso o snippet configurable cuando procede. | El usuario aplica el cambio en su web. |
| 5. Rescan | Una nueva evaluación verifica el cambio y conserva el histórico. | Ninguna adjudicación. |
| 6. Share | Se crea un enlace privado temporal y un **PDF con identificador verificable** (no "PDF firmado", ver A4). | El usuario decide compartirlo. |

**Regla de autonomía en runtime:** si el sistema no puede decidir, devuelve `insufficient_evidence`. No abre un ticket para que una persona decida el resultado. (Excepción explícita: el etiquetado del corpus de validación es trabajo humano *offline*, no en runtime — ver §13.)

---

## 8. Arquitectura candidata

| Componente | Decisión |
|---|---|
| Repositorio | Monorepo TypeScript. |
| Runtime | Node.js 24 LTS fijado a una versión exacta; Node 20 queda descartado por EOL [R3]. |
| Web | Next.js en rama LTS soportada, App Router y Tailwind. |
| Scanner | Worker Node.js independiente con Playwright/Chromium. |
| Base de datos | PostgreSQL + Prisma. |
| Cola | Tabla PostgreSQL con locks, heartbeat, reintentos y `SKIP LOCKED`; sin Redis inicialmente. |
| Evidencias | `EvidenceStore` local en desarrollo, interfaz preparada para S3. |
| PDF | Render de una vista estática del informe mediante Playwright. Contiene `evaluation_id`, hash y enlace/QR a `/verify`. **No lleva firma criptográfica propia.** |
| Firma | Se firma **únicamente el JSON canónico** del informe: Ed25519, `keyId` versionado, clave pública publicada en `/.well-known/iaxcore-keys.json` y mostrada en `/verify`. |
| Verificación | `/verify` acepta `evaluation_id` (verificación por servidor, piloto) **o** el fichero JSON (verificación criptográfica offline, v1.1). |
| C2PA | No se implementa en el piloto (§5.3). Referencia futura: `@contentauth/c2pa-node`, lectura y validación, requiere Node ≥22 [R4]. |

| Estructura mínima del repositorio | Responsabilidad |
|---|---|
| `apps/web` | Landing, formulario, polling, informe y API interna. |
| `apps/worker` | Navegación, detección, evidencia y finalización de trabajos. |
| `packages/core` | Contratos, estados, reglas versionadas, copy y canonicalización. Incluye `deriveT1Assessment()`. |
| `packages/scanner` | Playwright, SSRF guard, selección de páginas y límites. |
| `packages/detectors` | T1 y T2 como módulos independientes. `packages/detectors/signatures/` contiene la base de firmas de proveedores versionada (§ Decisiones que Claude Code no debe tomar solo → B1). T3 solo como contrato/interfaz, sin implementación. |
| `packages/db` | Prisma, repositorios e inmutabilidad. |
| `fixtures` | Casos deterministas positivos, negativos, ambiguos y hostiles. |
| `docs` | Metodología, decisiones y limitaciones. |

---

## 9. Seguridad y privacidad bloqueantes

- SSRF: bloquear localhost, redes privadas, link-local, metadata cloud, IPv4/IPv6 reservadas, puertos no permitidos y redirecciones hacia destinos prohibidos.
- Interceptar todas las solicitudes del navegador, no solo la URL principal; una imagen o script también puede intentar acceder a servicios internos.
- Ejecutar Chromium en contenedor aislado, sin credenciales, sin acceso a la red interna y con un contexto nuevo por evaluación.
- Límites globales: páginas, tiempo, requests, bytes totales, tamaño por recurso, redirecciones y concurrencia.
- **Rate limiting explícito por IP en `POST /api/scans`: cuota diaria + concurrencia máxima de 1 escaneo por IP.** Requisito testeable, no solo implícito en "límites".
- No almacenar HTML completo; guardar únicamente la evidencia mínima necesaria.
- Capturas recortadas al componente relevante y privadas por defecto.
- **Retención diferenciada (evidencia vs. informe verificable):**
  - El **JSON del informe se retiene indefinidamente** (no contiene datos personales; contiene hashes).
  - Las **capturas se purgan a los 90 días** (configurable), conservando su `contentHash` en `Evidence`: el informe sigue siendo verificable por hash aunque la captura ya no sea visualizable.
  - La caducidad del `ShareLink` es independiente y **siempre ≤** retención de capturas.
- Contenido externo siempre escapado; prohibido renderizar HTML capturado con `dangerouslySetInnerHTML`.
- Tokens de compartición almacenados como hash, revocables y con caducidad.

---

## 10. Fases de construcción y prueba

**Ruta crítica (recortada):** Fase 0 → 1 → 2 → 3 → 4 → 7. Objetivo: piloto con usuarios reales en **4–6 semanas**, no 10–12. Fase 5 (T2) no bloquea el lanzamiento del piloto — se ejecuta en paralelo si hay capacidad o se pospone. Fase 6 (T3) es **post-piloto**; en el piloto solo se congela su contrato en Fase 0. **Ninguna fase se reabre por la actualización v0.5.2**; los dos sub-checks de §5.1 se incorporan dentro de Fase 3 (T1 funcional), antes de su gate de salida.

### Fase 0 · Cierre semántico y regulatorio
**Objetivo.** Congelar qué afirma y qué no afirma el producto antes de escribir el motor.
**Entregables.** Matriz obligación/sujeto/evidencia; estados definitivos (incluida la separación en tres sub-findings de T1); diccionario ES/EN; contratos `Detector` para T1, T2 **y T3 (solo interfaz, sin implementación)**; JSON Schema de `Evaluation`, `Finding` y `Evidence` (incluye `human_intermediary_detected` y `obviousness_signals`, ver §5.1 y §15); lista de no objetivos; definición de `deriveT1Assessment()`.
**Pruebas obligatorias.** Tests de copy que bloqueen palabras prohibidas (incluye rechazo de `warning` como estado); validación de todos los ejemplos contra el esquema; revisión de consistencia entre T1 y T2.
**Gate de salida.** No se inicia la navegación hasta que cada resultado posible tenga texto público, alcance y limitación definidos.

### Fase 1 · Plataforma segura e inmutable
**Objetivo.** Demostrar que se pueden crear, ejecutar, guardar y verificar evaluaciones sin detectores funcionales.
**Entregables.** Monorepo; PostgreSQL; cola robusta; API POST/GET con rate limiting por IP; worker; `Evaluation` inmutable; `ShareLink` separado; JSON canónico; **firma Ed25519 del JSON** (no del PDF); Docker Compose.
**Pruebas obligatorias.** Inmutabilidad; doble reclamación de job; recuperación tras caída del worker; firma válida y verificable por `/verify` (por `evaluation_id`); token revocable; migraciones reproducibles; rate limit efectivo por IP.
**Gate de salida.** Una evaluación simulada pasa `queued → running → completed`, no puede alterarse y su firma puede verificarse de forma independiente.

### Fase 2 · Navegación segura y cobertura
**Objetivo.** Construir el crawler mínimo que pueda enfrentarse a webs reales sin convertirse en un riesgo operativo.
**Entregables.** Playwright; selección determinista de hasta cinco páginas; robots.txt; redirecciones; captura de requests; `EvidenceStore`; límites; SSRF completo; **manejo de banner de consentimiento** (aceptación opcional en contexto aislado, registrada como `consent_interaction: accepted_banner` en el manifest — ver B2).
**Pruebas obligatorias.** Fixtures de localhost, metadata cloud, IPv6, DNS rebinding simulado, recursos secundarios internos, bucles, archivos grandes, exceso de requests, bloqueo de bots, y F10 (banner de consentimiento).
**Gate de salida.** Cero bypasses conocidos en la batería SSRF; toda evaluación registra páginas seleccionadas, páginas completadas y causa de cada exclusión.

### Fase 3 · T1 funcional de extremo a extremo
**Objetivo.** Publicar el primer producto útil: detectar interacción con IA y analizar el aviso inicial, con los tres sub-findings separados.
**Entregables.** Base de firmas de proveedores versionada en `packages/detectors/signatures/` con tres clases (`ai_native`, `ambiguous`, `human_first` — ver B1); evidencia de IA separada del canal; apertura pasiva del panel; patrones ES/EN/FR/DE/IT/PT; capturas; selectores; `deriveT1Assessment()`; informe T1 de tres líneas; **detección de `human_intermediary_detected` en `t1.channel`** (§5.1); **captura de `obviousness_signals` cuando `context_exceptions_note: true`** (§5.1).
**Pruebas obligatorias.** Fixtures por proveedor y clase (`ai_native`/`ambiguous`/`human_first`); chat humano (F04 → `not_applicable`); chat IA; aviso explícito (F02 → `aligned` + `disclosure_timing: on_open`); aviso ambiguo; widget inaccesible; iframe cross-origin; shadow DOM; SPA; carga diferida; **intermediario humano explícito (F21 → `not_applicable`)**; **canal máquina-a-máquina (F22 → `not_applicable`)**.
**Gate de salida.** Precisión de `action_recommended` ≥95% en corpus etiquetado; ningún caso sin evidencia de IA puede terminar como fallo; informe comprensible sin explicación externa.

### Fase 4 · Fix y Rescan
**Objetivo.** Cerrar el bucle de valor sin consultoría humana.
**Entregables.** Generador de aviso accesible; variantes por idioma y canal; snippets HTML; instrucciones de ubicación; botón Rescan; comparación entre evaluaciones.
**Pruebas obligatorias.** Fix con texto configurable; contraste y accesibilidad; rescan que conserva ambos informes; detección del aviso después de aplicarlo a fixtures.
**Gate de salida.** Un fixture pasa de `action_recommended` a `aligned` tras aplicar el fix, sin editar la evaluación anterior.

### Fase 5 · T2 informativo (no bloqueante para el piloto)
**Objetivo.** Añadir valor sin convertir la ausencia de una etiqueta en una acusación.
**Entregables.** Patrones visibles y atributos (`figcaption`/`alt`/`aria`) únicamente — sin seguimiento de declaraciones enlazadas; contador; capturas; copy informativo.
**Pruebas obligatorias.** Etiquetas junto a imagen, vídeo y artículo; ausencia; contenido inaccesible; falsos positivos por texto editorial que habla de IA (F12).
**Gate de salida.** T2 nunca produce `fail` ni `action_recommended` solo por no detectar una etiqueta.

### Fase 6 · T3 — post-piloto (fuera de la ruta crítica)
No se ejecuta durante el piloto. Solo existe el contrato definido en Fase 0. Si se retoma post-piloto, mantiene el gate original: se conserva solo si el PoC es estable y no incrementa de forma desproporcionada fallos, tamaño de imagen o mantenimiento.

### Fase 7 · Piloto medido
**Objetivo.** Comprobar funcionamiento real, comprensión y repetición de uso sin convertir al equipo en soporte o consultor. Además, capturar la única señal que falta en todo el diseño: **disposición a pagar**.
**Entregables.** Landing ES/EN; email gate; informe privado; PDF; telemetría; feedback estructurado; límites; panel interno de errores técnicos; **desbloqueo del "expediente completo" con precio visible (p. ej. 149 €) y botón de intención "Solicitar expediente"** que captura el lead cualificado (cobro manual o enlace de pago externo — no se construye pasarela de pago).
**Pruebas obligatorias.** Corpus real privado; pruebas de concurrencia; navegadores; móvil; accesibilidad de la interfaz; retención y borrado; mensajes de error.
**Gate de salida.** Se alcanza la calidad técnica mínima y existen señales de uso de Evidence, Fix o Rescan. Si solo se generan escaneos aislados sin acciones posteriores, se revisa la propuesta antes de ampliar módulos.

---

## 11. Matriz de pruebas

| Familia | Qué prueba | Criterio mínimo |
|---|---|---|
| Unitarias | Normalización, patrones, firmas, estados, canonicalización, `deriveT1Assessment()` y scoring no aplicable. | Cobertura alta en core y cero estados no contemplados (incluye rechazo de `warning`). |
| Fixtures E2E | Casos deterministas T1/T2 y navegación hostil. | 100% de fixtures bloqueantes en verde. |
| Corpus real etiquetado | Precisión y falsos resultados sobre webs variadas. | T1 `action_recommended` con precisión ≥95%; falsos fallos ≤2%. |
| Reproducibilidad | Misma versión, misma evidencia y misma configuración. | Mismo JSON lógico y firma verificable; variaciones explicadas por manifest. |
| Seguridad | SSRF, recursos internos, redirecciones, abuso, contenido hostil y rate limiting por IP. | Cero bypasses en la suite conocida. |
| Carga | Concurrencia y recuperación de workers. | Sin pérdida ni duplicación de evaluaciones; backpressure correcto. |
| Privacidad | Capturas, snippets, retención diferenciada (JSON indefinido / capturas 90 días) y borrado. | No almacenar HTML completo ni datos innecesarios. |
| UX | Comprensión del resultado, errores y fix. | El informe diferencia observación, evaluación y limitación. |
| Copy legal | Palabras prohibidas y descargos. | Test automatizado falla si aparece lenguaje categórico no permitido o el estado `warning`. |

---

## 12. Fixtures mínimos

| ID | Caso | Resultado esperado |
|---|---|---|
| F01 | Chat IA + aviso explícito antes de interacción | T1 `aligned` |
| F02 | Chat IA + aviso visible al abrir el panel, antes del primer input posible | T1 `aligned` + `disclosure_timing: on_open` |
| F02b | Chat IA + aviso ausente antes del primer input posible | T1 `action_recommended` |
| F03 | Chat IA sin aviso, panel inspeccionable | T1 `action_recommended` |
| F04 | Chat humano explícito | `t1.channel: detected` + `t1.ai_evidence: not_detected, evidence_of_human: true` → T1 `not_applicable` |
| F05 | Widget de chat sin evidencia de IA ni de humano (ambiguo real) | T1 `insufficient_evidence` |
| F06 | Sin canal conversacional | T1 `not_applicable` |
| F07 | Launcher no abre | T1 `insufficient_evidence` |
| F08 | Chat en iframe cross-origin | Evidencia parcial; sin falso fallo |
| F09 | Chat en shadow DOM | Detección correcta |
| F10 | Chat cargado tras banner de consentimiento | Escáner acepta el banner en contexto aislado si es identificable con confianza (`consent_interaction: accepted_banner`); si no, cobertura parcial registrada |
| F11 | Texto "generado con IA" junto a imagen | T2 `detected` |
| F12 | Artículo que menciona "IA generativa" sin ser etiqueta | T2 sin falso positivo |
| F13 | Sin etiquetas visibles | T2 `not_detected`, sin fallo |
| F17 | Redirección a localhost | Evaluación abortada por SSRF |
| F18 | Imagen que apunta a metadata cloud | Request bloqueada |
| F19 | Página con 20.000 requests | Límite global y error controlado |
| F20 | Contenido HTML hostil en snippet | Escapado; sin XSS |
| **F21** *(nuevo v0.5.2)* | **Chat que deriva explícitamente a "un agente humano te contactará por email" sin respuesta automática de IA** | **`t1.channel: not_detected` (`human_intermediary_detected: true`) → T1 `not_applicable`** |
| **F22** *(nuevo v0.5.2)* | **Endpoint exclusivamente máquina-a-máquina sin exposición a persona física (ej. webhook documentado)** | **`t1.channel: not_detected` → T1 `not_applicable`** |

*F14–F16 (C2PA) se retiran del piloto junto con T3; quedan documentadas en el contrato de Fase 0 para cuando se retome T3 post-piloto.*

---

## 13. Métricas del piloto

| Categoría | Métrica | Umbral de decisión |
|---|---|---|
| Calidad | Precisión de T1 `action_recommended` | ≥95% en corpus etiquetado. |
| Calidad | Falsos fallos T1 | ≤2%. |
| **Utilidad** | **% de escaneos con canal detectado que terminan en `insufficient_evidence`** | **Alarma si >40%; STOP/ITERATE si >60%. Si se dispara, la respuesta es ampliar la base de firmas `ai_native`, no relajar la semántica.** |
| Operación | Escaneos completados sin error de infraestructura | ≥90% en dominios soportados. |
| Operación | Tiempo total de escaneo | p95 ≤180 segundos para cinco páginas. |
| Seguridad | Bypasses SSRF conocidos | 0. |
| Uso | Usuarios que abren evidencia detallada | Señal positiva si ≥20%. |
| Uso | Usuarios que copian o descargan un fix | Señal positiva si ≥10% de informes accionables. |
| Uso | Rescan tras informe accionable | Señal positiva si ≥8%. |
| Captación | Desbloqueo del expediente completo por email | Señal positiva si ≥8%. |
| **Ingreso** | **Clics en botón "Solicitar expediente" (precio visible)** | **Señal positiva si ≥3% de informes accionables; 0% tras 100 informes accionables = señal válida para STOP/PIVOT.** |
| Autonomía | Casos que requieren decisión humana **en runtime** | 0; deben quedar inconclusos. **Excepción documentada:** el etiquetado del corpus de validación (ground truth para el 95%) es trabajo humano *offline*, no en runtime, y debe planificarse (~2–4 h por cada 50 webs). |

*Interpretación: los umbrales de producto no son promesas comerciales; son criterios iniciales para decidir si ampliar, simplificar o detener el desarrollo.*

---

## 14. Páginas del producto en el piloto

| Ruta | Función |
|---|---|
| `/` | Landing, propuesta, URL y ejemplos de lo que se observa. |
| `/scan/{evaluationId}` | Progreso, páginas seleccionadas y estado de detectores. |
| `/r/{shareToken}` | Informe privado compartible y verificable. |
| `/method` | Metodología 0.1, estados, límites, referencias (incluye AI Omnibus, R6–R8) y comportamiento documentado del banner de consentimiento. |
| `/fix/ai-disclosure` | Generador autoservicio del aviso T1. |
| `/verify` | Verificador por `evaluation_id` (piloto) o JSON canónico (v1.1); muestra clave pública. |
| `/privacy` | Tratamiento, retención diferenciada (JSON indefinido / capturas 90 días) y borrado de evidencias. |
| `/bot` | Identidad del crawler, comportamiento (incluida interacción con banners de consentimiento) y contacto técnico. |

---

## 15. Modelo de datos mínimo

| Entidad | Campos esenciales |
|---|---|
| `Evaluation` | `id`, `requestedUrl`, `finalUrl`, `status`, `methodVersion`, `timestamps`, `pagesRequested`, `pagesAnalyzed`, `manifest` (incluye `consent_interaction`), `reportHash`, `signatureId`. |
| `ScanJob` | `evaluationId`, `attempts`, `maxAttempts`, `availableAt`, `lockedAt`, `lockedBy`, `heartbeatAt`, `lastError`, `finishedAt`. |
| `Finding` | `evaluationId`, `detectorId` (incluye `t1.channel`, `t1.ai_evidence`, `t1.disclosure` como filas separadas, más el finding agregado `t1.assessment`), `observationStatus`, `assessmentStatus`, `confidenceBand`, `summaryKey`, `detail` JSON (incluye `disclosure_timing`, `evidence_of_human`, `context_exceptions_note`, **`human_intermediary_detected`** *(nuevo v0.5.2, en `t1.channel`)*, **`obviousness_signals`** *(nuevo v0.5.2, objeto en `t1.disclosure` cuando aplica context_exceptions_note)*). |
| `Evidence` | `findingId`, `kind`, `location`, `observedAt`, `contentHash`, `storagePath/payload` (purgable a 90 días conservando `contentHash`), `method`, `origin`. |
| `ReportArtifact` | `evaluationId`, `format`, `canonicalHash`, `signature` (Ed25519, solo sobre el JSON), `keyId`, `createdAt`. |
| `ShareLink` | `reportArtifactId`, `tokenHash`, `expiresAt` (≤ retención de capturas), `revokedAt`, `lastAccessedAt`. |
| `Lead` | `email`, `evaluationId`, `consent fields`, `priceInterestClicked` (bool, para métrica de ingreso), `createdAt`; separado del informe. |

---

## 16. Riesgos y respuesta prevista

| Riesgo | Impacto | Respuesta |
|---|---|---|
| Confundir chat con IA | Falso resultado reputacional. | Separar canal, evidencia IA y aviso en tres findings; no evaluar sin evidencia suficiente; chat humano explícito → `not_applicable`, no `insufficient_evidence`. |
| Widget inaccesible o bloqueado | Cobertura baja. | `not_assessable` + alcance visible; nunca convertir bloqueo en fallo. |
| Crawler inseguro | Riesgo crítico de infraestructura. | Aislamiento, interceptación de recursos y fase SSRF bloqueante. |
| Capturas con datos personales | Riesgo de privacidad. | Sesión limpia, recorte, minimización, retención diferenciada (90 días) y borrado. |
| Producto percibido como dictamen legal | Riesgo jurídico y reputacional. | Copy controlado, metodología pública y no usar compliance/certified; nunca "falta un aviso obligatorio". |
| Alta variabilidad en webs reales | Mantenimiento elevado. | Lista explícita de capacidades soportadas y estados inconclusos; base de firmas versionada y ampliable. |
| Mayoría de escaneos termina en `insufficient_evidence` | Informes correctos pero inútiles; mata H1, H3 y H5 a la vez. | Métrica dedicada (§13); ampliar base de firmas `ai_native`, no relajar semántica. |
| Poco interés más allá del escaneo curioso | Sin negocio recurrente. | Medir Fix/Rescan/pago antes de añadir módulos o monitorización. |
| Dependencia de una persona | No escala. | Sin revisión manual en runtime; todo caso no resoluble permanece inconcluso. |
| **Cita normativa parcialmente superada** *(nuevo v0.5.2)* | Referencias en `/method` quedan incompletas si no reflejan el AI Omnibus (2026/1744). | R2 se complementa con R6–R8; sin registro de fuentes versionado en este piloto (deuda documentada para v1.1, §18). |
| **El mercado se ocupa durante la construcción** (ya existen aiactscanner.com, disclosekit.com, getregula.com) | La ventana de 6–18 meses se consume en ingeniería. | La vía comercial manual (informes vendidos a despachos/agencias con auditoría a mano) corre **en paralelo desde la semana 1** y no espera al piloto; el piloto valida el producto autoservicio, no la existencia de demanda. |

---

## 17. Decisiones Go / Iterate / Stop

| Decisión | Condiciones |
|---|---|
| GO a beta pública | T1 supera calidad; cero fallos críticos de seguridad; informe comprensible; Fix y Rescan funcionan; retención y firma verificadas. |
| ITERATE | T1 es útil pero falla en familias concretas de widgets; usuarios consultan evidencia pero no usan Fix; tiempos o cobertura necesitan ajuste. |
| STOP / PIVOT | No se puede mantener precisión sin revisión humana en runtime; el crawler exige mantenimiento desproporcionado; no existe uso del Fix/Rescan; 0% de clics en el botón de precio tras 100 informes accionables; el producto se percibe como simple curiosidad. |
| AMPLIAR IAXCORE | El piloto demuestra repetición y valor; entonces se añaden verificación de propietario, Evidence Challenge, monitorización, T3 y otros inspectores. |

---

## 18. Después del piloto

| Versión futura | Capacidad |
|---|---|
| v1.1 | Registro opcional, verificación DNS/archivo/meta, gestión de dominios y verificación criptográfica offline del JSON en `/verify`. **Añadido v0.5.2:** registro de fuentes normativas versionado con campo `is_current_for_amendments` por fuente; `Evaluation.methodVersion` referencia una versión concreta del ruleset en lugar de un string libre. |
| v1.2 | Evidence Challenge automático y reevaluación parcial. |
| v1.3 | Monitorización, histórico, alertas y badge voluntario. |
| v1.4 | T3 (Machine-readable Provenance) retomado con su contrato ya definido en Fase 0; IAXCORE Content Check para archivos o URLs concretas. |
| v2 | HTTP Trust y Technical Integrity bajo el mismo framework de evidencia; posible incorporación de otras herramientas Fix (Security Headers, robots.txt, Sitemap, Metadata, Favicon/PWA) bajo el mismo ciclo Scan→Fix→Rescan→Verify. |
| Largo plazo | Metodología abierta, comparabilidad y posible emergencia de un estándar por adopción; no por declaración. |

---

## 19. Instrucción maestra para Claude Code / Codex

> Actúa como arquitecto principal e implementador de IAXCORE AI Transparency Scanner v0.5.2. Construye por fases y no avances si el gate anterior no está en verde: **Fase 0 → 1 → 2 → 3 → 4 → 7**, con Fase 5 (T2) en paralelo no bloqueante y Fase 6 (T3) explícitamente fuera del piloto — en Fase 0 define solo su contrato de interfaz, sin implementarlo. Antes de modificar código, inspecciona el repositorio, documenta el estado, crea un plan de cambios y define criterios de aceptación.
>
> El producto analiza señales públicas observables; no determina cumplimiento legal. Implementa primero los contratos y estados, después la plataforma inmutable, luego el navegador seguro y solo entonces T1.
>
> **T1 debe producir tres sub-findings independientes** (`t1.channel`, `t1.ai_evidence`, `t1.disclosure`), cada uno con su propio `observationStatus`. **`t1.channel` debe además evaluar `human_intermediary_detected`**: un canal que deriva a una persona humana para comunicar el resultado, o que es exclusivamente máquina-a-máquina sin exposición a persona física, deriva a `not_detected` → T1 `not_applicable`. El `assessmentStatus` de T1 se deriva únicamente mediante la función pura `deriveT1Assessment()`, testeada exhaustivamente. Nunca emitas `action_recommended` sin evidencia suficiente de que el canal utiliza IA. Un chat que se declara explícitamente humano (`evidence_of_human: true`) debe resolver en `not_applicable`, nunca en `insufficient_evidence`. El estado `warning` no existe en ningún vocabulario del sistema — si aparece en un fixture, en el copy o en el código, es un bug. Un aviso visible al abrir el panel y antes del primer input posible es `aligned` con `disclosure_timing: "on_open"`. No envíes mensajes a widgets, no crees conversaciones, no aceptes términos en nombre del visitante.
>
> Cuando `context_exceptions_note: true` en `t1.disclosure`, captura además `obviousness_signals` (nombre del asistente, tipo de avatar, si simula identidad humana, muestra del mensaje inicial) como evidencia estructurada — esto no cambia el `assessmentStatus`, solo documenta la señal para revisión humana futura.
>
> La base de firmas de proveedores (`packages/detectors/signatures/`) clasifica cada proveedor en `ai_native`, `ambiguous` o `human_first`, versionada; amplíala cuando la métrica de `insufficient_evidence` (§13) se dispare, sin relajar la semántica de los estados.
>
> T2 es informativo y se limita en el piloto a patrones de texto visibles y atributos (`figcaption`/`alt`/`aria`) — no sigas declaraciones enlazadas desde la página. T2 nunca produce una conclusión legal negativa ni falla por ausencia de etiqueta.
>
> El escáner puede aceptar el banner de consentimiento de cookies como parte del flujo, en contexto aislado y desechable, registrándolo como `consent_interaction: accepted_banner` en el manifest; documenta este comportamiento públicamente en `/bot` y `/method`. Si el banner no es identificable con confianza, no interactúes y registra cobertura parcial.
>
> Usa Node.js 24 LTS fijado exactamente, Next.js en rama LTS soportada, PostgreSQL, Prisma y Playwright. La cola PostgreSQL debe gestionar locks, heartbeat, reintentos y recuperación de workers, con `SKIP LOCKED`. Protege todas las solicitudes del navegador contra SSRF (no solo la URL principal) y aísla la ejecución en un contexto nuevo por evaluación, sin credenciales ni acceso a red interna. Implementa rate limiting por IP en `POST /api/scans`: cuota diaria y concurrencia máxima de 1.
>
> Las evaluaciones completadas son inmutables. Canonicaliza el JSON del informe, calcula su hash y **fírmalo con Ed25519** (`keyId` versionado, clave pública en `/.well-known/iaxcore-keys.json`). **El PDF no lleva firma propia**: contiene `evaluation_id`, hash y un enlace/QR a `/verify`, que en el piloto verifica por `evaluation_id` contra el servidor (la verificación offline del JSON queda para v1.1). Separa `Evaluation`, `ReportArtifact` y `ShareLink`.
>
> No almacenes HTML completo; minimiza capturas y datos. Aplica retención diferenciada: el JSON del informe se retiene indefinidamente (no contiene datos personales); las capturas se purgan a los 90 días conservando su `contentHash`; la caducidad del `ShareLink` es siempre ≤ retención de capturas.
>
> Todo copy visible sale de diccionarios ES/EN y un test automático debe prohibir palabras como `compliant`, `certified`, `secure`, `cumple` o `incumple`, y también el estado `warning`. El texto de `action_recommended` dirá siempre "se recomienda añadir un aviso explícito", nunca "falta un aviso obligatorio"; cuando aplique, añade `context_exceptions_note: true` al `detail`.
>
> En `/method`, cita el marco normativo completo vigente: Reglamento (UE) 2024/1689 (art. 50) y su modificación por el Reglamento (UE) 2026/1744 (AI Omnibus, en vigor desde el 27 de julio de 2026), que introduce una transición hasta el 2 de diciembre de 2026 aplicable exclusivamente al marcado técnico del art. 50.2 — sin efecto sobre T1.
>
> Crea fixtures y pruebas antes o junto a cada detector, incluyendo los fixtures F02 (`aligned` + `disclosure_timing: on_open`), F04 (`not_applicable`), F10 (banner de consentimiento), **F21 (intermediario humano → `not_applicable`) y F22 (máquina-a-máquina → `not_applicable`)**. No avances con tests en rojo. Mantén ADRs, changelog metodológico y una lista explícita de limitaciones.
>
> En Fase 7, añade el desbloqueo del "expediente completo" con precio visible (p. ej. 149 €) y un botón de intención "Solicitar expediente" que capture el lead cualificado, sin construir pasarela de pago (cobro manual o enlace externo).
>
> No implementes login, pagos automatizados, rankings, score global, verificación de propietario, badge, monitorización, Evidence Challenge, T3 ni registro de fuentes versionado (v1.1) durante este piloto.

---

## 20. Preguntas para revisor externo — estado tras la actualización v0.5.2

| # | Pregunta | Estado |
|---|---|---|
| 1 | ¿La división T1 evaluable / T2 informativo / T3 experimental resuelve adecuadamente el problema de mezclar obligaciones y sujetos distintos? | **Abierta** — pendiente de validación con el piloto real. |
| 2 | ¿Existe algún caso de T1 en el que el motor siga concluyendo demasiado, respecto a la excepción de interacción "obvia"? | **Resuelta.** Sí existe; mitigación en copy (§4), no en código: `action_recommended` nunca dice "falta un aviso obligatorio"; `context_exceptions_note: true` + `obviousness_signals` estructurados en el detail. |
| 3 | ¿Los estados `observationStatus`/`assessmentStatus` son suficientes o falta `applicability`? | **Resuelta.** No falta una dimensión nueva; faltaba granularidad de findings y de criterios de canal — de ahí los tres sub-findings de T1 (§5.1) y el nuevo `human_intermediary_detected`. |
| 4 | ¿Los gates y métricas permiten detener el proyecto antes de acumular complejidad? | **Reforzada** — métrica de tasa de `insufficient_evidence` (§13) y criterio de 0% de clics en precio tras 100 informes (§17). |
| 5 | ¿Qué parte del piloto sigue dependiendo implícitamente de revisión humana o supuestos que el motor no puede conocer? | **Resuelta.** El etiquetado del corpus de validación (ground truth) es trabajo humano offline planificado (~2–4h/50 webs, §13); es la única dependencia humana reconocida, y es offline, no runtime. |
| 6 | ¿Qué debería eliminarse todavía para que el primer producto sea pequeño, defendible y autoservicio? | **Resuelta.** T3 fuera del piloto por completo; T2 reducido a su mitad barata; `/verify` simplificado a verificación por `evaluation_id` en el piloto (§10-C). |
| **7** *(nueva v0.5.2)* | **¿El marco normativo citado en `/method` refleja el AI Omnibus (Reglamento 2026/1744)?** | **Resuelta.** Añadidas referencias R6–R8; confirmado que la transición del Omnibus no afecta a T1 (§4). |
| **8** *(nueva v0.5.2)* | **¿`t1.channel` distingue correctamente interacción directa con persona física de intermediación humana o flujo máquina-a-máquina?** | **Resuelta.** Nuevo campo `human_intermediary_detected` y fixtures F21/F22 (§5.1, §12). |

---

## 21. Decisiones que Claude Code no debe tomar solo (ya resueltas aquí, documentadas para trazabilidad)

Estas seis decisiones de producto ya están tomadas en este documento — se listan explícitamente para que no se reabran ni se reinterpreten durante la implementación:

- **B1 — Taxonomía de evidencia de IA:** tres clases versionadas (`ai_native`, `ambiguous`, `human_first`) en `packages/detectors/signatures/` (§5.1, §8, §10-Fase 3). Es el detector más difícil del producto; su base de firmas requiere mantenimiento humano continuo (curación de proveedores), no solo ingeniería.
- **B2 — Muros de consentimiento:** el escáner puede aceptar el banner de cookies de forma controlada y documentada públicamente (§10-Fase 2, §19).
- **B3 — Métrica de tasa de informes inconclusos:** añadida a §13, con umbral de alarma y respuesta predefinida (ampliar firmas, no relajar semántica).
- **B4 — Test de disposición a pagar:** añadido a Fase 7 (§10, §13, §17), sin construir pasarela de pago.
- **B5** *(nueva v0.5.2)* **— Criterios de aplicabilidad de canal:** intermediario humano y máquina-a-máquina excluyen `t1.channel` de `detected` (§5.1); no se crea un `assessmentStatus` nuevo para esto.
- **B6** *(nueva v0.5.2)* **— Registro de fuentes versionado:** explícitamente pospuesto a v1.1 (§18); no se implementa en el piloto aunque el AI Omnibus ya demostró que es necesario a medio plazo.

---

## 22. Referencias verificadas

| Ref. | Fuente |
|---|---|
| R1 | Reglamento (UE) 2024/1689, artículo 50, EUR-Lex. |
| R2 | Comisión Europea, "Transparency obligations under Article 50 of the AI Act", actualizado el 24 de julio de 2026. *Nota v0.5.2: esta fecha es anterior a la entrada en vigor del AI Omnibus (27 de julio de 2026, R6) — verificar si la página ya refleja el Omnibus antes de citarla como única fuente en `/method`; complementar con R6–R8.* |
| R3 | Node.js Releases: Node 24 figura como LTS y Node 20 como EOL a 2 de agosto de 2026. |
| R4 | Content Authenticity Initiative, documentación oficial de `@contentauth/c2pa-node`: lectura y validación de C2PA; Node.js ≥22. |
| R5 | Análisis de Fable aportado por el usuario: "IAXCORE — Escáner de Transparencia IA (Art. 50 AI Act) · MVP v1". |
| **R6** *(nueva v0.5.2)* | **Reglamento (UE) 2026/1744 ("AI Omnibus"), en vigor desde el 27 de julio de 2026. EUR-Lex: `eli/reg/2026/1744/oj/eng`.** |
| **R7** *(nueva v0.5.2)* | **Versión consolidada del Reglamento (UE) 2024/1689 a 27 de julio de 2026. EUR-Lex: `CELEX:02024R1689-20260727`.** |
| **R8** *(nueva v0.5.2)* | **AI Act Service Desk, cronología de implementación — confirma transición limitada al art. 50.2 hasta el 2 de diciembre de 2026 para sistemas preexistentes cubiertos.** |

---

## 23. Resumen para decisión

**Producto que se propone testear:** una web privada por defecto que recibe una URL y produce un informe con identificador verificable sobre señales observables de transparencia IA. T1 (tres sub-findings: canal, evidencia de IA, aviso) determina si existe evidencia suficiente de una interacción con IA y si se observó un aviso inicial; T2, en su versión reducida, registra etiquetas visibles. T3 queda fuera del piloto. El sistema ofrece un fix, reescanea, mide disposición a pagar y nunca requiere que una persona decida un caso en runtime.

**Criterio de continuidad:** no se amplía IAXCORE hasta demostrar cuatro cosas: precisión alta de T1, seguridad operativa del crawler, uso real del ciclo Evidence → Fix → Rescan, y al menos una señal de disposición a pagar. El "estándar" queda como posible resultado de adopción futura, no como promesa de lanzamiento.

*v0.5.2 · Documento de consenso · integra actualización regulatoria (AI Omnibus) y refinamiento de T1 (human_intermediary_detected, obviousness_signals) · listo para handoff a Claude Code.*
