import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private jwtHelper: JwtHelperService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // 1) Verifica token
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      this.router.navigate(['/login']);
      return false;
    }

    // 2) Decodifica payload
    const payload = this.jwtHelper.decodeToken(token);
    const minhaRole = payload.tipo as string;

    // 3) Se a rota exigir um tipo específico...
    const requiredRole = route.data['tipo'] as string | undefined;
    if (requiredRole && minhaRole !== requiredRole) {
      // se não bater, manda pro menu
      this.router.navigate(['/menu']);
      return false;
    }

    // 4) Tudo certo: usuário logado e com role (se necessário)
    return true;
  }
}
