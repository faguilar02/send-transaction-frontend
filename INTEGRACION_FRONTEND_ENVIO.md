# Integración Frontend de Envío de Transacciones

## 🎯 Resumen

El frontend de envío de transacciones **NO requiere autenticación**. Este frontend simula el envío de transacciones al banco para análisis de fraude.

---

## 🔗 URLs Base

```typescript
const API_URL = 'https://models-api-fraud.chiqo.site/api';

// Para desarrollo local:
// const API_URL = 'http://localhost:8000/api';
```

---

## 📤 Endpoint Principal

### Crear Job de Análisis (PÚBLICO - Sin Autenticación)

**Endpoint:**
```
POST /api/fraud/predict/batch
```

**Headers:**
```
Content-Type: application/json
```

**⚠️ NO requiere:**
- ❌ Header `Authorization`
- ❌ Ningún tipo de autenticación

**✅ CORS Configurado:**
- El backend ahora tiene CORS habilitado
- Permite solicitudes desde cualquier origen
- No requiere configuración adicional en el frontend

**Request Body:**
```json
{
  "sample_size": 500,
  "strategy": "balanced",
  "random_seed": 42
}
```

**Parámetros:**
- `sample_size` (int): Cantidad de transacciones a analizar (1-10000)
- `strategy` (string): Estrategia de muestreo
  - `"random"`: Aleatorio (~3.4% fraude)
  - `"balanced"`: 50% fraude, 50% legítimo
  - `"high_fraud_bias"`: 70% fraude, 30% legítimo
- `random_seed` (int, opcional): Semilla para reproducibilidad

**Response (202 Accepted):**
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "message": "Job creado. Use GET /fraud/results/{job_id} para consultar resultado.",
  "estimate_seconds": 1.5
}
```

---

## 💻 Código TypeScript

```typescript
interface BatchRequest {
  sample_size: number;
  strategy: 'random' | 'balanced' | 'high_fraud_bias';
  random_seed?: number;
}

interface JobResponse {
  job_id: string;
  status: string;
  message: string;
  estimate_seconds: number;
}

async function sendTransactions(request: BatchRequest): Promise<JobResponse> {
  const response = await fetch(`${API_URL}/fraud/predict/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Ejemplo de uso
const job = await sendTransactions({
  sample_size: 500,
  strategy: 'balanced',
  random_seed: 42
});

console.log(`Job creado: ${job.job_id}`);
console.log(`Tiempo estimado: ${job.estimate_seconds} segundos`);
```

---

## 🔄 Cambios vs. Versión Anterior

### ✅ Sin Cambios

El endpoint `POST /api/fraud/predict/batch` **sigue siendo público** y funciona exactamente igual que antes:

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| URL | `/api/fraud/predict/batch` | ✅ **Igual** |
| Autenticación | ❌ No requerida | ✅ **Igual** |
| Headers | Solo `Content-Type` | ✅ **Igual** |
| Request Body | `{sample_size, strategy, random_seed}` | ✅ **Igual** |
| Response | `{job_id, status, ...}` | ✅ **Igual** |

### 📝 Notas

- **NO necesitas modificar nada** en este frontend
- Las transacciones creadas serán visibles para todos los empleados en el visor
- Los jobs se procesan en background (2-3 segundos)

---

## 🧪 Testing

### cURL
```bash
curl -X POST http://localhost:8000/api/fraud/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "sample_size": 100,
    "strategy": "balanced",
    "random_seed": 42
  }'
```

### PowerShell
```powershell
$body = @{
    sample_size = 100
    strategy = "balanced"
    random_seed = 42
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/fraud/predict/batch" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### JavaScript/Fetch
```javascript
fetch('http://localhost:8000/api/fraud/predict/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sample_size: 100,
    strategy: 'balanced'
  })
})
.then(res => res.json())
.then(data => console.log('Job creado:', data.job_id));
```

---

## 🎨 Ejemplo de Formulario (HTML + JavaScript)

```html
<form id="sendForm">
  <label>
    Cantidad de transacciones:
    <input type="number" name="sample_size" value="500" min="1" max="10000">
  </label>
  
  <label>
    Estrategia:
    <select name="strategy">
      <option value="random">Aleatorio (~3.4% fraude)</option>
      <option value="balanced" selected>Balanceado (50/50)</option>
      <option value="high_fraud_bias">Alto fraude (70/30)</option>
    </select>
  </label>
  
  <button type="submit">Enviar Transacciones</button>
</form>

<div id="result"></div>

<script>
document.getElementById('sendForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const request = {
    sample_size: parseInt(formData.get('sample_size')),
    strategy: formData.get('strategy'),
    random_seed: Date.now()
  };
  
  try {
    const response = await fetch('https://models-api-fraud.chiqo.site/api/fraud/predict/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    const data = await response.json();
    
    document.getElementById('result').innerHTML = `
      <div class="success">
        ✅ Job creado exitosamente<br>
        ID: ${data.job_id}<br>
        Estado: ${data.status}<br>
        Tiempo estimado: ${data.estimate_seconds}s
      </div>
    `;
  } catch (error) {
    document.getElementById('result').innerHTML = `
      <div class="error">
        ❌ Error: ${error.message}
      </div>
    `;
  }
});
</script>
```

---

## 📊 Flujo Completo

```
Frontend Envío → POST /predict/batch (sin auth)
                      ↓
                Backend procesa (2-3s)
                      ↓
                Guarda transacciones
                      ↓
                Notifica vía WebSocket
                      ↓
           Frontend Visor recibe notificación (con auth)
                      ↓
           Frontend Visor recarga transacciones
```

---

## ❓ FAQ

### ¿Por qué este endpoint NO requiere autenticación?

Porque simula el sistema de envío de transacciones del banco, que es un proceso automatizado separado del sistema de visualización.

### ¿Las transacciones creadas aquí aparecen en el visor?

Sí, todas las transacciones procesadas aparecen en el visor para todos los empleados autenticados.

### ¿Puedo agregar autenticación si quiero?

Sí, pero no es necesario. El endpoint está diseñado para ser público para este caso de uso.

---

## ✅ Checklist

- [ ] Endpoint sigue siendo `/api/fraud/predict/batch`
- [ ] NO agregar headers de autenticación
- [ ] Mantener estructura del request body igual
- [ ] El job_id se puede ignorar (el visor se actualiza automáticamente)
- [ ] Todo funciona igual que antes

---

## 🚀 Resumen

**No hay cambios en el frontend de envío.** Todo sigue funcionando exactamente igual. La autenticación solo se implementó en el **frontend visor** para controlar quién puede ver las transacciones.
