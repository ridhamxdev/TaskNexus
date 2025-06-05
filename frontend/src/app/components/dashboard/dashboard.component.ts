import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { EmailService } from '../../services/email/email.service';
import { isPlatformBrowser } from '@angular/common';
import { TransactionListComponent } from './transaction-list.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionListComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  // Auth
  isLoginTab = true;
  email = '';
  password = '';
  regEmail = '';
  regPassword = '';
  authError = '';
  regError = '';
  regSuccess = '';

  // Email
  recipient = '';
  subject = '';
  body = '';
  emailError = '';
  emailSuccess = '';

  deductionMessage = '';

  regName = '';
  regPhone = '';

  constructor(
    public auth: AuthService,
    private emailService: EmailService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
  }

  get loggedIn() {
    return this.auth.isLoggedIn();
  }

  switchTab(tab: 'login' | 'register') {
    this.isLoginTab = tab === 'login';
    this.authError = '';
    this.regError = '';
    this.regSuccess = '';
  }

  login() {
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', res.access_token);
        }
        this.email = '';
        this.password = '';
        this.authError = '';
        this.deductionMessage = '';
        window.location.reload();
      },
      error: (err) => {
        this.authError = err.error?.message || 'Login failed';
      }
    });
  }

  register() {
    this.auth.register({
      name: this.regName,
      email: this.regEmail,
      password: this.regPassword,
      phone: this.regPhone
    }).subscribe({
      next: () => {
        this.regSuccess = 'Registration successful! You can now log in.';
        this.regError = '';
        this.regName = '';
        this.regEmail = '';
        this.regPassword = '';
        this.regPhone = '';
      },
      error: (err) => {
        this.regError = err.error?.message || 'Registration failed';
      }
    });
  }

  logout() {
    this.auth.logout();
    this.switchTab('login');
    this.deductionMessage = '';
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    window.location.reload();
  }

  sendEmail() {
    this.emailService.sendEmail({ recipient: this.recipient, subject: this.subject, body: this.body }).subscribe({
      next: () => {
        this.emailSuccess = 'Email sent successfully!';
        this.emailError = '';
        this.recipient = '';
        this.subject = '';
        this.body = '';
      },
      error: (err) => {
        this.emailError = err.error?.message || JSON.stringify(err.error) || err.message || 'Failed to send email.';
      }
    });
  }

  runTestDeduction() {
    this.emailService.runTestDeduction().subscribe({
      next: (res) => this.deductionMessage = res.message,
      error: (err) => this.deductionMessage = err.error?.message || 'Failed to run script.'
    });
  }
} 