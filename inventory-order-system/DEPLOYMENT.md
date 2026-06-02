# Production Deployment Manual: NexusStock

This guide provides step-by-step instructions to deploy your containerized full-stack **Inventory & Order Management System** using free hosting services.

---

## 1. Backend & PostgreSQL Database Deployment

We will deploy the **FastAPI Backend** and the **PostgreSQL Database** on **Render** (or Railway).

### A. Create the PostgreSQL Database on Render
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **PostgreSQL**.
3. Configure the database:
   - **Name**: `nexusstock-db`
   - **Database Name**: `inventory_db`
   - **User**: `shrey`
   - **Region**: Select a region close to you (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`).
   - **Plan**: Select **Free**.
4. Click **Create Database**.
5. Once active, copy the **Internal Database URL** (e.g., `postgresql://shrey:password@dpg-xxxx:5432/inventory_db`) or **External Database URL**.

### B. Deploy the FastAPI Backend API on Render
1. Push your codebase to a private/public **GitHub repository**.
2. On the Render Dashboard, click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `nexusstock-backend`
   - **Environment**: `Docker` (Render automatically detects your [backend/Dockerfile](file:///C:/Users/shrey/.gemini/antigravity-ide/scratch/inventory-order-system/backend/Dockerfile) if we specify root/subdirectories!).
   - **Docker Context Path**: `backend` (or set **Root Directory** to `backend` and context to `.`).
   - **Plan**: Select **Free**.
5. Expand **Advanced** and add the following **Environment Variables**:
   - `DATABASE_URL`: Paste the **Internal Database URL** copied from the PostgreSQL service step above.
6. Click **Deploy Web Service**.
7. Render will build the container and provide you with a public URL (e.g., `https://nexusstock-backend.onrender.com`).
8. Append `/docs` to your backend URL (e.g., `https://nexusstock-backend.onrender.com/docs`) to test the live Swagger OpenAPI interactive explorer!

---

## 2. Frontend React Deployment

We will deploy the **React Frontend** SPA on **Vercel** (or Netlify).

### A. Prepare the Frontend Code
For production hosting on Vercel, the frontend client should make fetch requests to your deployed backend API URL rather than `localhost:8000`.

In your frontend config:
- Update the API base URL inside [App.jsx](file:///C:/Users/shrey/.gemini/antigravity-ide/scratch/inventory-order-system/frontend/src/App.jsx) (or use an environment variable).
- You can create an `.env` or set variable `VITE_API_URL` dynamically. Let's make it look at `import.meta.env.VITE_API_URL` or default to `http://localhost:8000/api/v1`.

### B. Deploy on Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository.
4. Configure the project:
   - **Framework Preset**: `Vite` (Vercel automatically detects this).
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://nexusstock-backend.onrender.com/api/v1` (your deployed Render API URL).
6. Click **Deploy**.
7. Vercel will bundle the production-ready React client and deploy it onto a high-speed global CDN, providing you with a custom domain link (e.g., `https://nexusstock.vercel.app`).

---

## 3. Deployment Environment Configuration (.env.example)

Create a `.env` in the root or individual folders to manage variables locally:

### Root `.env` Template:
```env
# Database Credentials
POSTGRES_USER=shrey
POSTGRES_PASSWORD=password123
POSTGRES_DB=inventory_db

# Backend Connection URL (Docker Compose context uses service name 'db')
DATABASE_URL=postgresql://shrey:password123@db:5432/inventory_db

# Frontend Config
VITE_API_URL=http://localhost:8000/api/v1
```
