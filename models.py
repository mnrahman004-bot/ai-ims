import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'inventory.db')

def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            email TEXT,
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            price REAL NOT NULL,
            quantity INTEGER DEFAULT 0,
            low_stock_threshold INTEGER DEFAULT 10,
            supplier_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            quantity_sold INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS inventory_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            change_type TEXT NOT NULL,
            quantity_change INTEGER NOT NULL,
            previous_quantity INTEGER,
            new_quantity INTEGER,
            note TEXT,
            log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
    ''')
    conn.commit()
    conn.close()

def seed_data():
    """Insert sample data for testing"""
    from werkzeug.security import generate_password_hash
    import random
    from datetime import datetime, timedelta

    conn = get_db()
    c = conn.cursor()

    # Check if already seeded
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] > 0:
        conn.close()
        return

    # Admin user
    c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
              ('admin', generate_password_hash('admin123'), 'admin'))

    # Suppliers
    suppliers = [
        ('TechSupplies Co.', '+91-9876543210', 'tech@supplies.com', 'Chennai, TN'),
        ('FreshMart Distributors', '+91-9123456789', 'fresh@mart.com', 'Bangalore, KA'),
        ('HomeGoods Ltd.', '+91-9988776655', 'home@goods.com', 'Mumbai, MH'),
        ('ElectroParts Inc.', '+91-9654321098', 'electro@parts.com', 'Delhi, DL'),
    ]
    c.executemany("INSERT INTO suppliers (name, contact, email, address) VALUES (?,?,?,?)", suppliers)

    # Products
    products = [
        ('Wireless Mouse', 'Electronics', 599.00, 45, 10, 1),
        ('USB Keyboard', 'Electronics', 799.00, 30, 8, 1),
        ('LED Monitor 24"', 'Electronics', 8999.00, 12, 5, 4),
        ('Notebook A4', 'Stationery', 49.00, 200, 30, 2),
        ('Ball Pen Pack', 'Stationery', 29.00, 300, 50, 2),
        ('Desk Lamp', 'Home & Office', 449.00, 25, 8, 3),
        ('Stapler', 'Stationery', 149.00, 40, 10, 2),
        ('Hand Sanitizer 500ml', 'Health', 120.00, 80, 20, 2),
        ('HDMI Cable 2m', 'Electronics', 299.00, 55, 15, 4),
        ('Printer Paper Ream', 'Stationery', 280.00, 60, 15, 2),
        ('Coffee Mug', 'Home & Office', 199.00, 35, 10, 3),
        ('Sticky Notes Pack', 'Stationery', 89.00, 120, 25, 2),
        ('Webcam 1080p', 'Electronics', 1999.00, 8, 5, 1),
        ('Extension Cord 6m', 'Electronics', 399.00, 20, 8, 4),
        ('File Folder Pack', 'Stationery', 179.00, 90, 20, 2),
    ]
    c.executemany("INSERT INTO products (name, category, price, quantity, low_stock_threshold, supplier_id) VALUES (?,?,?,?,?,?)", products)

    # Historical sales (last 90 days)
    c.execute("SELECT id, price FROM products")
    prods = c.fetchall()
    for day_offset in range(90, 0, -1):
        sale_date = datetime.now() - timedelta(days=day_offset)
        num_sales = random.randint(2, 8)
        for _ in range(num_sales):
            prod = random.choice(prods)
            qty = random.randint(1, 5)
            c.execute(
                "INSERT INTO sales (product_id, quantity_sold, unit_price, total_price, sale_date) VALUES (?,?,?,?,?)",
                (prod['id'], qty, prod['price'], qty * prod['price'], sale_date.strftime('%Y-%m-%d %H:%M:%S'))
            )

    conn.commit()
    conn.close()
    print("✅ Database seeded with sample data.")
