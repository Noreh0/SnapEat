from flask import Flask, flash, session
from flask_restx import Resource, reqparse
from models.usuario import UsuarioModel
from sql_alchemy import banco
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
import hmac
from datetime import datetime
from flask import request
from werkzeug.security import generate_password_hash
from utils.decorators import cliente_required
import traceback  # ✅ ADICIONAR
from sqlalchemy import text  # ✅ ADICIONAR para SQL direto

def safe_str_cmp(email: str, senha: str) -> bool:
    return hmac.compare_digest(email, senha)
    
atributos = reqparse.RequestParser()
atributos.add_argument('Nome', type=str, required=True, help="O campo 'Nome' não pode ser deixado em branco!")
atributos.add_argument('CPF', type=str, required=True, help="Não deixar o campo 'CPF' em branco.")
atributos.add_argument('email', type=str, required=True, help="Adicione um 'email'.")
atributos.add_argument('senha', type=str, required=True, help="O campo 'senha' deve ser preenchido.")
atributos.add_argument('telefone', type=str, required=True, help="Coloque seu 'telefone'.")
atributos.add_argument('Cidade', type=str, required=True, help="Adicione sua 'Cidade'.")
atributos.add_argument('rede_social', type=str, required=False, help="URL da rede social (opcional).")

login = reqparse.RequestParser()
login.add_argument('email', type=str, required=True, help="Adicione um 'email'.")
login.add_argument('senha', type=str, required=True, help="O campo 'senha' deve ser preenchido.")


class Usuario(Resource):
    def get(self, ID):
        """Retorna um usuário por ID"""
        try:
            # ✅ Validar ID
            if not isinstance(ID, int) or ID <= 0:
                return {
                    'message': 'ID inválido.',
                    'tipo_erro': 'invalid_id'
                }, 422  # ✅ Unprocessable Entity
            
            usuario = UsuarioModel.find_by_id(ID)
            if not usuario:
                return {
                    'message': 'Usuário não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            return usuario.json(), 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar usuário: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar usuário.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error


class removerUsuario(Resource):
    @jwt_required()
    @cliente_required
    def delete(self, ID):
        """Remove um usuário e todas as suas dependências"""
        print("=" * 80)
        print(f"🗑️ INICIANDO EXCLUSÃO DO USUÁRIO ID: {ID}")
        print("=" * 80)
        
        try:
            # ✅ Verificar ownership
            usuario_logado = get_jwt_identity()
            print(f"👤 Usuário logado: {usuario_logado}")
            print(f"🎯 Tentando excluir: {ID}")
            
            try:
                usuario_logado_int = int(usuario_logado)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if usuario_logado_int != ID:
                print(f"❌ ACESSO NEGADO: usuário {usuario_logado} tentando excluir {ID}")
                return {
                    'message': 'Você não pode excluir outro usuário.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # ✅ Verificar se usuário existe
            usuario = UsuarioModel.find_by_id(ID)
            if not usuario:
                return {
                    'message': 'Usuário não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            print(f"✅ Usuário encontrado: {usuario.Nome}")
            
            # Importar modelos necessários
            from models.avaliacao import avaliacaoModel
            from models.denuncia import denunciaModel
            from models.avaliacao_prato import avaliacaoPratoModel
            
            # 1. Remover denúncias feitas PELO usuário
            print(f"\n🔍 ETAPA 1: Removendo denúncias feitas pelo usuário")
            denuncias_feitas = denunciaModel.query.filter_by(cliente_id=ID).all()
            print(f"   Total de denúncias feitas: {len(denuncias_feitas)}")
            for denuncia in denuncias_feitas:
                print(f"   - Removendo denúncia #{denuncia.ID}")
                banco.session.delete(denuncia)
            banco.session.flush()
            
            # 2. Buscar avaliações do usuário
            print(f"\n🔍 ETAPA 2: Processando avaliações de restaurantes")
            avaliacoes = avaliacaoModel.query.filter_by(ID_Cliente=ID).all()
            print(f"   Total de avaliações: {len(avaliacoes)}")
            
            # 3. Para cada avaliação, excluir denúncias relacionadas
            for avaliacao in avaliacoes:
                print(f"   - Processando avaliação #{avaliacao.ID}")
                
                denuncias_aval = denunciaModel.query.filter_by(avaliacao_id=avaliacao.ID).all()
                print(f"     - Denúncias relacionadas: {len(denuncias_aval)}")
                for denuncia in denuncias_aval:
                    print(f"     - Removendo denúncia #{denuncia.ID}")
                    banco.session.delete(denuncia)
                
                print(f"     - Removendo avaliação #{avaliacao.ID}")
                banco.session.delete(avaliacao)
            
            banco.session.flush()
            
            # 4. Remover avaliações de pratos
            print(f"\n🔍 ETAPA 3: Removendo avaliações de pratos")
            avaliacoes_prato = avaliacaoPratoModel.query.filter_by(ID_Cliente=ID).all()
            print(f"   Total de avaliações de pratos: {len(avaliacoes_prato)}")
            for ap in avaliacoes_prato:
                print(f"   - Removendo avaliação de prato #{ap.ID}")
                banco.session.delete(ap)
            
            banco.session.flush()
            
            # 4. Remover pontos do usuário (tabelas pontosusuario e historicopontos)
            print(f"\n🔍 ETAPA 4: Removendo pontos do usuário")
            try:
                # Tentar importar modelo de pontos
                from models.pontos_usuario import PontosUsuarioModel
                pontos_usuario = PontosUsuarioModel.query.filter_by(cliente_id=ID).all()
                print(f"   Total de registros na tabela pontos: {len(pontos_usuario)}")
                for ponto in pontos_usuario:
                    print(f"   - Removendo registro de pontos #{ponto.ID}")
                    banco.session.delete(ponto)
                banco.session.flush()
            except ImportError:
                print("   - Modelo PontosUsuarioModel não encontrado, executando SQL direto")
            except Exception as e:
                print(f"   - Erro ao remover pontos pelo modelo: {e}")
            
            # Remover da tabela pontosusuario (sempre executar por segurança)
            try:
                result = banco.session.execute(text("DELETE FROM pontosusuario WHERE cliente_id = :cliente_id"), {"cliente_id": ID})
                print(f"   - Removidos {result.rowcount} registros da tabela pontosusuario")
                banco.session.flush()
            except Exception as e:
                print(f"   - Erro ao remover da tabela pontosusuario: {e}")
            
            # Remover da tabela historicopontos (se existir)
            try:
                result = banco.session.execute(text("DELETE FROM historicopontos WHERE cliente_id = :cliente_id"), {"cliente_id": ID})
                print(f"   - Removidos {result.rowcount} registros da tabela historicopontos")
                banco.session.flush()
            except Exception as e:
                print(f"   - Erro ao remover da tabela historicopontos: {e}")
            
            # 5. Anonimizar antes de excluir
            print(f"\n🔍 ETAPA 5: Anonimizando dados do usuário")
            usuario.Nome = f"Usuário Excluído #{ID}"
            usuario.CPF = "000.000.000-00"
            usuario.email = f"excluido_{ID}@deleted.example.com"
            usuario.telefone = "(00) 00000-0000"
            
            # 6. Excluir usuário
            print(f"\n🔍 ETAPA 6: Removendo usuário do banco")
            banco.session.delete(usuario)
            
            # 7. Commit final
            banco.session.commit()
            
            print(f"\n✅ USUÁRIO {ID} REMOVIDO COM SUCESSO!")
            print("=" * 80)
            
            return {
                'message': 'Usuário removido com sucesso.',
                'id': ID
            }, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"\n❌ ERRO AO EXCLUIR USUÁRIO {ID}:")
            print(f"   {str(e)}")
            traceback.print_exc()
            print("=" * 80)
            return {
                'message': 'Erro interno ao remover usuário.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error


class editarUsuario(Resource):
    @jwt_required()
    @cliente_required
    def put(self, ID):
        """Atualiza dados de um usuário"""
        try:
            # ✅ Verificar ownership
            usuario_logado = get_jwt_identity()
            
            try:
                usuario_logado_int = int(usuario_logado)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if usuario_logado_int != ID:
                return {
                    'message': 'Você não pode editar outro usuário.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # ✅ Verificar se usuário existe
            usuario = UsuarioModel.find_by_id(ID)
            if not usuario:
                return {
                    'message': 'Usuário não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            # ✅ Validar dados
            dados = atributos.parse_args()
            
            # Validar nome
            if len(dados['Nome'].strip()) < 3:
                return {
                    'message': 'Nome deve ter pelo menos 3 caracteres.',
                    'tipo_erro': 'invalid_name',
                    'tamanho_minimo': 3
                }, 422  # ✅ Unprocessable Entity
            
            # Validar CPF (formato básico)
            cpf = dados['CPF'].replace('.', '').replace('-', '').strip()
            if len(cpf) != 11 or not cpf.isdigit():
                return {
                    'message': 'CPF inválido. Deve conter 11 dígitos.',
                    'tipo_erro': 'invalid_cpf'
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar email único (se estiver mudando)
            if dados['email'] != usuario.email:
                email_existente = UsuarioModel.find_by_email(dados['email'])
                if email_existente:
                    return {
                        'message': 'Email já cadastrado por outro usuário.',
                        'tipo_erro': 'duplicate_email'
                    }, 409  # ✅ Conflict
            
            # ✅ Validar senha
            if len(dados['senha']) < 6:
                return {
                    'message': 'Senha deve ter pelo menos 6 caracteres.',
                    'tipo_erro': 'invalid_password',
                    'tamanho_minimo': 6
                }, 422  # ✅ Unprocessable Entity
            
            # Atualizar
            usuario.update(
                Nome=dados['Nome'],
                CPF=dados['CPF'],
                email=dados['email'],
                senha=dados['senha'],
                telefone=dados['telefone'],
                Cidade=dados['Cidade'],
                rede_social=dados.get('rede_social')
            )
            
            print(f"✅ Usuário atualizado: ID={ID}")
            
            return usuario.json(), 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao atualizar usuário: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao atualizar usuário.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error


class buscarUsuario(Resource):
    def get(self, email):
        """Busca usuário por email"""
        try:
            # ✅ Validar email
            if not email or '@' not in email:
                return {
                    'message': 'Email inválido.',
                    'tipo_erro': 'invalid_email'
                }, 422  # ✅ Unprocessable Entity
            
            buscar = UsuarioModel.find_email_usuario(email)
            
            if not buscar:
                return {
                    'message': 'Usuário não encontrado com este email.',
                    'tipo_erro': 'not_found'
                }, 404  # ✅ Not Found
            
            return buscar, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar usuário por email: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar usuário.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error


class allClientes(Resource):
    def get(self):
        """Lista todos os clientes"""
        try:
            listar = UsuarioModel.findAll()
            return listar, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao listar clientes: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao listar clientes.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error


class encontrarEmail(Resource):
    def get(self, email):
        """Encontra usuário por email (retorna objeto completo)"""
        try:
            # ✅ Validar email
            if not email or '@' not in email:
                return {
                    'message': 'Email inválido.',
                    'tipo_erro': 'invalid_email'
                }, 422  # ✅ Unprocessable Entity
            
            buscarEmail = UsuarioModel.find_by_email(email)
            
            if not buscarEmail:
                return {
                    'message': 'Usuário não encontrado com este email.',
                    'tipo_erro': 'not_found'
                }, 404  # ✅ Not Found
            
            return buscarEmail, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao encontrar email: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar usuário.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error