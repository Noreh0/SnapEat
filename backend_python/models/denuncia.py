from datetime import datetime
from sql_alchemy import banco

class denunciaModel(banco.Model):
    __tablename__ = 'denuncia'
    ID = banco.Column(banco.Integer, primary_key=True)
    avaliacao_id = banco.Column(banco.Integer, banco.ForeignKey('avaliacao.ID'), nullable=False)
    restaurante_id = banco.Column(banco.Integer, nullable=False)  # redundante para facilitar consultas
    cliente_id = banco.Column(banco.Integer, nullable=False)
    motivo = banco.Column(banco.String(500), nullable=False)
    status = banco.Column(banco.String(20), default='PENDENTE')  # PENDENTE, ACEITA, RECUSADA
    created_at = banco.Column(banco.DateTime, default=datetime.utcnow)
    resolved_at = banco.Column(banco.DateTime, nullable=True)
    resolved_by = banco.Column(banco.Integer, nullable=True)  # restaurante_id que decidiu
    observacao_admin = banco.Column(banco.String(500), nullable=True)  # Para observações automáticas
    
    def json(self):
        return {
            "ID": self.ID,
            "avaliacao_id": self.avaliacao_id,
            "restaurante_id": self.restaurante_id,
            "cliente_id": self.cliente_id,
            "motivo": self.motivo,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "observacao_admin": self.observacao_admin
        }