import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EmailService, EmailResponse } from '../../services/email/email.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-email-form',
  templateUrl: './email-form.component.html',
  styleUrls: ['./email-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule
  ]
})
export class EmailFormComponent {
  emailForm: FormGroup;
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  sentEmailId: number | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private emailService: EmailService,
    private router: Router
  ) {
    this.emailForm = this.formBuilder.group({
      recipient: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      body: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.emailForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.emailService.sendEmail(this.emailForm.value).subscribe({
      next: (response: EmailResponse) => {
        this.successMessage = 'Email queued successfully!';
        this.sentEmailId = response.id;
        this.loading = false;
        this.emailForm.reset();
        this.router.navigate(['/emails/status', response.id]);
      },
      error: (error: any) => {
        this.errorMessage = 'Failed to send email. ' + (error.error?.message || 'Please try again.');
        this.loading = false;
      }
    });
  }
}