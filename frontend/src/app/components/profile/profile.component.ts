import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile: any = null;
  error = '';
  success = '';
  
  // Edit mode
  isEditing = false;
  editForm: any = {};
  isUpdating = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.error = '';
    this.success = '';
    this.auth.getProfile().subscribe({
      next: (res) => {
        this.profile = res;
        this.resetEditForm();
      },
      error: (err) => this.error = err.error?.message || 'Failed to load profile'
    });
  }

  // Edit mode methods
  startEditing() {
    this.isEditing = true;
    this.resetEditForm();
    this.error = '';
    this.success = '';
  }

  cancelEditing() {
    this.isEditing = false;
    this.resetEditForm();
    this.error = '';
    this.success = '';
  }

  resetEditForm() {
    if (this.profile) {
      this.editForm = {
        name: this.profile.name || '',
        email: this.profile.email || '',
        phone: this.profile.phone || '',
        address: this.profile.address || '',
        dob: this.profile.dob ? this.profile.dob.split('T')[0] : '', // Format date for input
        password: ''
      };
    }
  }

  updateProfile() {
    this.isUpdating = true;
    this.error = '';
    this.success = '';

    // Prepare update data (only send fields that have changed)
    const updateData: any = {};
    
    if (this.editForm.name !== this.profile.name) {
      updateData.name = this.editForm.name;
    }
    if (this.editForm.email !== this.profile.email) {
      updateData.email = this.editForm.email;
    }
    if (this.editForm.phone !== this.profile.phone) {
      updateData.phone = this.editForm.phone;
    }
    if (this.editForm.address !== this.profile.address) {
      updateData.address = this.editForm.address;
    }
    if (this.editForm.dob !== (this.profile.dob ? this.profile.dob.split('T')[0] : '')) {
      updateData.dob = this.editForm.dob;
    }
    if (this.editForm.password && this.editForm.password.trim()) {
      updateData.password = this.editForm.password;
    }

    console.log('updateData:', updateData);

    // If no changes, just exit edit mode
    if (Object.keys(updateData).length === 0) {
      console.log('No changes detected, canceling edit mode');
      this.cancelEditing();
      return;
    }

    console.log('Sending update request...');
    this.auth.updateProfile(updateData).subscribe({
      next: (response) => {
        console.log('Update successful:', response);
        this.success = response.message || 'Profile updated successfully!';
        this.profile = response.user;
        this.auth.setUser(response.user); // Update user in auth service
        this.isUpdating = false;
        this.isEditing = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Update failed:', err);
        this.error = err.error?.message || 'Failed to update profile';
        this.isUpdating = false;
      }
    });
  }

  validateForm(): boolean {
    console.log('Validating form...');
    
    if (!this.editForm.name || this.editForm.name.trim().length < 2) {
      this.error = 'Name must be at least 2 characters long';
      console.log('Validation failed: Name too short');
      return false;
    }

    if (!this.editForm.email || !this.isValidEmail(this.editForm.email)) {
      this.error = 'Please provide a valid email address';
      console.log('Validation failed: Invalid email');
      return false;
    }

    if (this.editForm.phone && this.editForm.phone.length < 10) {
      this.error = 'Phone number must be at least 10 characters long';
      console.log('Validation failed: Phone too short');
      return false;
    }

    if (this.editForm.password && this.editForm.password.length < 6) {
      this.error = 'Password must be at least 6 characters long';
      console.log('Validation failed: Password too short');
      return false;
    }

    console.log('Form validation passed');
    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
