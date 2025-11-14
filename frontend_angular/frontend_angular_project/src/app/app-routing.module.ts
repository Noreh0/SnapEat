
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './componentes/admin/admin.component';
import { CadastroClienteComponent } from './componentes/cadastro-cliente/cadastro-cliente.component';
import { CadastroRestauranteComponent } from './componentes/cadastro-restaurante/cadastro-restaurante.component';
import { CadastroAvaliacaoComponent } from './componentes/criar-avaliacao/criar-avaliacao.component';
import { EditarAvaliacaoComponent } from './componentes/editar-avaliacao/editar-avaliacao.component';
import { EditarClienteComponent } from './componentes/editar-cliente/editar-cliente.component';
import { EditarRestauranteComponent } from './componentes/editar-restaurante/editar-restaurante.component';
import { LoginComponent } from './componentes/login/login.component';
import { MenuComponent } from './componentes/menu/menu.component';
import { PerfilClienteComponent } from './componentes/perfil-cliente/perfil-cliente.component';
import { PerfilRestauranteComponent } from './componentes/perfil-restaurante/perfil-restaurante.component';
import { GraficoComponent } from './componentes/grafico/grafico.component';
import { DashboardRestauranteComponent } from './componentes/dashboard-restaurante/dashboard-restaurante.component';
import { AuthGuard } from './guards/auth.guard';
import { RestauranteComponent } from './componentes/restaurante/restaurante.component';
import { PratoFormComponent } from './componentes/prato-form/prato-form.component';
import { PratoEditComponent } from './componentes/prato-edit/prato-edit.component';
import { PratosListComponent } from './componentes/pratos-list/pratos-list.component';
import { CardapioComponent } from './componentes/cardapio/cardapio.component';
import { AvaliacaoPratoListComponent } from './componentes/avaliacao-prato-list/avaliacao-prato-list.component';
import { AvaliacaoPratoFormComponent } from './componentes/avaliacao-prato-form/avaliacao-prato-form.component';
import { RecuperarSenhaComponent } from './componentes/recuperar-senha/recuperar-senha.component';
import { RedefinirSenhaComponent } from './componentes/redefinir-senha/redefinir-senha.component';
import { DenunciasRestauranteComponent } from './componentes/denuncias-restaurante/denuncias-restaurante.component';
import { ComplementarCadastroComponent } from './componentes/complementar-cadastro/complementar-cadastro.component';
import { CupomFormComponent } from './componentes/cupom-form/cupom-form.component';
import { CupomListComponent } from './componentes/cupom-list/cupom-list.component';
import { ClienteCuponsComponent } from './componentes/cliente-cupons/cliente-cupons.component';
import { MeusCuponsComponent } from './componentes/meus-cupons/meus-cupons.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'menu',
    pathMatch: 'full',
  },
  {
    path: 'cadastroCliente',
    component: CadastroClienteComponent,
  },
  {
    path: 'menu',
    component: MenuComponent,
  },
  // Rota simplificada para avaliar restaurante
  {
    path: 'avaliar/:id',
    redirectTo: 'perfilRestaurante/:id/criaAvaliacao',
    pathMatch: 'full'
  },
  { path: 'restaurante/:id',
    component: RestauranteComponent 
  },
  { path: 'dashboard-restaurante/:id', component: DashboardRestauranteComponent },
    {
    path: 'perfil-restaurante/:id',
    component: PerfilRestauranteComponent,
    canActivate: [AuthGuard]
  },
  
  // Rota alternativa para compatibilidade com links antigos
  {
    path: 'perfilRestaurante/:id',
    redirectTo: 'perfil-restaurante/:id',
    pathMatch: 'full'
  },
{
    path: 'restaurante/:id/pratos',
    component: PratosListComponent
  },
  {
    path: 'restaurante/:id/pratos/criar',
    component: PratoFormComponent
  },
  {
    path: 'restaurante/:id/cardapio',
    component: CardapioComponent
  },
  {
    path: 'restaurante/:restauranteId/pratos/:pratoId/editar',
    component: PratoEditComponent
  },
  // Rotas de cupons - Restaurante (gerenciar)
  {
    path: 'restaurante/:id/cupons',
    component: CupomListComponent,
    canActivate: [AuthGuard],
    data: { tipo: 'restaurante' }
  },
  {
    path: 'restaurante/:id/cupons/novo',
    component: CupomFormComponent,
    canActivate: [AuthGuard],
    data: { tipo: 'restaurante' }
  },
  {
    path: 'restaurante/:id/cupons/editar/:cupomId',
    component: CupomFormComponent,
    canActivate: [AuthGuard],
    data: { tipo: 'restaurante' }
  },
  // Rotas de cupons - Cliente (resgatar)
  {
    path: 'cliente/cupons/:restauranteId',
    component: ClienteCuponsComponent,
    canActivate: [AuthGuard],
    data: { tipo: 'cliente' }
  },
  { path: 'recuperar-senha', component: RecuperarSenhaComponent },
  {
    path: 'redefinir-senha/:token',
    component: RedefinirSenhaComponent,
    // Importante: preserve o token completo sem parsing
    pathMatch: 'full'
  },
  {
    path: 'complementar-cadastro',
    component: ComplementarCadastroComponent,
  },

{
  path: 'perfilRestaurante/:id_restaurante/criaAvaliacao',
  component: CadastroAvaliacaoComponent,
  canActivate: [AuthGuard],
  data: { tipo: 'cliente' }  
  // só cliente pode criar avaliação
},

// app-routing.module.ts
{
  path: 'editar-restaurante/:id',
  component: EditarRestauranteComponent,
  canActivate: [AuthGuard],
  data: { tipo: 'restaurante' }
},
// não defina rota de excluir!

  {
    path: 'prato/:pratoId/avaliacoes',
    component: AvaliacaoPratoListComponent
  },
  { path: 'restaurante/:id/denuncias', component: DenunciasRestauranteComponent },
  {
    path: 'prato/:pratoId/avaliacoes/criar',
    component: AvaliacaoPratoFormComponent
  },
  {
    path: 'prato/:pratoId/avaliacoes/:id/editar',
    component: AvaliacaoPratoFormComponent
  },


  {
  path: 'perfilCliente',
  children: [
    {
      path: ':id_cliente',
      component: PerfilClienteComponent,
      canActivate: [AuthGuard],
      data: { tipo: 'cliente' }
    },
    {
      path: ':id_cliente/editarCliente',
      component: EditarClienteComponent,
      canActivate: [AuthGuard],
      data: { tipo: 'cliente' }
    },
    {
      path: ':id_cliente/meus-cupons',
      component: MeusCuponsComponent,
      canActivate: [AuthGuard],
      data: { tipo: 'cliente' }
    },
  ]
},
// E adicione fora do children:
{
  path: 'perfilCliente/:id_cliente/editarAvaliacao/:id_avaliacao',
  component: EditarAvaliacaoComponent,
  canActivate: [AuthGuard],
  data: { tipo: 'cliente' }
},
// ...existing code...
  {
    path: 'cadastroRestaurante',
    component: CadastroRestauranteComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'admin',
    component: AdminComponent,
  },

  {
    path: 'grafico/:id_restaurante',
    component: GraficoComponent,
  },

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}