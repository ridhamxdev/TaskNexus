import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../../services/email.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-send-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-email.component.html',
  styleUrls: ['./send-email.component.css']
})
export class SendEmailComponent {
  recipient = '';
  subject = '';
  body = '';
  status = '';
  error = '';

  constructor(
    private emailService: EmailService,
    private authService: AuthService,
    private router: Router
  ) {}



  sendEmail() {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.error = 'Please log in to send emails';
      this.status = '';
      return;
    }

    if (!this.recipient || !this.subject || !this.body) {
      this.error = 'Please fill in all fields';
      this.status = '';
      return;
    }

    this.error = '';
    this.status = '';

    this.emailService.sendEmail({ 
      recipient: this.recipient, 
      subject: this.subject, 
      body: this.body 
    }).subscribe({
      next: (res) => {
        this.status = 'Email sent successfully!';
        this.error = '';
        // Clear form after successful send
        this.recipient = '';
        this.subject = '';
        this.body = '';
      },
      error: (err) => {
        this.error = err.error?.message || err.message || 'Failed to send email';
        this.status = '';
      }
    });
  }
} 