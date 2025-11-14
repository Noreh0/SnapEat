import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, Subject, tap, throwError } from 'rxjs';
import { AvaliacaoModel } from '../model/avaliacao.model';
import { CacheService } from '../services/cache.service';
import { environment } from '../../environments/environment';
import { AvaliacaoCompletaModel } from '../model/avaliacao-completa.model';

@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  /** Base URL para todos os endpoints de avaliação */
  private readonly BASE = 'http://localhost:5000/avaliacoes';

  avaliacoesAtualizadas = new Subject<AvaliacaoModel>();

  constructor(
    private http: HttpClient,
    private cacheService: CacheService,
    
  ) {}

  /** Invalida o cache de avaliações de um restaurante */
  invalidarCacheRestaurante(restauranteId: number): void {
    const cacheKey = `avaliacoes_restaurante_${restauranteId}`;
    this.cacheService.remove(cacheKey);
  }
  /** Lista todas as avaliações */
  listar(): Observable<AvaliacaoModel[]> {
    return this.http.get<AvaliacaoModel[]>(this.BASE);
  }

  // DEPOIS (apontando para /avaliando, que é o caminho correto definido no resource)
  criar(av: AvaliacaoModel) {
    // chama exatamente /avaliacoes/avaliando
    return this.http.post<AvaliacaoModel>(`${this.BASE}/avaliando`, av);
  }

  /** Busca uma avaliação pelo seu ID */
  buscarPorId(id: number): Observable<AvaliacaoModel> {
    return this.http.get<AvaliacaoModel>(`${this.BASE}/${id}`);
  }
  /**
   * Busca dados comparativos entre períodos
   * @param restauranteId ID do restaurante
   * @param periodo1Inicio Data de início do primeiro período
   * @param periodo1Fim Data de fim do primeiro período
   * @param periodo2Inicio Data de início do segundo período (opcional)
   * @param periodo2Fim Data de fim do segundo período (opcional)
   */
  compararPeriodos(
    restauranteId: number, 
    periodo1Inicio: string, 
    periodo1Fim: string, 
    periodo2Inicio?: string, 
    periodo2Fim?: string
  ): Observable<any> {
    const params: any = {
      periodo1_inicio: periodo1Inicio,
      periodo1_fim: periodo1Fim
    };
    
    if (periodo2Inicio && periodo2Fim) {
      params.periodo2_inicio = periodo2Inicio;
      params.periodo2_fim = periodo2Fim;
    }
    
    return this.http.get<any>(`${this.BASE}/restaurante/${restauranteId}/comparar-periodos`, { params });
  }

  /** Lista todas as avaliações feitas por um cliente */
  buscarPorCliente(id: number): Observable<AvaliacaoModel[]> {
    return this.http.get<AvaliacaoModel[]>(`${this.BASE}/encontraAvaliacaoCliente/${id}`);
  }

  /** Lista todas as avaliações de um restaurante */
  buscarPorRestaurante(id: number): Observable<AvaliacaoModel[]> {
    const cacheKey = `avaliacoes_restaurante_${id}`;
    const cachedData = this.cacheService.get<AvaliacaoModel[]>(cacheKey);
    
    if (cachedData) {
      return new Observable(observer => {
        observer.next(cachedData);
        observer.complete();
      });
    }
    
    return this.http.get<AvaliacaoModel[]>(`${this.BASE}/restaurante/${id}`).pipe(
      tap(avaliacoes => {
        this.cacheService.set(cacheKey, avaliacoes, 1); // Cachear por apenas 1 minuto (era 5)
      })
    );
  }
  buscarAnaliseNoPeriodo(restauranteId: number, dataInicio: string, dataFim: string): Observable<any> {
    const params = {
      data_inicio: dataInicio,
      data_fim: dataFim
    };
    
    return this.http.get<any>(`${environment.apiUrl}/avaliacoes/restaurante/${restauranteId}/analise-periodo`, { params });
  }

  // No avaliacao.service.ts
  processarAvaliacoes(restauranteId: number): Observable<any> {
    // Limpar cache ao processar avaliacoes
    this.cacheService.remove(`avaliacoes_restaurante_${restauranteId}`);
    return this.http.post<any>(`${this.BASE}/restaurante/${restauranteId}/processar-avaliacoes`, {});
  }
  
  /** Edita uma avaliação existente */
  editar(avaliacao: AvaliacaoModel): Observable<AvaliacaoModel> {
    const url = `${this.BASE}/${avaliacao.ID}`;
    
    return this.http.put<AvaliacaoModel>(url, avaliacao).pipe(
      tap(avaliacaoAtualizada => {
        // Atualizar o cache local (se houver)
        this.atualizarCacheLocal(avaliacaoAtualizada);
        
        // Emitir evento de atualização para outros componentes
        this.avaliacoesAtualizadas.next(avaliacaoAtualizada);
      }),
      catchError(error => {
        console.error('Erro ao editar avaliação:', error);
        return throwError(() => error);
      })
    );
  }
  private atualizarCacheLocal(avaliacao: AvaliacaoModel): void {
    // Se tivermos um cache de avaliações por restaurante
    const cacheKey = `avaliacoes_restaurante_${avaliacao.ID_Restaurante}`;
    const avaliacoesCache = this.cacheService.get<AvaliacaoModel[]>(cacheKey);
    
    if (avaliacoesCache) {
      const avaliacoesAtualizadas = avaliacoesCache.map(a => 
        a.ID === avaliacao.ID ? avaliacao : a
      );
      this.cacheService.set(cacheKey, avaliacoesAtualizadas);
    }
  }

// Método para buscar avaliações de pratos por restaurante
  buscarAvaliacoesPratosPorRestaurante(idRestaurante: number): Observable<any> {
    return this.http.get<any>(`${this.BASE}/avaliacao/pratos/restaurante/${idRestaurante}`);
  }
  
  getMetricasSentimento(restauranteId: number) {
    return this.http.get<{
      positivo: number; neutro: number; negativo: number;
      total: number; percentuais: {positivo: number; neutro: number; negativo: number;}
    }>(`${this.BASE}/restaurante/${restauranteId}/sentimento-metricas`);
  }
  
  // Corrigido: Removido 'avaliacoes' duplicado na URL
  downloadInsightsReport(restauranteId: number): Observable<Blob> {
    return this.http.get(`${this.BASE}/restaurante/${restauranteId}/insights-report`, {
      responseType: 'blob'
    });
  }
  
  /** Exclui uma avaliação pelo ID */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }
  buscarEvolucaoAvaliacoes(
    restauranteId: number,
    dataInicio: string,
    dataFim: string,
    tipoComparacao: string,
    intervalo: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('data_inicio', dataInicio)
      .set('data_fim', dataFim)
      .set('tipo_comparacao', tipoComparacao)
      .set('intervalo', intervalo);

    return this.http.get(
      `${this.BASE}/restaurante/${restauranteId}/evolucao-avaliacoes`,
      { params }
    );
  }
  uploadImagensAvaliacao(avaliacaoId: number, imagens: File[]): Observable<any> {
    const formData = new FormData();
    
    imagens.forEach((imagem, index) => {
      formData.append('imagens', imagem, imagem.name);
    });
    
    return this.http.post<any>(
      `${this.BASE}/${avaliacaoId}/upload-imagens`,
      formData
    );
  }

  removerImagemAvaliacao(avaliacaoId: number, imagemUrl: string): Observable<any> {
    return this.http.delete<any>(
      `${this.BASE}/${avaliacaoId}/remover-imagem`,
      { body: { imagem_url: imagemUrl } }
    );
  }
  criarComImagens(avaliacao: AvaliacaoModel, imagens?: File[]): Observable<any> {
    const formData = new FormData();
    
    formData.append('ID_Cliente', avaliacao.ID_Cliente!.toString());
    formData.append('ID_Restaurante', avaliacao.ID_Restaurante!.toString());
    formData.append('Nota', avaliacao.Nota.toString());
    formData.append('Comentario', avaliacao.Comentario || '');
    
    if (imagens && imagens.length > 0) {
      imagens.forEach((imagem) => {
        formData.append('imagens', imagem, imagem.name);
      });
    }
    
    return this.http.post<any>(`${this.BASE}/avaliando`, formData);
  }
  atualizarComImagensETagsFormData(formData: FormData): Observable<any> {
    const idAvaliacao = formData.get('ID');
    
    // ✅ ANTES estava: `${this.BASE}/avaliacoes/${idAvaliacao}/completa`
    // ✅ AGORA: Remover /avaliacoes pois já está no BASE
    return this.http.put<any>(
      `${this.BASE}/${idAvaliacao}/completa`,
      formData
    );
  }
  criarComImagensETagsFormData(formData: FormData): Observable<any> {
    console.log('📤 Enviando FormData para /avaliacoes/avaliando-com-tags');
    
    return this.http.post<any>(`${this.BASE}/avaliando-com-tags`, formData).pipe(
      tap(response => {
        console.log('✅ Resposta recebida:', response);
      }),
      catchError(error => {
        console.error('❌ Erro na requisição:', error);
        return throwError(() => error);
      })
    );
  }
  buscarAnaliseMensalComparativa(
    restauranteId: number,
    dataInicio: string,
    dataFim: string,
    restaurantesComparacao: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('data_inicio', dataInicio)
      .set('data_fim', dataFim)
      .set('restaurantes_comparacao', restaurantesComparacao);

    return this.http.get(
      `${this.BASE}/restaurante/${restauranteId}/analise-mensal-comparativa`,
      { params }
    );
  }

  buscarComparacaoPratos(
    restauranteId: number,
    dataInicio: string,
    dataFim: string,
    pratosIds: string,
    metrica: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('data_inicio', dataInicio)
      .set('data_fim', dataFim)
      .set('pratos_ids', pratosIds)
      .set('metrica', metrica);

    const url = `${this.BASE}/restaurante/${restauranteId}/comparacao-pratos`;
    
    console.log('🌐 URL da requisição:', url);
    console.log('📋 Parâmetros:', {
      data_inicio: dataInicio,
      data_fim: dataFim,
      pratos_ids: pratosIds,
      metrica: metrica
    });

    return this.http.get(url, { params }).pipe(
      tap(response => {
        console.log('✅ Resposta da API comparação pratos:', response);
      }),
      catchError(error => {
        console.error('❌ Erro na API comparação pratos:', error);
        return throwError(() => error);
      })
    );
  }
}