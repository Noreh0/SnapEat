import pytest
from services.email_service import EmailService

@pytest.mark.unit
class TestEmailService:
    """Testes para o serviço de email"""
    
    def test_email_service_exists(self):
        """Verifica se o serviço de email existe"""
        from services.email_service import email_service
        assert email_service is not None
    
    def test_email_service_has_mail(self):
        """Verifica se o serviço tem referência ao Mail"""
        from services.email_service import email_service
        assert hasattr(email_service, 'mail')
    
    @pytest.mark.email
    def test_enviar_email_redefinicao(self, app):
        """Testa envio de email de redefinição (mock)"""
        with app.app_context():
            from services.email_service import email_service
            
            # Não enviar de verdade, apenas verificar estrutura
            assert hasattr(email_service, 'enviar_email_redefinicao')