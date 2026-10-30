# 🚀 Free Deployment Guide — SpectrumCare (Render Blueprint Edition)

We use **Render Blueprints** to deploy both services (Node.js Backend & Python AI Service) together automatically. 

Render has a **100% free tier** and **does not require a credit card** to sign up and deploy!

---

## 🛠️ Your App Stack
| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | HTML5 + Tailwind CSS | User interface, served directly by the backend |
| **Backend** | Node.js + Express + Prisma + SQLite | API server and database |
| **AI Service** | Python Flask + Scikit-Learn + SHAP | Risk prediction & model explanations |

---

## ⚡ Step-by-Step Deployment (One-Click Blueprint)

### Step 1 — Push the latest changes to GitHub
If you have edited code or config files, commit and push them to your repository:
```bash
git add .
git commit -m "chore: configure render.yaml blueprint and port bindings"
git push origin main
```

### Step 2 — Create a Render account
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Sign up using your **GitHub account**. 
   *(No credit card is required for free services)*

### Step 3 — Deploy the Blueprint
1. In the Render Dashboard, click the **New +** button in the top right corner.
2. Select **Blueprint** from the dropdown menu.
3. Select your **`spectrumcare`** repository (if you don't see it, click "Connect repository" or adjust your GitHub app permissions).
4. Render will automatically detect the [render.yaml](file:///c:/Users/Mariam Noorani/OneDrive/Desktop/spectrumcare/render.yaml) file.
5. Give your blueprint group a name (e.g., `spectrumcare-group`).
6. Click **Apply**.

---

## 🎉 What happens next?
Render will automatically spin up two services under your account:
1. **`spectrumcare-ai`** (Python Web Service):
   * Installs Python packages from `requirements.txt`.
   * Serves the model prediction API.
2. **`spectrumcare`** (Node/Express Web Service):
   * Runs `npm install`.
   * Automatically pushes your SQLite schema (`npx prisma db push`).
   * Builds the TypeScript code.
   * Securely references the AI service internal hostname via Render private networking.
   * Serves your frontend and API.

---

## ℹ️ Important Notes about Render Free Tier
* **Cold Starts (Spin-down)**: If the application has no traffic for 15 minutes, Render will put the services to sleep. The next time you visit the page, it can take 30–60 seconds for the app to wake up. This is normal for free hosting.
* **SQLite Data Reset**: SQLite stores its data in a local file (`dev.db`). Because Render free instances have ephemeral storage, your database data (e.g., created users, children profiles) will reset whenever the backend goes to sleep or redeploys. *This is standard behavior for demo environments.*
