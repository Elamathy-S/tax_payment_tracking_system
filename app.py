import sqlite3
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import urllib.parse


# Initialize Flask app
app = Flask(__name__)

# Database setup (Using sqlite3 directly)
DATABASE = 'tax_payments.db'

def get_db():
    """Function to get a database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Allow column names as dictionary keys
    return conn

def init_db():
    """Function to initialize the database"""
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company TEXT NOT NULL,
                amount REAL NOT NULL,
                payment_date TEXT NOT NULL,
                status TEXT NOT NULL,
                due_date TEXT NOT NULL
            )
        ''')

# Initialize the database (run only once, before the app starts)
init_db()

# Route to serve the index HTML page
@app.route('/')
def index():
    return render_template('index.html')

# Route to get all payments
@app.route('/payments', methods=['GET'])
def get_payments():
    conn = get_db()
    cursor = conn.execute('SELECT * FROM payments')
    payments = cursor.fetchall()

    payments_data = []
    for payment in payments:
        payments_data.append({
            'id': payment['id'],
            'company': payment['company'],
            'amount': payment['amount'],
            'payment_date': payment['payment_date'],
            'status': payment['status'],
            'due_date': payment['due_date']
        })

    return jsonify(payments_data)

# Route to add a payment (POST)
@app.route('/add_payment', methods=['POST'])
def add_payment():
    data = request.get_json()
    company = data['company']
    amount = data['amount']
    payment_date = data['payment_date']
    status = data['status']
    due_date = data['due_date']

    with get_db() as conn:
        conn.execute('''
            INSERT INTO payments (company, amount, payment_date, status, due_date)
            VALUES (?, ?, ?, ?, ?)
        ''', (company, amount, payment_date, status, due_date))

    return jsonify({"message": "Payment added successfully"}), 201

# Route to filter payments by due date

@app.route('/payments_due_date', methods=['GET'])
def get_filtered_payments():
    print(request.args)
    due_date = request.args.get('due_date') 
    print(due_date)
    if not due_date:
        return jsonify({"error": "Due date is required"}), 400

    due_date = urllib.parse.unquote(due_date)

    conn = get_db()
    cursor = conn.execute('SELECT * FROM payments WHERE due_date = ?', (due_date,))
    payments = cursor.fetchall()
    if not payments:
        return jsonify({
            'payments': [], 
            'total_amount': 0
        })

    payments_data = []
    total_amount = 0
    for payment in payments:
        payments_data.append({
            'id': payment['id'],
            'company': payment['company'],
            'amount': payment['amount'],
            'payment_date': payment['payment_date'],
            'status': payment['status'],
            'due_date': payment['due_date']
        })
        total_amount += payment['amount']
    return jsonify({
        'payments': payments_data,
        'total_amount': total_amount
    })


# Get payment details by ID
@app.route('/payments_id/<int:id>', methods=['GET'])
def get_payment(id):
    conn = get_db()
    cursor = conn.execute("SELECT * FROM payments WHERE id=?", (id,))
    payment = cursor.fetchone()
    conn.close()

    if payment:
        payment_data = {
            'id': payment[0],
            'company': payment[1],
            'amount': payment[2],
            'payment_date': payment[3],
            'status': payment[4],
            'due_date': payment[5]
        }
        return jsonify(payment_data)
    else:
        return jsonify({'message': 'Payment not found'}), 404

# Update payment
@app.route('/update_payment/<int:id>', methods=['PUT'])
def update_payment(id):
    data = request.get_json()

    # Extract data from request
    company = data.get('company')
    amount = data.get('amount')
    payment_date = data.get('payment_date')
    status = data.get('status')
    due_date = data.get('due_date')

    # Ensure that necessary fields are provided
    if not company or not amount or not payment_date or not status or not due_date:
        return jsonify({'message': 'Missing required fields'}), 400

    conn = get_db()
    cursor = conn.execute('''
        UPDATE payments
        SET company = ?, amount = ?, payment_date = ?, status = ?, due_date = ?
        WHERE id = ?
    ''', (company, amount, payment_date, status, due_date, id))

    conn.commit()

    # Check if the record was updated
    if cursor.rowcount == 0:
        return jsonify({'message': 'Payment not found'}), 404

    conn.close()

    return jsonify({'message': 'Payment updated successfully'}), 200

# Delete payment
@app.route('/delete_payment/<int:id>', methods=['DELETE'])
def delete_payment(id):
    conn = get_db()
    cursor = conn.execute('''
        DELETE FROM payments WHERE id = ?
    ''', (id,))

    conn.commit()

    # Check if any record was deleted
    if cursor.rowcount == 0:
        return jsonify({'message': 'Payment not found'}), 404

    conn.close()

    return jsonify({'message': 'Payment deleted successfully'}), 200


# Start the Flask app
if __name__ == '__main__':
    app.run(debug=True,port=8080)
