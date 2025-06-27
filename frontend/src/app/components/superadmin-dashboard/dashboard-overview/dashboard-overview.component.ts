import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  expiringSoon: number;
  subscriptionsThisMonth: number;
  totalRevenue: number;
}

interface Activity {
  type: 'transaction' | 'email' | 'user' | 'subscription';
  description: string;
  time: Date;
  status: string;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.css']
})
export class DashboardOverviewComponent implements OnInit {
  @Input() stats: any = {
    totalUsers: 0,
    totalTransactions: 0,
    totalEmails: 0,
    satisfactionRate: 0,
    monthlyGrowth: 0,
    newUsersThisMonth: 0
  };

  @Input() subscriptionStats: SubscriptionStats = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    expiredSubscriptions: 0,
    expiringSoon: 0,
    subscriptionsThisMonth: 0,
    totalRevenue: 0
  };

  @Output() quickAction = new EventEmitter<string>();

  currentTime: string = '';
  recentActivities: Activity[] = [
    {
      type: 'transaction',
      description: 'New transaction processed',
      time: new Date(),
      status: 'Completed'
    },
    {
      type: 'email',
      description: 'Bulk email campaign sent',
      time: new Date(Date.now() - 3600000),
      status: 'Sent'
    },
    {
      type: 'user',
      description: 'New user registration',
      time: new Date(Date.now() - 7200000),
      status: 'Active'
    },
    {
      type: 'subscription',
      description: 'Premium plan subscription',
      time: new Date(Date.now() - 10800000),
      status: 'Active'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  // Quick Action Handler
  onQuickAction(action: string) {
    this.quickAction.emit(action);
  }

  // Activity Styling Methods
  getActivityIcon(type: string): string {
    switch (type) {
      case 'transaction': return 'pi-credit-card';
      case 'email': return 'pi-envelope';
      case 'user': return 'pi-user';
      case 'subscription': return 'pi-crown';
      default: return 'pi-info-circle';
    }
  }

  getActivityIconClass(type: string): string {
    switch (type) {
      case 'transaction': return 'bg-green-500/20';
      case 'email': return 'bg-blue-500/20';
      case 'user': return 'bg-purple-500/20';
      case 'subscription': return 'bg-yellow-500/20';
      default: return 'bg-gray-500/20';
    }
  }

  getActivityTextColor(type: string): string {
    switch (type) {
      case 'transaction': return 'text-green-400';
      case 'email': return 'text-blue-400';
      case 'user': return 'text-purple-400';
      case 'subscription': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }
} 