import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, send_from_directory
from models import init_db, seed_data
from routes import api

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
STATIC_DIR = os.path.join(FRONTEND_DIR, 'static')

app = Flask(__name__,
            static_folder=STATIC_DIR,
            static_url_path='/static')

app.secret_key = 'inventory-mgmt-secret-key-2024'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours

app.register_blueprint(api, url_prefix='/api')

# ── Serve frontend pages ────────────────────────────────────────
@app.route('/')
@app.route('/login')
def serve_login():
    return send_from_directory(FRONTEND_DIR, 'login.html')

@app.route('/dashboard')
def serve_dashboard():
    return send_from_directory(FRONTEND_DIR, 'dashboard.html')

@app.route('/products')
def serve_products():
    return send_from_directory(FRONTEND_DIR, 'products.html')

@app.route('/sales')
def serve_sales():
    return send_from_directory(FRONTEND_DIR, 'sales.html')

@app.route('/suppliers')
def serve_suppliers():
    return send_from_directory(FRONTEND_DIR, 'suppliers.html')

@app.route('/inventory')
def serve_inventory():
    return send_from_directory(FRONTEND_DIR, 'inventory.html')

@app.route('/reports')
def serve_reports():
    return send_from_directory(FRONTEND_DIR, 'reports.html')

@app.route('/predict')
def serve_predict():
    return send_from_directory(FRONTEND_DIR, 'predict.html')

if __name__ == '__main__':
    os.makedirs(os.path.join(BASE_DIR, 'database'), exist_ok=True)
    init_db()
    seed_data()
    print("\n🚀 Inventory Management System Running!")
    print("📌 URL: http://localhost:5000")
    print("🔐 Login: admin / admin123\n")
    app.run(debug=True, port=5000)
