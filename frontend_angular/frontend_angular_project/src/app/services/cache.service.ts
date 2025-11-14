// src/app/services/cache.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache: { [key: string]: any } = {};

  get<T>(key: string): T | null {
    const item = this.cache[key];
    if (!item) return null;
    
    // Se tiver expiração, verificar
    if (item.expiry && item.expiry < new Date().getTime()) {
      this.remove(key);
      return null;
    }
    
    return item.value as T;
  }

  set<T>(key: string, value: T, ttlMinutes: number = 30): void {
    const expiry = ttlMinutes > 0 ? new Date().getTime() + (ttlMinutes * 60 * 1000) : 0;
    this.cache[key] = { value, expiry: expiry || null };
  }

  remove(key: string): void {
    delete this.cache[key];
  }

  clear(): void {
    this.cache = {};
  }
}