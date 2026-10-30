# 🌿 SpectrumCare

SpectrumCare is a full-stack, early-intervention pediatric health platform. It combines a **Node.js/TypeScript** backend with a **Python/Flask** AI service to screen children for developmental conditions (using M-CHAT-R guidelines) and track milestones via interactive cognitive games.

[![Live Demo](https://img.shields.io/badge/Demo-Live_Preview-emerald?style=for-the-badge&logo=render)](https://spectrumcare.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📸 Screenshots

| 🖥️ Dashboard View | 🧠 Explainable AI Results |
| :---: | :---: |
| ![Dashboard Screenshot](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80) <br> *Or drag-and-drop your custom screenshot here* | ![AI Report Screenshot](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80) <br> *Or drag-and-drop your custom screenshot here* |

*Tip: You can replace these placeholders with screenshots of your running app by uploading them to a folder like `docs/` and updating the links.*

---

## ✨ Features

- 📝 **M-CHAT-R Screening:** Digitized 20-question autism risk screening for toddlers (16–30 months).
- 🧠 **Explainable AI (XAI):** Predicts risk levels (Low/Medium/High) using a **Scikit-Learn** classifier and visualizes feature importance using **SHAP** values.
- 🎮 **Milestone Games:** Three interactive cognitive games (*Match Emoji Face*, *Odd One Out*, *Color Tap*) that measure accuracy and response times.
- 📊 **Analytics Dashboard:** Tracks performance history, active streaks, and cognitive development trends.
- 📄 **PDF Reports:** Automatic generation and download of clinical-grade summaries using `pdf-lib`.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, Tailwind CSS, Single-Page App (SPA) hash routing, Custom CSS animations.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite.
- **AI Microservice:** Python, Flask, Scikit-Learn, SHAP, Joblib.
- **Deployment:** Render Blueprint (`render.yaml`) with internal private networking.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/mariam-1209/spectrumcare.git
cd spectrumcare
```

### 2. Run the AI Service
```bash
cd ai-service
pip install -r requirements.txt
python app.py
```
*The AI service will run at `http://localhost:5001`.*

### 3. Run the Backend & Frontend
Open a new terminal window:
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
*The main application will run at `http://localhost:3001`.*

---

## 🌐 Production Deployment

This project is fully configured for continuous deployment on **Render** using a single **Blueprint** (`render.yaml`). 

1. Push your code to GitHub.
2. In the Render dashboard, click **New +** and select **Blueprint**.
3. Connect your repository. Render will automatically provision:
   - **`spectrumcare-ai`** (Flask web service)
   - **`spectrumcare`** (Node/Express web service serving the SQLite database and static frontend)

---

## 👤 Built By

**Mariam** — [github.com/mariam-1209](https://github.com/mariam-1209)
