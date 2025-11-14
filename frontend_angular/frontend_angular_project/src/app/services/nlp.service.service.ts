// criar service
// filepath: c:\Users\Heron\project_Tcc\frontend_angular_project\src\app\services\nlp.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class NlpService {
  private API = 'http://localhost:5000/nlp';
  constructor(private http: HttpClient) {}
  analisar(texto: string){
    return this.http.post<{sentimento:string; label_id:number}>(`${this.API}/sentimento`, { texto });
  }
  

}