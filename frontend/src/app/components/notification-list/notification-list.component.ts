import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { PaginatorModule } from 'primeng/paginator';
import { DropdownModule } from 'primeng/dropdown';
import { NotificationService, UserNotification } from '../../services/notification.service';
import { Subscription } from 'rxjs';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    SkeletonModule,
    DividerModule,
    PaginatorModule,
    DropdownModule
  ],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.css']
})
export class NotificationListComponent implements OnInit, OnDestroy {
  notifications: UserNotification[] = [];
  filteredNotifications: UserNotification[] = [];
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalRecords = 0;
  
  // Filtering
  selectedFilter = 'all';
  filterOptions: FilterOption[] = [
    { label: 'All Notifications', value: 'all' },
    { label: 'Unread Only', value: 'unread' },
    { label: 'Fee Changes', value: 'FEE_CHANGE' },
    { label: 'Fee Added', value: 'FEE_ADDED' },
    { label: 'Fee Removed', value: 'FEE_REMOVED' },
    { label: 'System', value: 'SYSTEM' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    // Subscribe to notifications
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications.filter(n => n.status !== 'DISMISSED');
        this.applyFilter();
      })
    );

    // Load notifications
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

  applyFilter() {
    let filtered = [...this.notifications];

    if (this.selectedFilter === 'unread') {
      filtered = filtered.filter(n => n.status === 'UNREAD');
    } else if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(n => n.type === this.selectedFilter);
    }

    this.filteredNotifications = filtered;
    this.totalRecords = filtered.length;
    this.currentPage = 0; // Reset to first page when filter changes
  }

  onFilterChange() {
    this.applyFilter();
  }

  onPageChange(event: any) {
    this.currentPage = event.page;
  }

  getPaginatedNotifications(): UserNotification[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredNotifications.slice(start, end);
  }

  markAsRead(notification: UserNotification) {
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
    const unreadCount = this.notifications.filter(n => n.status === 'UNREAD').length;
    if (unreadCount === 0) {
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

  getUnreadCount(): number {
    return this.notifications.filter(n => n.status === 'UNREAD').length;
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'FEE_CHANGE':
        return 'Fee Updated';
      case 'FEE_ADDED':
        return 'Fee Added';
      case 'FEE_REMOVED':
        return 'Fee Removed';
      case 'SYSTEM':
        return 'System';
      default:
        return 'Notification';
    }
  }

  trackByNotificationId(index: number, notification: UserNotification): number {
    return notification.id;
  }
} 