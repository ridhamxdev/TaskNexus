import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  currentTime: string = '';
  
  // Add Money functionality
  showAddMoney: boolean = false;
  addMoneyAmount: number | null = null;
  isAddingMoney: boolean = false;
  addMoneyError: string = '';
  addMoneySuccess: string = '';

  constructor(public auth: AuthService, private router: Router) {
    this.updateTime();
    // Update time every second
    setInterval(() => this.updateTime(), 1000);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private updateTime(): void {
    this.currentTime = new Date().toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Add Money methods
  toggleAddMoney(): void {
    this.showAddMoney = !this.showAddMoney;
    this.resetAddMoneyForm();
  }

  cancelAddMoney(): void {
    this.showAddMoney = false;
    this.resetAddMoneyForm();
  }

  private resetAddMoneyForm(): void {
    this.addMoneyAmount = null;
    this.addMoneyError = '';
    this.addMoneySuccess = '';
    this.isAddingMoney = false;
  }

  addMoney(): void {
    if (!this.addMoneyAmount || this.addMoneyAmount <= 0) {
      this.addMoneyError = 'Please enter a valid amount';
      return;
    }

    if (this.addMoneyAmount > 100000) {
      this.addMoneyError = 'Maximum amount allowed is ₹1,00,000';
      return;
    }

    this.isAddingMoney = true;
    this.addMoneyError = '';
    this.addMoneySuccess = '';

         // Call the auth service to add money
     this.auth.addMoney(this.addMoneyAmount).subscribe({
       next: (response: any) => {
         // Update the user's balance in the auth service
         const currentUser = this.auth.getUser();
         if (currentUser) {
           currentUser.balance = response.newBalance;
           this.auth.setUser(currentUser);
         }
         
         this.addMoneySuccess = `₹${this.addMoneyAmount?.toLocaleString()} added successfully!`;
         this.isAddingMoney = false;
         
         // Auto-close after 3 seconds
         setTimeout(() => {
           this.showAddMoney = false;
           this.resetAddMoneyForm();
         }, 3000);
       },
       error: (error: any) => {
         this.addMoneyError = error.error?.message || 'Failed to add money. Please try again.';
         this.isAddingMoney = false;
       }
     });
  }
} 