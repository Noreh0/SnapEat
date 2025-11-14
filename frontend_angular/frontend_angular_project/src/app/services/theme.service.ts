import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'snapeats-theme';
  private themeSubject = new BehaviorSubject<Theme>(this.getInitialTheme());

  constructor() {
    // Aplicar o tema inicial
    this.applyTheme(this.themeSubject.value);
  }

  /**
   * Observable do tema atual
   */
  get theme$(): Observable<Theme> {
    return this.themeSubject.asObservable();
  }

  /**
   * Getter para o tema atual
   */
  get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  /**
   * Alternar entre light e dark
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Definir um tema específico
   */
  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    this.applyTheme(theme);
    this.saveTheme(theme);
  }

  /**
   * Verificar se está no modo escuro
   */
  isDarkMode(): boolean {
    return this.currentTheme === 'dark';
  }

  /**
   * Obter o tema inicial do localStorage ou preferência do sistema
   */
  private getInitialTheme(): Theme {
    // Tentar pegar do localStorage primeiro
    const saved = localStorage.getItem(this.THEME_KEY) as Theme;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }

    // Se não houver preferência salva, usar a preferência do sistema
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }

    // Fallback para light
    return 'light';
  }

  /**
   * Aplicar o tema ao documento
   */
  private applyTheme(theme: Theme): void {
    if (typeof document !== 'undefined') {
      // Remover a classe do tema anterior
      document.documentElement.classList.remove('theme-light', 'theme-dark');
      
      // Adicionar a classe do novo tema
      document.documentElement.classList.add(`theme-${theme}`);
      
      // Também adicionar no body para compatibilidade
      document.body.className = document.body.className
        .replace(/theme-(light|dark)/g, '')
        .trim();
      document.body.classList.add(`theme-${theme}`);

      // Debug
      console.log(`🎨 Tema aplicado: ${theme}`);
    }
  }

  /**
   * Salvar o tema no localStorage
   */
  private saveTheme(theme: Theme): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  /**
   * Escutar mudanças na preferência do sistema
   */
  listenToSystemPreference(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      mediaQuery.addEventListener('change', (e) => {
        // Só atualizar se não houver preferência salva do usuário
        const saved = localStorage.getItem(this.THEME_KEY);
        if (!saved) {
          const theme = e.matches ? 'dark' : 'light';
          this.setTheme(theme);
        }
      });
    }
  }
}