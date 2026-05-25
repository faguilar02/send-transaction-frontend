# Estado actual del frontend

## 1. Resumen general

Hoy el frontend funciona como un simulador automático de transacciones pensado para una demo académica. El usuario configura algunos valores simples y el sistema envía solicitudes reales al backend mediante el endpoint público `/api/fraud/predict/batch`.

La lógica ya no depende de un envío manual puntual. Ahora la aplicación puede iniciar una simulación, repetir envíos por ciclos y mostrar un estado claro de ejecución, pausa o detención.

## 2. Cómo era la versión inicial

La versión inicial era un formulario manual en la página principal. El usuario elegía un `sample_size`, una `strategy` y, en algunos casos, un `random_seed`, y luego presionaba un botón para crear un job de análisis de fraude.

El flujo inicial era simple: se armaba un body con esos datos, se hacía un `POST` único al backend y se mostraba una respuesta básica con el `job_id` recibido. La pantalla estaba orientada más a un envío puntual que a una simulación continua.

## 3. Qué cambió en la versión actual

El cambio más importante está en la lógica de uso: el frontend pasó de un formulario manual a un simulador automático que repite envíos de forma periódica.

En la estructura del código, la responsabilidad quedó separada en piezas más claras. `hooks/use-transaction-simulator.ts` concentra el estado y el ciclo automático; `components/transaction-simulator.tsx` contiene la interfaz visual; `app/page.tsx` quedó muy limpio y solo renderiza el componente principal.

En la interfaz también hubo un cambio fuerte. La versión actual redujo la cantidad de bloques técnicos, retiró varias métricas secundarias y reemplazó textos administrativos por explicaciones simples y naturales.

En la experiencia de usuario, la pantalla ahora se entiende rápido: el usuario configura lo básico, inicia la simulación y ve un resumen corto de lo que hará el sistema.

## 4. Estado funcional actual

Actualmente el frontend puede:

- iniciar la simulación
- pausar la simulación
- reanudar la simulación
- detener la simulación
- configurar el intervalo de envío
- configurar la cantidad por ciclo
- seleccionar la estrategia de simulación
- mostrar el estado actual
- mostrar un resumen dinámico en lenguaje natural

Además, sigue enviando `POST` reales al backend público en `https://models-api-fraud.chiqo.site/api/fraud/predict/batch`.

## 5. Arquitectura actual

- `app/page.tsx`: actúa como entrada de la página y solo monta el simulador.
- `components/transaction-simulator.tsx`: contiene la interfaz principal, los controles y el resumen visible para el usuario.
- `hooks/use-transaction-simulator.ts`: maneja la lógica automática, los estados de la simulación, el intervalo, el `fetch` real, el `AbortController` y la validación básica.
- `app/layout.tsx`: define el idioma de la app y los metadatos generales del sitio.

## 6. Cambios visuales y de UX

La interfaz dejó de verse como un panel técnico y pasó a verse como una demo sencilla. Ahora se prioriza una sola tarjeta principal, con menos ruido visual y menos bloques secundarios.

Se redujeron o eliminaron visualmente elementos como:

- métricas de sesión extensas
- historial operativo detallado
- textos sobre scheduler o control anti-saturación
- detalles técnicos como `job_id` o información interna de respuesta, que antes ocupaban más espacio

La versión actual usa frases más humanas y una estructura visual más limpia, centrada en lo que el usuario necesita entender de inmediato.

## 7. Diferencias clave entre versión inicial y actual

| Aspecto | Versión inicial | Versión actual |
|---|---|---|
| Propósito | Enviar un job manual de análisis de fraude | Simular transacciones automáticamente |
| Interacción | Un formulario y un botón de envío | Controles simples para iniciar, pausar y detener |
| Frecuencia de envío | Un `POST` puntual | Envíos periódicos por ciclos |
| Configuración | `sample_size`, `strategy`, `random_seed` | Intervalo, cantidad por ciclo y estrategia |
| Lógica | Vivía casi por completo en `app/page.tsx` | Se separó en hook + componente + página limpia |
| UI | Más técnica y orientada a formulario | Más simple, clara y cercana a una demo |
| Estado visible | Respuesta básica del job | Estado, resumen y validación simple |
| Backend | Envío real al endpoint | Sigue enviando real al mismo endpoint |

## 8. Pendientes o mejoras posibles

Algunas mejoras razonables para una siguiente iteración serían:

- mostrar un indicador más visible de carga mientras llega la respuesta del backend
- permitir guardar una configuración predeterminada para reutilizarla en futuras demos
- añadir una vista opcional de historial breve si en algún momento se quiere mostrar evidencia de los envíos
- exponer el resumen en un formato todavía más visual, por ejemplo con una frase destacada más grande

## 9. Conclusión breve

El frontend evolucionó desde un formulario manual hacia un simulador automático más útil para una demo académica. Hoy mantiene el envío real al backend, pero con una interfaz mucho más simple, clara y fácil de explicar.

La aplicación ya está organizada en un hook de simulación, un componente principal de presentación y una página limpia que solo monta la experiencia final.
