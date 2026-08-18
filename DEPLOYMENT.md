# StockFlow WMS - Deployment & Mobile Phone Access Guide

This guide explains all the ways you can run, deploy, and access **StockFlow WMS** on your mobile phone, tablet, laptop, or any device over the internet.

---

## 📱 Option 1: Instant Mobile Phone Access (Same Wi-Fi Network)

If your phone and computer are connected to the same Wi-Fi network:

1. **Keep the servers running on your computer**:
   - Backend: Running on port `8000`
   - Frontend: Running on port `5173` with `--host 0.0.0.0`
2. **Open browser on your phone** (Safari / Chrome / Edge):
   ```
   http://10.164.112.86:5173
   ```
3. **Install as a Mobile App**:
   - **Android (Chrome)**: Tap the **"Install Now"** banner or tap `⋮ (Menu)` > **"Add to Home screen"** / **"Install App"**.
   - **iPhone (Safari)**: Tap the **Share** button (`⎋`) > scroll down and tap **"Add to Home Screen"**.

---

## 🌐 Option 2: Instant Public Internet Tunnel (Access from Anywhere on Cellular 4G/5G)

If you want anyone anywhere in the world to access your running app over the internet without setting up cloud servers:

### Using LocalTunnel (No account required)
Run this command in your PowerShell:
```powershell
npx -y localtunnel --port 5173
```
It will output a public HTTPS URL (e.g. `https://neat-water-32.loca.lt`). Open that URL on your phone!

### Using Cloudflare Tunnel (Free & Fast)
```powershell
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:5173
```

---

## ☁️ Option 3: 24/7 Cloud Deployment (Render / Vercel / Railway)

### 1. Deploy to Render (Recommended - 100% Free)
StockFlow includes a pre-configured `render.yaml` blueprint:
1. Push this project to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New > Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically build both:
   - Backend API (`stockflow-backend` on FastAPI)
   - Frontend Web App (`stockflow-frontend` on React Vite)

### 2. Deploy Frontend to Vercel + Backend to Render / Railway
1. **Frontend**: Import the `frontend` folder to [Vercel](https://vercel.com).
   - Framework preset: `Vite`
   - Root directory: `frontend`
   - Environment Variable: `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com/api`
2. **Backend**: Deploy the `backend` folder to [Render](https://render.com) or [Railway](https://railway.app).
