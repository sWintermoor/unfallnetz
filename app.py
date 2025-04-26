from flask import Flask, render_template

# Erstelle eine Flask-Anwendung
app = Flask(__name__)

# Definiere eine Route (eine URL, die eine Funktion aufruft)
@app.route('/')
def home():
    return render_template("index.html")

# Starte die Anwendung
if __name__ == '__main__':
    app.run(debug=True)
