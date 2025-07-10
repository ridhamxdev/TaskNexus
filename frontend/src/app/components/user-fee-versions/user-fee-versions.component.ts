import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-fee-versions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-fee-versions.component.html',
  styleUrls: ['./user-fee-versions.component.css']
})
export class UserFeeVersionsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  globalFeeVersion: any = null;
  allVersions: any[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadFeeVersions();
  }

  async loadFeeVersions(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // Load global fee version (primary and only display)
      this.globalFeeVersion = await this.authService.getUserGlobalFeeVersion().toPromise().catch(() => null);
      
      // Load version history if available (for future use)
      this.allVersions = await this.authService.getUserFeeVersions().toPromise().catch(() => []) || [];

    } catch (error) {
      console.error('Error loading fee version:', error);
      this.error = 'Failed to load fee version information. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  getFeeTypeDisplayName(feeType: string): string {
    const typeNames: { [key: string]: string } = {
      send_money: 'Send Money',
      add_money: 'Add Money',
      subscription: 'Subscription',
    };
    return typeNames[feeType] || feeType;
  }
} 