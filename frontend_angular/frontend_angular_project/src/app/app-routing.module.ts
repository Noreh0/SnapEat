
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
    path: 'perfilCliente',
    children: [
      {
        path: ':id_cliente',
        component: PerfilClienteComponent,
      },
      {
        path: ':id_cliente/editarCliente',
        component: EditarClienteComponent,
      },
      {
        path: ':id_cliente/editarAvaliacao/:id_avaliacao',
        component: EditarAvaliacaoComponent,
      },
    ],
  },
  {
    path: 'perfilRestaurante',
    children: [
      {
        path: ':id_restaurante',
        component: PerfilRestauranteComponent,
      },
      {
        path: ':id_restaurante/criaAvaliacao',
        component: CadastroAvaliacaoComponent,
      },
      {
        path: ':id_restaurante/editarRestaurante',
        component: EditarRestauranteComponent,
      },
    ],
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
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}