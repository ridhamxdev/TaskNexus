import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';

export interface UserNotification {
  id: number;
  userId: number;
  type: 'FEE_CHANGE' | 'FEE_ADDED' | 'FEE_REMOVED' | 'SYSTEM';
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  feeConfigurationVersionId?: number;
  metadata?: any;
  emailSent: boolean;
  emailSentAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${API_CONFIG.BASE_URL}/users`;
  
  // BehaviorSubject to track unread notification count
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  // BehaviorSubject to track all notifications
  private notificationsSubject = new BehaviorSubject<UserNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all notifications for the current user
   */
  getNotifications(): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>(`${this.apiUrl}/notifications`).pipe(
      tap(notifications => {
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      })
    );
  }

  /**
   * Mark a specific notification as read
   */
  markAsRead(notificationId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/notifications/${notificationId}/read`, {}).pipe(
      tap(() => {
        this.refreshNotifications();
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<{ message: string; updatedCount: number }> {
    return this.http.put<{ message: string; updatedCount: number }>(`${this.apiUrl}/notifications/mark-all-read`, {}).pipe(
      tap(() => {
        this.refreshNotifications();
      })
    );
  }

  /**
   * Dismiss a notification
   */
  dismissNotification(notificationId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/notifications/${notificationId}`).pipe(
      tap(() => {
        this.refreshNotifications();
      })
    );
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Refresh notifications from the server
   */
  refreshNotifications(): void {
    this.getNotifications().subscribe();
  }

  /**
   * Update unread count based on notifications array
   */
  private updateUnreadCount(notifications: UserNotification[]): void {
    const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;
    this.unreadCountSubject.next(unreadCount);
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'FEE_CHANGE':
        return 'pi-dollar';
      case 'FEE_ADDED':
        return 'pi-plus-circle';
      case 'FEE_REMOVED':
        return 'pi-minus-circle';
      case 'SYSTEM':
        return 'pi-cog';
      default:
        return 'pi-bell';
    }
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type: string): string {
    switch (type) {
      case 'FEE_CHANGE':
        return 'text-yellow-400';
      case 'FEE_ADDED':
        return 'text-green-400';
      case 'FEE_REMOVED':
        return 'text-red-400';
      case 'SYSTEM':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  }

  /**
   * Format notification time for display
   */
  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }
} 