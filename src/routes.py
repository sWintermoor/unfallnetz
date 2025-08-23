from flask import render_template, make_response

from .cookie_handler import create_cookie

def register_routes(app):
    @app.route('/')
    def index():
        resp = make_response(render_template('index.html'))
        resp.set_cookie("key", create_cookie())
        return resp
