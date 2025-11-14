import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgChartsModule } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { environment } from '../environments/environment';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JwtModule } from '@auth0/angular-jwt';
import { ToastrModule } from 'ngx-toastr';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
import { DashboardRestauranteComponent } from './componentes/dashboard-restaurante/dashboard-restaurante.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PratosListComponent } from './componentes/pratos-list/pratos-list.component';
import { PratoFormComponent } from './componentes/prato-form/prato-form.component';
import { PratoEditComponent } from './componentes/prato-edit/prato-edit.component';
import { CardapioComponent } from './componentes/cardapio/cardapio.component';
import { AvaliacaoPratoListComponent } from './componentes/avaliacao-prato-list/avaliacao-prato-list.component';
import { AvaliacaoPratoFormComponent } from './componentes/avaliacao-prato-form/avaliacao-prato-form.component';
import { RecuperarSenhaComponent } from './componentes/recuperar-senha/recuperar-senha.component';
import { RedefinirSenhaComponent } from './componentes/redefinir-senha/redefinir-senha.component';
import { RestaurantesProximosComponent } from './componentes/restaurantes-proximos/restaurantes-proximos.component';
import { DenunciasRestauranteComponent } from './componentes/denuncias-restaurante/denuncias-restaurante.component';
import { NotificacoesComponent } from './componentes/notificacoes/notificacoes.component';
import { FiltroAvancadoComponent } from './componentes/filtro-avancado/filtro-avancado.component';
import { ComplementarCadastroComponent } from './componentes/complementar-cadastro/complementar-cadastro.component';
import { CacheService } from './services/cache.service';
import { GraficoEvolucaoComponent } from './componentes/grafico-evolucao/grafico-evolucao.component';
import { GraficoMensalComparativoComponent } from './componentes/grafico-mensal-comparativo/grafico-mensal-comparativo.component';
import { GraficoComparacaoPratosComponent } from './componentes/grafico-comparacao-pratos/grafico-comparacao-pratos.component';
import { TagsSelectorComponent } from './componentes/tags-selector/tags-selector.component';
import { TagService } from './services/tag.service';
import { RestaurantTagsBadgesComponent } from './componentes/restaurant-tags-badges/restaurant-tags-badges.component';
import { CupomFormComponent } from './componentes/cupom-form/cupom-form.component';
import { CupomListComponent } from './componentes/cupom-list/cupom-list.component';
import { ClienteCuponsComponent } from './componentes/cliente-cupons/cliente-cupons.component';
import { MeusCuponsComponent } from './componentes/meus-cupons/meus-cupons.component';
import { PontosInfoComponent } from './componentes/pontos-info/pontos-info.component';
import { ModalConfirmacaoComponent } from './componentes/shared/modal-confirmacao/modal-confirmacao.component';


Chart.register(...registerables);

export function tokenGetter() {
  return localStorage.getItem('token');
}

// ✅ CORREÇÃO 2: Função de fábrica para o ngx-translate apontando para o caminho certo.
export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

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
    DashboardRestauranteComponent,
    PratosListComponent,
    PratoFormComponent,
    PratoEditComponent,
    CardapioComponent,
    AvaliacaoPratoListComponent,
    AvaliacaoPratoFormComponent,
    RecuperarSenhaComponent,
    RedefinirSenhaComponent,
    CupomFormComponent,
    CupomListComponent,
    ClienteCuponsComponent,
    MeusCuponsComponent,
    PontosInfoComponent,
    RestaurantesProximosComponent,
    DenunciasRestauranteComponent,
    NotificacoesComponent,
    FiltroAvancadoComponent,
    ComplementarCadastroComponent,
    GraficoEvolucaoComponent,
    GraficoMensalComparativoComponent,
    GraficoComparacaoPratosComponent,
    TagsSelectorComponent,
    RestaurantTagsBadgesComponent,
    ModalConfirmacaoComponent,
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
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),  
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatOptionModule,
  
    // ng2-charts
    NgChartsModule,
  
    // ngx-translate
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      },
      defaultLanguage: 'pt',
      useDefaultLang: true
    }),
  
    // ngx-mask
    NgxMaskDirective,
    NgxMaskPipe,
  ],
  
  providers: [
    provideNgxMask(),
    TagService,
    CacheService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideAnimationsAsync()
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
