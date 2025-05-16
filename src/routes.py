from flask import render_template

def register_routes(app):
    # Startseite
    @app.route('/')
    def home():
        return render_template("index.html")
    