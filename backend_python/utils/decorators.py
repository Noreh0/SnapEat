from functools import wraps
from flask_jwt_extended import get_jwt
from flask import jsonify

def cliente_required(fn):
    """Decorator para garantir que apenas clientes acessem a rota"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('tipo') != 'cliente':
            return jsonify({'message': 'Acesso restrito a clientes'}), 403
        return fn(*args, **kwargs)
    return wrapper

def restaurante_required(fn):
    """Decorator para garantir que apenas restaurantes acessem a rota"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('tipo') != 'restaurante':
            return jsonify({'message': 'Acesso restrito a restaurantes'}), 403
        return fn(*args, **kwargs)
    return wrapper

def any_authenticated(fn):
    """Decorator para qualquer usuário autenticado (cliente ou restaurante)"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('tipo') not in ['cliente', 'restaurante']:
            return jsonify({'message': 'Acesso não autorizado'}), 403
        return fn(*args, **kwargs)
    return wrapper