# 📦 StockSense — AI-Powered Inventory Management System

A full-stack inventory management system built with Flask, SQLite, and Scikit-learn for a small retail shop.

---

## 🚀 Features

| Module | Features |
|--------|----------|
| 🔐 Auth | Admin login, session management, secure passwords |
| 📊 Dashboard | Stats, low stock alerts, sales charts |
| 📦 Products | Add/Edit/Delete, category, supplier linking |
| 🗄️ Inventory | Stock control, restock, damage tracking, logs |
| 💳 Sales | Record sales, auto stock deduction, invoices |
| 🏭 Suppliers | Add/manage suppliers, link to products |
| 📈 Reports | Daily, monthly, product reports + CSV export |
| 🤖 AI | ML demand prediction, reorder suggestions |

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JS, Chart.js
- **Backend**: Python Flask
- **Database**: SQLite
- **ML**: Scikit-learn (Linear Regression)
- **Fonts**: Syne + DM Sans

---

## ⚡ Quick Start

### Prerequisites
- Python 3.9+
- pip

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/inventory-management-system.git
cd inventory-management-system
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
cd backend
python app.py
```

The app will:
- ✅ Create the SQLite database automatically
- ✅ Seed sample data (15 products, suppliers, 90 days of sales history)
- ✅ Start the server on http://localhost:5000

### 5. Login
```
URL:      http://localhost:5000
Username: admin
Password: admin123
```

---

## 📁 Project Structure

```
inventory_management_system/
├── backend/
│   ├── app.py              # Flask app & routes registration
│   ├── models.py           # DB init, seed data
│   ├── routes.py           # All API endpoints
│   └── demand_prediction.py # ML demand forecasting
├── frontend/
│   ├── login.html
│   ├── dashboard.html
│   ├── products.html
│   ├── inventory.html
│   ├── sales.html
│   ├── suppliers.html
│   ├── reports.html
│   ├── predict.html
│   └── static/
│       ├── css/style.css
│       └── js/
│           ├── app.js      # Shared utilities
│           └── layout.js   # Sidebar/topbar components
├── database/
│   └── inventory.db        # Auto-created on first run
├── requirements.txt
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate user |
| POST | `/api/logout` | Logout |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/products` | List all products |
| POST | `/api/products` | Add product |
| PUT | `/api/products/<id>` | Update product |
| DELETE | `/api/products/<id>` | Delete product |
| POST | `/api/inventory/update` | Update stock level |
| GET | `/api/inventory/logs` | Get stock change logs |
| GET | `/api/sales` | List sales |
| POST | `/api/sales` | Record a sale |
| GET | `/api/sales/<id>/invoice` | Get invoice |
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Add supplier |
| DELETE | `/api/suppliers/<id>` | Delete supplier |
| GET | `/api/reports/daily` | Daily sales report |
| GET | `/api/reports/monthly` | Monthly report |
| GET | `/api/reports/products` | Product report |
| GET | `/api/reports/export` | Export CSV |
| GET | `/api/predict` | AI demand predictions |

---

## 🗄️ Database Schema

```sql
users          -- id, username, password (hashed), role
products       -- id, name, category, price, quantity, threshold, supplier_id
suppliers      -- id, name, contact, email, address
sales          -- id, product_id, quantity_sold, unit_price, total_price, sale_date
inventory_logs -- id, product_id, change_type, quantity_change, previous/new_qty, note
```

---

## 🤖 ML Module

The AI prediction module (`demand_prediction.py`):
1. Pulls 90 days of historical sales from SQLite
2. Engineers features: day index, day of week, 7-day rolling average
3. Trains a **Linear Regression** model per product
4. Predicts demand for the next 7 days
5. Calculates reorder quantity = `(predicted × 1.5 safety factor) - current_stock + threshold`
6. Returns status: **Critical**, **Low**, or **Sufficient**

---

## ☁️ Deployment on Render

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/ims.git
git push -u origin main
```

### 2. Deploy on Render.com
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && python app.py`
   - **Environment**: Python 3
4. Add environment variable: `FLASK_ENV=production`
5. Click **Deploy**

> ⚠️ For production, replace SQLite with PostgreSQL and use `gunicorn`:
> ```
> gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app
> ```

---

## 🔒 Security Notes

- Passwords are hashed with Werkzeug's `generate_password_hash` (PBKDF2)
- Sessions are server-side with a secret key
- All API routes require authentication
- In production, change `app.secret_key` to a random secure value

---

## 📝 License

MIT License — free to use, modify, and distribute.
