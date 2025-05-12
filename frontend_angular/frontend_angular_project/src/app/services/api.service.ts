
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' })
  };

  constructor(private httpService: HttpClient) { }


  getIPInfo(): Observable<any> {
    return this.httpService.get('https://ipapi.co/json/', this.httpOptions)
      .pipe(
        map(response => response),
        catchError(() => throwError(() => 'Problem with IP info'))
      );
  }
}