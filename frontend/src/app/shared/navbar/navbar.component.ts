import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SuperadminService } from '../../services/superadmin.service';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    NotificationBellComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NavbarComponent {
  constructor(
    public auth: AuthService, 
    private router: Router,
    private superadminService: SuperadminService
  ) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  async stopImpersonation() {
    try {
      // First, check if we have the original user stored locally
      const originalUser = this.auth.getOriginalUser();
      
      if (!originalUser) {
        console.warn('No original user found, forcing logout');
        this.auth.logout();
        this.router.navigate(['/login']);
        return;
      }

      // Try to get a fresh admin token from the backend
      try {
        const response = await this.superadminService.stopImpersonation();
        
        // Use auth service to end impersonation with the fresh token
        this.auth.endImpersonation(response.adminToken);
      } catch (backendError) {
        console.warn('Backend call failed, using stored token:', backendError);
        
        // Use the stored original token as fallback
        this.auth.endImpersonation();
      }
      
      // Navigate back to superadmin dashboard
      this.router.navigate(['/superadmin-dashboard'], { replaceUrl: true });
      
    } catch (error) {
      console.error('Error in stopImpersonation:', error);
      
      // Final fallback - try to restore from local storage
      const originalUser = this.auth.getOriginalUser();
      if (originalUser && originalUser.role === 'superadmin') {
        console.log('Attempting emergency session restore...');
        
        // Use auth service fallback mechanism
        this.auth.endImpersonation();
        
        this.router.navigate(['/superadmin-dashboard'], { replaceUrl: true });
      } else {
        // Last resort - force logout
        console.error('Cannot restore admin session, forcing logout');
        this.auth.logout();
        this.router.navigate(['/login']);
      }
    }
  }
}
