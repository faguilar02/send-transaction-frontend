# Transaction Interface - FraudeScope

Interfaz para crear jobs de análisis de fraude.

## 🚀 Despliegue en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. **Sube el código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/transaction-interface.git
   git push -u origin main
   ```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Click en "Add New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente Next.js

3. **Configura las variables de entorno en Vercel:**
   - En el dashboard del proyecto → Settings → Environment Variables
   - Agrega estas variables:
     ```
     NEXT_PUBLIC_API_URL=https://tu-backend-api.com
     NEXT_PUBLIC_USER_ID=user123
     ```
   - Si tu backend también está en Vercel, usa su URL desplegada

4. **Deploy!**
   - Vercel hará el deploy automáticamente
   - Cada push a `main` desplegará una nueva versión

### Opción 2: Desde Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Agregar variables de entorno
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_USER_ID

# Deploy a producción
vercel --prod
```

## 🛠️ Desarrollo Local

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno:**
   - Copia `.env.example` a `.env.local`
   - Ajusta las URLs según tu backend local

3. **Iniciar servidor de desarrollo:**
   ```bash
   pnpm dev
   ```

4. **Abrir:** http://localhost:3000

## 📝 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend API | `http://localhost:8000` (local) o `https://api.example.com` (prod) |
| `NEXT_PUBLIC_USER_ID` | User ID para auth | `user123` |

**Nota:** Las variables con prefijo `NEXT_PUBLIC_` son accesibles en el cliente.

## 🔧 Stack Tecnológico

- **Framework:** Next.js 15
- **UI Components:** Radix UI
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm

## 📦 Build de Producción

```bash
pnpm build
pnpm start
```

## 🐛 Debugging

Para ver logs detallados de las peticiones API:
1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Verás logs con emojis 🚀📦✅❌ mostrando el flujo completo

## 🔗 Backend API

Este frontend se conecta a un backend FastAPI que debe estar corriendo con estos endpoints:

- `POST /api/fraud/predict/batch`
  - Headers: `X-User-Id`, `Content-Type: application/json`
  - Body: `{ "sample_size": number, "strategy": "random" | "balanced" | "high_fraud_bias" }`
  - Response: `{ "job_id": string, "status": string, "message": string }`

## ⚠️ Importante para Producción

1. **CORS:** Asegúrate de que tu backend permita requests desde tu dominio de Vercel
2. **Variables de entorno:** Configúralas en Vercel antes del deploy
3. **Backend URL:** Cambia de `localhost` a tu URL de producción
4. **Authentication:** El `X-User-Id` está hardcodeado, considera implementar auth real

## 📄 Licencia

MIT
