import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';
import { EmailFormComponent } from './components/email-form/email-form.component';
import { SendEmailComponent } from './components/send-email/send-email.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AuthGuard } from './services/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { UserTransactionsComponent } from './components/user-transactions/user-transactions.component';
import { RegisterComponent } from './components/register/register.component';
import { EmailListComponent } from './components/email-list/email-list.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'user-transactions', 
    component: UserTransactionsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'send-email', 
    component: SendEmailComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'email-list', 
    component: EmailListComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [AuthGuard] 
  },
  { path: 'register', component: RegisterComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

export { routes };
