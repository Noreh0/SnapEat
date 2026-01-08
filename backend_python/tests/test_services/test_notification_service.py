import pytest
from services.notification_service import NotificationService

@pytest.mark.unit
class TestNotificationService:
    """Testes para o serviço de notificações"""
    
    def test_notification_service_exists(self):
        """Verifica se o serviço de notificações existe"""
        from services.notification_service import notification_service
        assert notification_service is not None
    
    def test_criar_notificacao_estrutura(self, app, db, sample_usuario):
        """Testa estrutura de criação de notificação"""
        with app.app_context():
            from models.notificacao import NotificacaoModel
            
            notificacao = NotificacaoModel(
                destinatario_id=sample_usuario.ID,
                tipo_destinatario='cliente',
                titulo='Teste',
                mensagem='Mensagem de teste',
                tipo='info'
            )
            db.session.add(notificacao)
            db.session.commit()
            
            assert notificacao.ID is not None
            assert notificacao.titulo == 'Teste'