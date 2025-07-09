import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SuperadminService } from '../../../services/superadmin.service';

@Component({
  selector: 'app-about-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-user-component.component.html',
})
export class AboutUserComponent implements OnInit {
  @Input() user: any;
  activeSubscription: any;
  feeVersions: any[] = [];
  currentSendMoneyVersion: any = null;
  currentAddMoneyVersion: any = null;
  currentSubscriptionVersion: any = null;
  error: string | null = null;
  loadingVersions: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private superadminService: SuperadminService
  ) {}

  ngOnInit(): void {
    // If user is not provided via @Input, get it from the parent route
    if (!this.user) {
      const userId = this.route.parent?.snapshot.paramMap.get('id');
      if (userId) {
        this.superadminService.getUserById(userId).subscribe({
          next: (userData) => {
            this.user = userData;
            this.setActiveSubscription();
            this.loadFeeVersions();
          },
          error: (err) => {
            this.error = 'Failed to load user data.';
            console.error(err);
          },
        });
      }
    } else {
      this.setActiveSubscription();
      this.loadFeeVersions();
    }
  }

  private setActiveSubscription(): void {
    if (this.user && this.user.subscriptions) {
      this.activeSubscription = this.user.subscriptions.find((s: any) => s.status === 'active');
    }
  }

  getSubscriptionStatusBadge(status: string): string {
    const statusClasses: { [key: string]: string } = {
      active: 'bg-green-500/30 text-green-300',
      cancelled: 'bg-red-500/30 text-red-300',
      expired: 'bg-yellow-500/30 text-yellow-300',
    };
    return statusClasses[status] || 'bg-gray-500/30 text-gray-300';
  }

  private async loadFeeVersions(): Promise<void> {
    if (!this.user?.id) return;

    this.loadingVersions = true;
    try {
      // Load all fee versions for the user
      this.feeVersions = await this.superadminService.getAllFeeVersionsForUser(this.user.id);

      // Load current versions for each fee type
      [this.currentSendMoneyVersion, this.currentAddMoneyVersion, this.currentSubscriptionVersion] = await Promise.all([
        this.superadminService.getCurrentFeeVersion(this.user.id, 'send_money').catch(() => null),
        this.superadminService.getCurrentFeeVersion(this.user.id, 'add_money').catch(() => null),
        this.superadminService.getCurrentFeeVersion(this.user.id, 'subscription').catch(() => null)
      ]);
    } catch (error) {
      console.error('Error loading fee versions:', error);
    } finally {
      this.loadingVersions = false;
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

  getVersionBadgeClass(version: string): string {
    const versionParts = version.split('.');
    const majorVersion = parseInt(versionParts[0] || '1');
    
    if (majorVersion >= 2) {
      return 'bg-red-500/20 text-red-300';
    } else if (versionParts[1] && parseInt(versionParts[1]) > 0) {
      return 'bg-yellow-500/20 text-yellow-300';
    } else {
      return 'bg-green-500/20 text-green-300';
    }
  }
} 