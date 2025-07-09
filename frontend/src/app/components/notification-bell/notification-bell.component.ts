import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ScrollerModule } from 'primeng/scroller';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationService, UserNotification } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    BadgeModule,
    OverlayPanelModule,
    ScrollerModule,
    DividerModule,
    TooltipModule
  ],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: UserNotification[] = [];
  unreadCount = 0;
  loading = false;
  error: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    // Subscribe to notifications and unread count
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
      }),
      
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );

    // Load notifications on init
    this.loadNotifications();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadNotifications() {
    this.loading = true;
    this.error = null;

    this.notificationService.getNotifications().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.error = 'Failed to load notifications';
        this.loading = false;
      }
    });
  }

  markAsRead(notification: UserNotification, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    if (notification.status === 'READ') {
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        console.log('Notification marked as read');
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  markAllAsRead() {
    if (this.unreadCount === 0) {
      return;
    }

    this.notificationService.markAllAsRead().subscribe({
      next: (response) => {
        console.log(`Marked ${response.updatedCount} notifications as read`);
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  dismissNotification(notification: UserNotification, event: Event) {
    event.stopPropagation();

    this.notificationService.dismissNotification(notification.id).subscribe({
      next: () => {
        console.log('Notification dismissed');
      },
      error: (error) => {
        console.error('Error dismissing notification:', error);
      }
    });
  }

  refreshNotifications() {
    this.loadNotifications();
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getNotificationColor(type: string): string {
    return this.notificationService.getNotificationColor(type);
  }

  formatTime(dateString: string): string {
    return this.notificationService.formatNotificationTime(dateString);
  }

  getVisibleNotifications(): UserNotification[] {
    return this.notifications.filter(n => n.status !== 'DISMISSED').slice(0, 10);
  }

  hasMoreNotifications(): boolean {
    const visible = this.notifications.filter(n => n.status !== 'DISMISSED');
    return visible.length > 10;
  }

  trackByNotificationId(index: number, notification: UserNotification): number {
    return notification.id;
  }

  getMoreNotificationsCount(): number {
    const visible = this.notifications.filter(n => n.status !== 'DISMISSED');
    return Math.max(0, visible.length - 10);
  }
} 