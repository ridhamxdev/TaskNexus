import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SuperadminDashboardComponent } from './components/superadmin-dashboard/superadmin-dashboard.component';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';
import { EmailFormComponent } from './components/email-form/email-form.component';
import { SendEmailComponent } from './components/send-email/send-email.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AuthGuard } from './services/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { LoginComponent } from './components/login/login.component';
import { UserTransactionsComponent } from './components/user-transactions/user-transactions.component';
import { RegisterComponent } from './components/register/register.component';
import { EmailListComponent } from './components/email-list/email-list.component';
import { OtpVerificationComponent } from './components/otp-verification/otp-verification.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'verify-otp', component: OtpVerificationComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user'] }
  },
  { 
    path: 'superadmin-dashboard', 
    component: SuperadminDashboardComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['superadmin'] }
  },
  { 
    path: 'user-transactions', 
    component: UserTransactionsComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user'] }
  },
  { 
    path: 'send-email', 
    component: SendEmailComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user'] }
  },
  { 
    path: 'email-list', 
    component: EmailListComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user'] }
  },
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user', 'superadmin'] }
  },
  { path: 'register', component: RegisterComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

export { routes };
