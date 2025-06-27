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
  error: string | null = null;

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
          },
          error: (err) => {
            this.error = 'Failed to load user data.';
            console.error(err);
          },
        });
      }
    } else {
      this.setActiveSubscription();
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
} 