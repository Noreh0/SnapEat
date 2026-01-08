import os
import uuid
import datetime
from dotenv import load_dotenv
import json
import requests  # Usaremos requests em vez da biblioteca SDK

load_dotenv()

class NotificationService:
    def __init__(self):
        self.event_grid_key = os.getenv('AZURE_EVENT_GRID_KEY')
        self.event_grid_endpoint = os.getenv('AZURE_EVENT_GRID_ENDPOINT')
        
        self.is_configured = self.event_grid_key is not None and self.event_grid_endpoint is not None
        
        if not self.is_configured:
            print("Serviço de notificação não configurado. Verifique as variáveis de ambiente.")

    def send_notification(self, event_type, subject, data):
        """Envia notificação usando Azure Event Grid."""
        if not self.is_configured:
            print("Notificação não enviada: serviço não configurado.")
            return False
        
        try:
            event = [{
                'id': str(uuid.uuid4()),
                'subject': subject,
                'data': data,
                'eventType': event_type,
                'eventTime': datetime.datetime.utcnow().isoformat(),
                'dataVersion': '1.0'
            }]
            
            headers = {
                'aeg-sas-key': self.event_grid_key,
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                self.event_grid_endpoint,
                data=json.dumps(event),
                headers=headers
            )
            
            if response.status_code >= 200 and response.status_code < 300:
                print(f"Notificação enviada: {event_type} - {subject}")
                return True
            else:
                print(f"Falha ao enviar notificação: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Erro ao enviar notificação: {e}")
            return False

# Singleton instance
notification_service = NotificationService()