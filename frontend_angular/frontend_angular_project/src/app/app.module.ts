import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgChartsModule } from 'ng2-charts';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { JwtModule } from '@auth0/angular-jwt';
export function tokenGetter() {
  return localStorage.getItem('token');
}
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AdminComponent } from './componentes/admin/admin.component';
import { AvaliacaoComponent } from './componentes/avaliacao/avaliacao.component';
import { CabecalhoComponent } from './componentes/cabecalho/cabecalho.component';
import { CadastroClienteComponent } from './componentes/cadastro-cliente/cadastro-cliente.component';
import { CadastroRestauranteComponent } from './componentes/cadastro-restaurante/cadastro-restaurante.component';
import { CadastroAvaliacaoComponent } from './componentes/criar-avaliacao/criar-avaliacao.component';
import { EditarAvaliacaoComponent } from './componentes/editar-avaliacao/editar-avaliacao.component';
import { EditarClienteComponent } from './componentes/editar-cliente/editar-cliente.component';
import { EditarRestauranteComponent } from './componentes/editar-restaurante/editar-restaurante.component';
import { LoginComponent } from './componentes/login/login.component';
import { BotaoCarregarMaisComponent } from './componentes/menu/botao-carregar-mais/botao-carregar-mais.component';
import { MenuComponent } from './componentes/menu/menu.component';
import { PerfilClienteComponent } from './componentes/perfil-cliente/perfil-cliente.component';
import { PerfilRestauranteComponent } from './componentes/perfil-restaurante/perfil-restaurante.component';
import { RestauranteComponent } from './componentes/restaurante/restaurante.component';
import { RodapeComponent } from './componentes/rodape/rodape.component';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { GraficoComponent } from './componentes/grafico/grafico.component';
@NgModule({
  declarations: [
    AppComponent,
    CabecalhoComponent,
    MenuComponent,
    RodapeComponent,
    CadastroClienteComponent,
    CadastroRestauranteComponent,
    CadastroAvaliacaoComponent,
    LoginComponent,
    AvaliacaoComponent,
    RestauranteComponent,
    PerfilClienteComponent,
    PerfilRestauranteComponent,
    BotaoCarregarMaisComponent,
    AdminComponent,
    EditarClienteComponent,
    EditarRestauranteComponent,
    EditarAvaliacaoComponent,
    GraficoComponent,
  ],
  imports: [
    JwtModule.forRoot({
    config: {
      tokenGetter: tokenGetter,
      allowedDomains: ['localhost:5000'],
      disallowedRoutes: ['http://localhost:5000/auth/login'],
    },
  }),
    BrowserModule,
    CommonModule,
    RouterModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
  
    // Angular Material
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatDividerModule,
    MatSelectModule,
    MatMenuModule,
    MatTableModule,
    MatTabsModule,
    MatDialogModule,
  
    // ng2-charts
    NgChartsModule,
  
    // ngx-translate
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  
    // ngx-mask
    NgxMaskDirective,
    NgxMaskPipe,
  ],
  
  providers: [
  provideNgxMask(),
  CabecalhoComponent,
  { provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
  JwtHelperService,
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true,
  }
],

  bootstrap: [AppComponent],
})
export class AppModule {}

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}