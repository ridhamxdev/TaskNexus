import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { SuperadminService } from '../../../services/superadmin.service';
import { Subscription as RxjsSubscription } from 'rxjs';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  balance: number;
  role: string;
  createdAt: string;
  status: 'Active' | 'Inactive';
}

interface Notification {
  id: number;
  type: 'transaction' | 'subscription' | 'email' | 'user' | 'login' | 'system' | 'security';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  relatedId?: number;
  userEmail?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() activeTab: string = 'dashboard';
  @Input() userSearchTerm: string = '';

  user: User | null = null;
  balance: number = 0;
  private userSubscription: RxjsSubscription | undefined;

  // Notifications
  notifications: Notification[] = [];
  showNotifications = false;
  unreadNotificationsCount = 0;

  constructor(
    public auth: AuthService,
    private superadminService: SuperadminService
  ) {}

  ngOnInit() {
    this.userSubscription = this.auth.userSubject.subscribe(user => {
      if (user) {
        this.user = user;
        this.balance = user.balance;
      }
    });

    this.setupNotificationPolling();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async loadNotifications() {
    try {
      this.notifications = await this.superadminService.getAllNotifications();
      this.updateUnreadCount();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Set up real-time notification polling
  setupNotificationPolling() {
    // Load notifications immediately
    this.loadNotifications();
    
    // Poll for new notifications every 30 seconds
    setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.updateUnreadCount();
    }
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      notification.isRead = true;
      this.updateUnreadCount();
      // Optional: Call API to mark as read on server
      this.superadminService.markNotificationAsRead(notification.id).catch(console.error);
    }
  }

  markAllAsRead() {
    this.notifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
      }
    });
    this.updateUnreadCount();
    // Optional: Call API to mark all as read on server
    this.superadminService.markAllNotificationsAsRead().catch(console.error);
  }

  viewAllNotifications() {
    // Close dropdown and potentially navigate to a full notifications page
    this.closeNotifications();
    console.log('View all notifications clicked');
  }

  updateUnreadCount() {
    this.unreadNotificationsCount = this.notifications.filter(n => !n.isRead).length;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'transaction': return 'pi pi-credit-card';
      case 'subscription': return 'pi pi-crown';
      case 'email': return 'pi pi-envelope';
      case 'user': return 'pi pi-user-plus';
      case 'login': return 'pi pi-sign-in';
      case 'security': return 'pi pi-shield';
      case 'system': return 'pi pi-cog';
      default: return 'pi pi-bell';
    }
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'transaction': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'subscription': return 'bg-gradient-to-r from-purple-500 to-indigo-600';
      case 'email': return 'bg-gradient-to-r from-blue-500 to-cyan-600';
      case 'user': return 'bg-gradient-to-r from-orange-500 to-red-600';
      case 'login': return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case 'system': return 'bg-gradient-to-r from-purple-500 to-pink-600';
      case 'security': return 'bg-gradient-to-r from-red-500 to-pink-600';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  }

  getNotificationBadgeClass(type: string): string {
    switch (type) {
      case 'transaction': return 'bg-green-100 text-green-800';
      case 'subscription': return 'bg-purple-100 text-purple-800';
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-orange-100 text-orange-800';
      case 'login': return 'bg-indigo-100 text-indigo-800';
      case 'system': return 'bg-purple-100 text-purple-800';
      case 'security': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getNotificationTypeLabel(type: string): string {
    switch (type) {
      case 'transaction': return 'Transaction';
      case 'subscription': return 'Subscription';
      case 'email': return 'Email';
      case 'user': return 'User';
      case 'login': return 'Login';
      case 'system': return 'System';
      case 'security': return 'Security';
      default: return 'Activity';
    }
  }

  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
} 