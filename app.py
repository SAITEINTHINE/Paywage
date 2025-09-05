from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_file
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import io
import csv

app = Flask(__name__)
app.secret_key = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
db = SQLAlchemy(app)

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    shifts = db.relationship('Shift', backref='user', lazy=True)

class Shift(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(50))
    shift_type = db.Column(db.String(50))
    start_time = db.Column(db.String(10))
    end_time = db.Column(db.String(10))
    break_start = db.Column(db.String(10))
    break_end = db.Column(db.String(10))
    total_hours = db.Column(db.String(10))
    hourly_wage = db.Column(db.String(10))
    currency = db.Column(db.String(10))
    total_wage = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

# --- Routes ---

@app.route('/')
def index():
    if 'user_id' in session:
        return render_template('index.html', username=session.get('username'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password'].strip()
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            return redirect(url_for('index'))
        error = "Invalid credentials"
    return render_template('login.html', error=error)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    error = None
    if request.method == 'POST':
        username = request.form['username'].strip()
        email = request.form.get('email', '').strip()
        password = request.form['password'].strip()
        if not username or not password:
            error = "Username and password are required"
            return render_template('signup.html', error=error)
        if User.query.filter_by(username=username).first():
            error = "Username exists"
            return render_template('signup.html', error=error)
        new_user = User(username=username, password=generate_password_hash(password))
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('signup.html', error=error)

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = User.query.get(session['user_id'])
    return render_template('profile.html', user=user)

@app.route('/api/shifts', methods=['GET', 'POST'])
def api_shifts():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    if request.method == 'POST':
        data = request.get_json()
        new_shift = Shift(
            date=data['date'],
            shift_type=data['shift_type'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            break_start=data['break_start'],
            break_end=data['break_end'],
            total_hours=data['total_hours'],
            hourly_wage=data['hourly_wage'],
            currency=data['currency'],
            total_wage=data['total_wage'],
            user_id=session['user_id']
        )
        db.session.add(new_shift)
        db.session.commit()
        return jsonify({'success': True})
    else:
        shifts = Shift.query.filter_by(user_id=session['user_id']).all()
        return jsonify([{
            'date': s.date,
            'shift_type': s.shift_type,
            'start_time': s.start_time,
            'end_time': s.end_time,
            'break_start': s.break_start,
            'break_end': s.break_end,
            'total_hours': s.total_hours,
            'hourly_wage': s.hourly_wage,
            'currency': s.currency,
            'total_wage': s.total_wage
        } for s in shifts])

@app.route('/api/export')
def export_csv():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    shifts = Shift.query.filter_by(user_id=session['user_id']).all()
    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Date','Shift Type','Start','End','Break Start','Break End','Total Hours','Hourly Wage','Currency','Total Wage'])
    for s in shifts:
        cw.writerow([s.date, s.shift_type, s.start_time, s.end_time, s.break_start, s.break_end, s.total_hours, s.hourly_wage, s.currency, s.total_wage])
    mem = io.BytesIO()
    mem.write(si.getvalue().encode('utf-8'))
    mem.seek(0)
    return send_file(mem, mimetype='text/csv', as_attachment=True, download_name='my_shifts.csv')

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
