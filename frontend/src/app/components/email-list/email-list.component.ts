import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmailService, SentEmail } from '../../services/email.service';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-email-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule,
    DialogModule,
    TooltipModule
  ],
  templateUrl: './email-list.component.html',
  styleUrls: ['./email-list.component.css']
})
export class EmailListComponent implements OnInit {
  sentEmails: SentEmail[] = [];
  isLoading = false;
  error: string | null = null;
  showEmailDialog = false;
  selectedEmail: SentEmail | null = null;

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.loadSentEmails();
  }

  loadSentEmails() {
    this.isLoading = true;
    this.error = null;

    this.emailService.getSentEmails().subscribe({
      next: (emails) => {
        this.sentEmails = emails;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sent emails:', error);
        this.error = 'Failed to load sent emails. Please try again.';
        this.isLoading = false;
      }
    });
  }

  viewEmailDetails(email: SentEmail) {
    this.selectedEmail = email;
    this.showEmailDialog = true;
  }

  closeEmailDialog() {
    this.showEmailDialog = false;
    this.selectedEmail = null;
  }

  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return 'Sent';
      case 'PENDING':
        return 'Pending';
      case 'FAILED':
        return 'Failed';
      default:
        return status || 'Unknown';
    }
  }

  getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return 'pi pi-check';
      case 'PENDING':
        return 'pi pi-clock';
      case 'FAILED':
        return 'pi pi-times';
      default:
        return 'pi pi-question';
    }
  }
}
