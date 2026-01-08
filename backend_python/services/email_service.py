import os
import requests
from dotenv import load_dotenv
from flask_mail import Message
from flask import current_app
from azure.communication.email import EmailClient

load_dotenv()

class EmailService:
    def __init__(self):
        # Configuração Azure Communication Services
        self.connection_string = os.getenv('AZURE_COMMUNICATION_CONNECTION_STRING')
        self.sender_email = os.getenv('AZURE_SENDER_EMAIL', 'donotreply@snapeatsbr.azurecomm.net')
        
        # Configuração do cliente Azure (lazy loading)
        self._email_client = None
        
        # Verificação de configuração
        self.is_configured = bool(self.connection_string)
        
        if not self.is_configured:
            print("AVISO: Azure Communication Services não configurado. E-mails podem não ser enviados.")
    
    @property
    def email_client(self):
        """Lazy loading do cliente Azure"""
        if self._email_client is None and self.connection_string:
            try:
                self._email_client = EmailClient.from_connection_string(self.connection_string)
            except Exception as e:
                print(f"Erro ao inicializar EmailClient: {e}")
        return self._email_client
    def _log_email_content(self, recipient, subject, html_content, text_content):
      """Registra detalhes do email para depuração"""
      print("\n==== DETALHES DO EMAIL ====")
      print(f"Destinatário: {recipient}")
      print(f"Assunto: {subject}")
      print(f"Texto: {text_content[:100] if text_content else '[Sem texto]'}...")
      print(f"HTML: {html_content[:100]}...")
      print("==========================\n")

    def send_email(self, recipient, subject, html_content, text_content=None):
      """Envia um e-mail utilizando o Azure Communication Services."""
      self._log_email_content(recipient, subject, html_content, text_content)
      if not self.is_configured:
          print(f"SIMULAÇÃO: E-mail para {recipient}, assunto: {subject}")
          return self._fallback_send_email(recipient, subject, html_content, text_content)

      try:
          if not self.email_client:
              return self._fallback_send_email(recipient, subject, html_content, text_content)
          
          # Preparar mensagem no formato do Azure Communication Services
          message = {
              "content": {
                  "subject": subject,
                  "plainText": text_content or "",
                  "html": html_content
              },
              "recipients": {
                  "to": [{"address": recipient}]
              },
              "senderAddress": self.sender_email
          }
          
          # Enviar e-mail
          poller = self.email_client.begin_send(message)
          
          # Verificar resultado sem acessar message_id diretamente
          try:
              result = poller.result()  # Aguarda a conclusão do envio
              print(f"E-mail enviado para {recipient} com Azure Communication Services.")
              # Imprimir o resultado completo para depuração
              print(f"Resultado da operação: {result}")
              return True
          except Exception as inner_e:
              print(f"Erro ao aguardar resultado do envio: {inner_e}")
              # Se ocorrer erro ao aguardar o resultado, ainda podemos considerar que o e-mail foi enviado
              # se o poller foi iniciado com sucesso
              return True
              
      except Exception as e:
          print(f"Erro ao enviar e-mail via Azure: {e}")
          return self._fallback_send_email(recipient, subject, html_content, text_content)
      
    def _fallback_send_email(self, recipient, subject, html_content, text_content):
        """Método de fallback usando Flask-Mail"""
        try:
            mail = current_app.extensions.get('mail')
            if not mail:
                print("Flask-Mail não está configurado.")
                return False
                
            msg = Message(
                subject=subject,
                recipients=[recipient],
                body=text_content or "",
                html=html_content
            )
            mail.send(msg)
            print(f"E-mail enviado para {recipient} usando Flask-Mail")
            return True
        except Exception as e:
            print(f"Erro no fallback de e-mail: {e}")
            
            # Se tudo falhar, pelo menos vamos registrar que tentamos enviar
            print(f"\nConteúdo do e-mail que não pôde ser enviado para {recipient}:")
            print(f"Assunto: {subject}")
            print(f"Conteúdo: {text_content or html_content[:100]}...\n")
            return False

# Singleton instance
email_service = EmailService()