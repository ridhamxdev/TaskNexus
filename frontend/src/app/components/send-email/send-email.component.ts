import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-send-email',
  templateUrl: './send-email.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SendEmailComponent {
  recipient = '';
  subject = '';
  body = '';
  status = '';
  error = '';

  constructor(private emailService: EmailService) {}

  sendEmail() {
    this.emailService.sendEmail({ recipient: this.recipient, subject: this.subject, body: this.body }).subscribe({
      next: (res) => {
        this.status = 'Email sent! ID: ' + res.id;
        this.error = '';
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to send email';
        this.status = '';
      }
    });
  }
}
