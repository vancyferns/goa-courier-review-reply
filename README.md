# Goa Courier Services™ - Google Review Reply System

An enterprise review response workstation built in Python, Gradio, and SQLite according to the **v1.0 Software Requirements Specification & Build Plan**.

---

## 🌟 Key Capabilities & Upgrades

### 1. 🗄️ SQLite Database Layer (`data/app.db`)
- **System Configuration (`system_config`)**: Stores Google OAuth credentials, AI inference endpoints, model parameters, company facts, and SEO phrase library.
- **Reviews Store (`reviews`)**: Persists customer reviews, ratings, branch locations, reply status (`unanswered` / `replied`), draft history, and published owner replies.
- **Audit & Compliance Trail (`audit_logs`)**: Permanent log of publish events, token exchanges, and configuration modifications.
- **Locations (`business_locations`)**: Stores branch metadata for Margao (Head Office), Agassaim, Porvorim, and Canacona.

### 2. ⚙️ Manage Configuration Tab
- **Google Cloud OAuth 2.0:** Input Client ID, Client Secret, Redirect URI, generate sign-in URL, and exchange authorization codes directly from the browser.
- **AI Model & Inference Provider:** Configure provider (Hugging Face, OpenRouter, Together AI, local Ollama), Base API URL, API Key, Temperature, and Max Tokens. (Model ID strictly locked to `Qwen/Qwen3-4B-Instruct-2507`).
- **Company Profile:** Update business name, customer inquiry email, and website.
- **SEO Keywords:** Customize approved keywords for natural injection into replies.
- **One-Click Save:** Persists all settings to the SQLite database.

### 3. 💬 Modern Review Workstation UI
- **Real-time Filters:** Filter by branch location and status (`🔴 [UNANSWERED]` vs `🟢 [REPLIED]`), with search across reviewer comments and names.
- **AI Studio:** Generate draft replies grounded in Goa Courier Services facts with instant prompt-injection defense.
- **Word & Character Indicators:** Visual target gauge (35–75 words target, 100 max).
- **Safety Gate:** Requires explicit human verification before unlocking the **"Publish Reply"** button.

### 4. 📜 Audit & Activity Logs Tab
- Live chronological inspection table showing every reply published, token exchanged, and configuration change with exact timestamps and status.

---

## 🚀 Running the System Locally

```powershell
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the application
python app.py
```

Open your browser:
👉 **[http://127.0.0.1:7860](http://127.0.0.1:7860)**

---

## 🧪 Automated Test Suite

```powershell
python -m pytest tests/
```
All **19 unit tests** pass covering SQLite database operations, Google API client normalization, AI provider invariants, prompt building, and secret redaction.
