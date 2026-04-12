import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

def get_demand_predictions(conn):
    """
    Train a regression model on historical sales data and predict next week's demand.
    Returns list of dicts with product_id, product_name, predicted_demand, reorder_quantity.
    """
    query = """
        SELECT s.product_id, p.name, p.quantity, p.low_stock_threshold,
               DATE(s.sale_date) as sale_date, SUM(s.quantity_sold) as daily_sold
        FROM sales s
        JOIN products p ON s.product_id = p.id
        GROUP BY s.product_id, DATE(s.sale_date)
        ORDER BY s.product_id, sale_date
    """
    df = pd.read_sql_query(query, conn)

    if df.empty:
        return []

    results = []
    products = df['product_id'].unique()

    for pid in products:
        pdf = df[df['product_id'] == pid].copy()
        if len(pdf) < 5:
            continue

        pdf['sale_date'] = pd.to_datetime(pdf['sale_date'])
        pdf = pdf.sort_values('sale_date')

        # Feature engineering: day index, day of week, rolling avg
        pdf['day_index'] = (pdf['sale_date'] - pdf['sale_date'].min()).dt.days
        pdf['day_of_week'] = pdf['sale_date'].dt.dayofweek
        pdf['rolling_avg'] = pdf['daily_sold'].rolling(window=7, min_periods=1).mean()

        X = pdf[['day_index', 'day_of_week', 'rolling_avg']].values
        y = pdf['daily_sold'].values

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = LinearRegression()
        model.fit(X_scaled, y)

        # Predict next 7 days
        last_day = pdf['day_index'].max()
        last_rolling = pdf['rolling_avg'].iloc[-1]
        future_predictions = []

        for i in range(1, 8):
            future_day = last_day + i
            future_date = pdf['sale_date'].max() + timedelta(days=i)
            dow = future_date.weekday()
            X_future = scaler.transform([[future_day, dow, last_rolling]])
            pred = model.predict(X_future)[0]
            future_predictions.append(max(0, round(pred, 1)))

        weekly_demand = round(sum(future_predictions))
        current_qty = int(pdf['quantity'].iloc[-1])
        low_threshold = int(pdf['low_stock_threshold'].iloc[-1])

        # Reorder = predicted demand + buffer (1.5x safety stock)
        reorder_qty = max(0, int(weekly_demand * 1.5) - current_qty + low_threshold)

        results.append({
            'product_id': int(pid),
            'product_name': pdf['name'].iloc[0],
            'current_stock': current_qty,
            'predicted_weekly_demand': weekly_demand,
            'reorder_quantity': reorder_qty,
            'status': 'Critical' if current_qty < low_threshold else
                      ('Low' if current_qty < weekly_demand else 'Sufficient'),
            'daily_predictions': future_predictions
        })

    results.sort(key=lambda x: x['status'] == 'Critical', reverse=True)
    return results
