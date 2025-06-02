
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
  {
  path: 'perfilRestaurante/:id_restaurante',
  component: PerfilRestauranteComponent,
  canActivate: [AuthGuard]
  // removi data.tipo aqui: qualquer usuário logado pode ver o perfil
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
  path: 'perfilRestaurante/:id_restaurante/editarRestaurante',
  component: EditarRestauranteComponent,
  canActivate: [AuthGuard],
  data: { tipo: 'restaurante' }
},
// não defina rota de excluir!

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
      path: ':id_cliente/editarAvaliacao/:id_avaliacao',
      component: EditarAvaliacaoComponent,
      canActivate: [AuthGuard],
      data: { tipo: 'cliente' }
    }
  ]
},
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
  {
  path: 'dashboard-restaurante',
  component: DashboardRestauranteComponent,
  canActivate: [AuthGuard],
  data: { tipo: 'restaurante' }
}

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}