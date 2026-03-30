from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import csv
import io
from datetime import datetime, timedelta
from models import get_db
from demand_prediction import get_demand_predictions

api = Blueprint('api', __name__)

# ── Auth decorator ──────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ── AUTH ────────────────────────────────────────────────────────
@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (data['username'],)).fetchone()
    conn.close()
    if user and check_password_hash(user['password'], data['password']):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'success': True, 'username': user['username']})
    return jsonify({'error': 'Invalid credentials'}), 401

@api.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@api.route('/check-auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        return jsonify({'authenticated': True, 'username': session.get('username')})
    return jsonify({'authenticated': False}), 401

# ── DASHBOARD ───────────────────────────────────────────────────
@api.route('/dashboard', methods=['GET'])
@login_required
def dashboard():
    conn = get_db()
    today = datetime.now().strftime('%Y-%m-%d')

    total_products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    low_stock = conn.execute("SELECT COUNT(*) FROM products WHERE quantity <= low_stock_threshold").fetchone()[0]
    today_sales = conn.execute(
        "SELECT COALESCE(SUM(total_price),0) FROM sales WHERE DATE(sale_date)=?", (today,)
    ).fetchone()[0]
    total_suppliers = conn.execute("SELECT COUNT(*) FROM suppliers").fetchone()[0]

    # Last 7 days sales chart data
    chart_data = []
    for i in range(6, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        amt = conn.execute(
            "SELECT COALESCE(SUM(total_price),0) FROM sales WHERE DATE(sale_date)=?", (d,)
        ).fetchone()[0]
        chart_data.append({'date': d, 'amount': round(amt, 2)})

    # Category breakdown
    cat_data = conn.execute(
        "SELECT p.category, COALESCE(SUM(s.total_price),0) as revenue "
        "FROM products p LEFT JOIN sales s ON p.id=s.product_id "
        "GROUP BY p.category"
    ).fetchall()

    # Low stock products
    low_products = conn.execute(
        "SELECT id, name, quantity, low_stock_threshold FROM products "
        "WHERE quantity <= low_stock_threshold ORDER BY quantity ASC LIMIT 5"
    ).fetchall()

    conn.close()
    return jsonify({
        'total_products': total_products,
        'low_stock_count': low_stock,
        'today_sales': round(today_sales, 2),
        'total_suppliers': total_suppliers,
        'chart_data': chart_data,
        'category_data': [dict(r) for r in cat_data],
        'low_stock_products': [dict(r) for r in low_products]
    })

# ── PRODUCTS ────────────────────────────────────────────────────
@api.route('/products', methods=['GET'])
@login_required
def get_products():
    conn = get_db()
    rows = conn.execute(
        "SELECT p.*, s.name as supplier_name FROM products p "
        "LEFT JOIN suppliers s ON p.supplier_id=s.id ORDER BY p.id DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@api.route('/products', methods=['POST'])
@login_required
def add_product():
    d = request.get_json()
    conn = get_db()
    conn.execute(
        "INSERT INTO products (name, category, price, quantity, low_stock_threshold, supplier_id) VALUES (?,?,?,?,?,?)",
        (d['name'], d['category'], d['price'], d['quantity'], d.get('low_stock_threshold', 10), d.get('supplier_id'))
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Product added'})

@api.route('/products/<int:pid>', methods=['PUT'])
@login_required
def update_product(pid):
    d = request.get_json()
    conn = get_db()
    conn.execute(
        "UPDATE products SET name=?, category=?, price=?, quantity=?, low_stock_threshold=?, supplier_id=? WHERE id=?",
        (d['name'], d['category'], d['price'], d['quantity'], d.get('low_stock_threshold', 10), d.get('supplier_id'), pid)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@api.route('/products/<int:pid>', methods=['DELETE'])
@login_required
def delete_product(pid):
    conn = get_db()
    conn.execute("DELETE FROM products WHERE id=?", (pid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── INVENTORY CONTROL ───────────────────────────────────────────
@api.route('/inventory/update', methods=['POST'])
@login_required
def update_stock():
    d = request.get_json()
    conn = get_db()
    prod = conn.execute("SELECT * FROM products WHERE id=?", (d['product_id'],)).fetchone()
    if not prod:
        conn.close()
        return jsonify({'error': 'Product not found'}), 404
    new_qty = prod['quantity'] + int(d['quantity_change'])
    conn.execute("UPDATE products SET quantity=? WHERE id=?", (new_qty, d['product_id']))
    conn.execute(
        "INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_quantity, new_quantity, note) VALUES (?,?,?,?,?,?)",
        (d['product_id'], d['change_type'], d['quantity_change'], prod['quantity'], new_qty, d.get('note', ''))
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'new_quantity': new_qty})

@api.route('/inventory/logs', methods=['GET'])
@login_required
def inventory_logs():
    conn = get_db()
    logs = conn.execute(
        "SELECT il.*, p.name as product_name FROM inventory_logs il "
        "JOIN products p ON il.product_id=p.id ORDER BY il.log_date DESC LIMIT 100"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in logs])

# ── SALES ───────────────────────────────────────────────────────
@api.route('/sales', methods=['GET'])
@login_required
def get_sales():
    limit = request.args.get('limit', 50)
    conn = get_db()
    rows = conn.execute(
        "SELECT s.*, p.name as product_name FROM sales s "
        "JOIN products p ON s.product_id=p.id ORDER BY s.sale_date DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@api.route('/sales', methods=['POST'])
@login_required
def record_sale():
    d = request.get_json()
    conn = get_db()
    prod = conn.execute("SELECT * FROM products WHERE id=?", (d['product_id'],)).fetchone()
    if not prod:
        conn.close()
        return jsonify({'error': 'Product not found'}), 404
    qty = int(d['quantity'])
    if prod['quantity'] < qty:
        conn.close()
        return jsonify({'error': f'Insufficient stock. Available: {prod["quantity"]}'}), 400
    total = qty * prod['price']
    conn.execute(
        "INSERT INTO sales (product_id, quantity_sold, unit_price, total_price) VALUES (?,?,?,?)",
        (d['product_id'], qty, prod['price'], total)
    )
    new_qty = prod['quantity'] - qty
    conn.execute("UPDATE products SET quantity=? WHERE id=?", (new_qty, d['product_id']))
    conn.execute(
        "INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_quantity, new_quantity, note) VALUES (?,?,?,?,?,?)",
        (d['product_id'], 'sale', -qty, prod['quantity'], new_qty, f'Sale recorded')
    )
    conn.commit()
    sale_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return jsonify({'success': True, 'total': total, 'sale_id': sale_id, 'new_stock': new_qty})

@api.route('/sales/<int:sid>/invoice', methods=['GET'])
@login_required
def get_invoice(sid):
    conn = get_db()
    sale = conn.execute(
        "SELECT s.*, p.name as product_name, p.category FROM sales s "
        "JOIN products p ON s.product_id=p.id WHERE s.id=?", (sid,)
    ).fetchone()
    conn.close()
    if not sale:
        return jsonify({'error': 'Sale not found'}), 404
    return jsonify(dict(sale))

# ── SUPPLIERS ───────────────────────────────────────────────────
@api.route('/suppliers', methods=['GET'])
@login_required
def get_suppliers():
    conn = get_db()
    rows = conn.execute("SELECT * FROM suppliers ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@api.route('/suppliers', methods=['POST'])
@login_required
def add_supplier():
    d = request.get_json()
    conn = get_db()
    conn.execute(
        "INSERT INTO suppliers (name, contact, email, address) VALUES (?,?,?,?)",
        (d['name'], d.get('contact', ''), d.get('email', ''), d.get('address', ''))
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@api.route('/suppliers/<int:sid>', methods=['DELETE'])
@login_required
def delete_supplier(sid):
    conn = get_db()
    conn.execute("DELETE FROM suppliers WHERE id=?", (sid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ── REPORTS ─────────────────────────────────────────────────────
@api.route('/reports/daily', methods=['GET'])
@login_required
def daily_report():
    date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    conn = get_db()
    sales = conn.execute(
        "SELECT s.*, p.name, p.category FROM sales s JOIN products p ON s.product_id=p.id "
        "WHERE DATE(s.sale_date)=? ORDER BY s.sale_date DESC", (date,)
    ).fetchall()
    total = conn.execute(
        "SELECT COALESCE(SUM(total_price),0) FROM sales WHERE DATE(sale_date)=?", (date,)
    ).fetchone()[0]
    conn.close()
    return jsonify({'date': date, 'sales': [dict(r) for r in sales], 'total': round(total, 2)})

@api.route('/reports/monthly', methods=['GET'])
@login_required
def monthly_report():
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    conn = get_db()
    rows = conn.execute(
        "SELECT DATE(sale_date) as date, SUM(total_price) as total, COUNT(*) as count "
        "FROM sales WHERE strftime('%Y-%m', sale_date)=? GROUP BY DATE(sale_date) ORDER BY date",
        (month,)
    ).fetchall()
    grand_total = conn.execute(
        "SELECT COALESCE(SUM(total_price),0) FROM sales WHERE strftime('%Y-%m', sale_date)=?", (month,)
    ).fetchone()[0]
    conn.close()
    return jsonify({'month': month, 'data': [dict(r) for r in rows], 'grand_total': round(grand_total, 2)})

@api.route('/reports/products', methods=['GET'])
@login_required
def product_report():
    conn = get_db()
    rows = conn.execute(
        "SELECT p.id, p.name, p.category, p.price, p.quantity, "
        "COALESCE(SUM(s.quantity_sold),0) as total_sold, COALESCE(SUM(s.total_price),0) as revenue "
        "FROM products p LEFT JOIN sales s ON p.id=s.product_id GROUP BY p.id ORDER BY revenue DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@api.route('/reports/export', methods=['GET'])
@login_required
def export_csv():
    report_type = request.args.get('type', 'sales')
    conn = get_db()
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == 'sales':
        writer.writerow(['ID', 'Product', 'Quantity', 'Unit Price', 'Total', 'Date'])
        rows = conn.execute(
            "SELECT s.id, p.name, s.quantity_sold, s.unit_price, s.total_price, s.sale_date "
            "FROM sales s JOIN products p ON s.product_id=p.id ORDER BY s.sale_date DESC"
        ).fetchall()
        for r in rows:
            writer.writerow(list(r))
    elif report_type == 'products':
        writer.writerow(['ID', 'Name', 'Category', 'Price', 'Quantity', 'Supplier'])
        rows = conn.execute(
            "SELECT p.id, p.name, p.category, p.price, p.quantity, COALESCE(s.name,'N/A') "
            "FROM products p LEFT JOIN suppliers s ON p.supplier_id=s.id"
        ).fetchall()
        for r in rows:
            writer.writerow(list(r))

    conn.close()
    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment;filename={report_type}_report.csv'}
    )

# ── AI DEMAND PREDICTION ─────────────────────────────────────────
@api.route('/predict', methods=['GET'])
@login_required
def predict():
    conn = get_db()
    try:
        results = get_demand_predictions(conn)
        conn.close()
        return jsonify(results)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
