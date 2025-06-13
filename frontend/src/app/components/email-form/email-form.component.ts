import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EmailService, EmailResponse } from '../../services/email.service';

@Component({
  selector: 'app-email-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './email-form.component.html',
  styleUrls: ['./email-form.component.css']
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
        // Temporarily removing navigation until status page is implemented
        // this.router.navigate(['/emails/status', response.id]);
      },
      error: (error: any) => {
        this.errorMessage = 'Failed to send email. ' + (error.error?.message || 'Please try again.');
        this.loading = false;
      }
    });
  }
}