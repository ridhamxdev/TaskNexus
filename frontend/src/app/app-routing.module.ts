import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SuperadminDashboardComponent } from './components/superadmin-dashboard/dashboard.component';
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
import { SubscriptionPlansComponent } from './components/subscription-plans/subscription-plans.component';
import { SubscriptionDashboardComponent } from './components/subscription-dashboard/subscription-dashboard.component';
import { UserDetailsComponent } from './components/superadmin-dashboard/user-details/user-details.component';
import { AboutUserComponent } from './components/superadmin-dashboard/about-user-component/about-user-component.component';
import { FeeConfigurationComponent } from './components/superadmin-dashboard/fee-configuration/fee-configuration.component';
import { SendMoneyFeeComponent } from './components/superadmin-dashboard/send-money-fee/send-money-fee.component';
import { SubscriptionPlanFeeComponent } from './components/superadmin-dashboard/subscription-plan-fee/subscription-plan-fee.component';
import { UserSubscriptionManagementComponent } from './components/superadmin-dashboard/user-subscription-management/user-subscription-management.component';
import { DefaultFeeSettingsComponent } from './components/superadmin-dashboard/default-fee-settings/default-fee-settings.component';
import { DefaultFeeManagementComponent } from './components/superadmin-dashboard/default-fee-management/default-fee-management.component';
import { AddMoneyFeeComponent } from './components/superadmin-dashboard/add-money-fee/add-money-fee.component';
import { NotificationListComponent } from './components/notification-list/notification-list.component';
import { UserFeeVersionsComponent } from './components/user-fee-versions/user-fee-versions.component';
import { TenantDashboardComponent } from './components/tenant-dashboard/tenant-dashboard.component';
import { TenantCreationComponent } from './components/tenant-creation/tenant-creation.component';
import { TenantListComponent } from './components/tenant-list/tenant-list.component';
import { TenantPermissionsComponent } from './components/tenant-permissions/tenant-permissions.component';
import { InvitationAcceptComponent } from './components/invitation-accept/invitation-accept.component';

export const routes: Routes = [
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
  { 
    path: 'notifications', 
    component: NotificationListComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user', 'superadmin'] }
  },
  { 
    path: 'subscription-plans', 
    component: SubscriptionPlansComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user'] }
  },
  { 
    path: 'subscription-dashboard', 
    component: SubscriptionDashboardComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user'] }
  },
  { 
    path: 'fee-versions', 
    component: UserFeeVersionsComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['user'] }
  },
  { 
    path: 'tenants', 
    component: TenantListComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['superadmin', 'tenant'] }
  },
  { 
    path: 'tenants/create', 
    component: TenantCreationComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['superadmin'] }
  },
  { 
    path: 'tenants/:id', 
    component: TenantDashboardComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['tenant', 'superadmin'] }
  },
  { 
    path: 'tenants/:id/users', 
    component: TenantPermissionsComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['tenant', 'superadmin'] }
  },
  { 
    path: 'tenant/:id', 
    component: TenantDashboardComponent, 
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['tenant', 'superadmin'] }
  },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'accept-invitation/:token',
    component: InvitationAcceptComponent
    // No auth guard - this should be accessible to anyone with a valid token
  },
  {
    path: 'user/:id',
    component: UserDetailsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['superadmin'] },
    children: [
      { path: '', redirectTo: 'about', pathMatch: 'full' },
      { path: 'about', component: AboutUserComponent },
      { path: 'subscription-plans', component: UserSubscriptionManagementComponent },
      { path: 'default-fee-settings', component: DefaultFeeSettingsComponent },
      {
        path: 'fee-configuration',
        component: FeeConfigurationComponent,
        children: [
          { path: '', redirectTo: 'send-money', pathMatch: 'full' },
          { path: 'send-money', component: SendMoneyFeeComponent },
          { path: 'subscription', component: SubscriptionPlanFeeComponent },
          { path: 'add-money', component: AddMoneyFeeComponent }
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
