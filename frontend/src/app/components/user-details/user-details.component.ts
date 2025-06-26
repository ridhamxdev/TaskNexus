import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SuperadminService } from '../../services/superadmin.service';
import { AboutUserComponent } from './about-user.component';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, RouterModule, AboutUserComponent],
  template: `
    <div class="text-white min-h-screen flex">
      <!-- Sidebar -->
      <div class="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-10">
        <div class="p-6 border-b border-gray-700">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
              {{ user?.name.charAt(0) }}
            </div>
            <div>
              <h1 class="text-lg font-semibold truncate">{{ user?.name }}</h1>
              <p class="text-xs text-gray-400">User Profile</p>
            </div>
          </div>
        </div>
        <!-- Navigation Menu -->
        <nav class="mt-6">
          <ul class="space-y-1 px-4">
            <li>
              <a
                routerLink="./about"
                routerLinkActive="bg-purple-600 text-white"
                [routerLinkActiveOptions]="{ exact: true }"
                class="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-gray-300 hover:bg-gray-700"
              >
                <i class="pi pi-user mr-3"></i>
                About
              </a>
            </li>
            <li>
              <a
                routerLink="./fee-configuration"
                routerLinkActive="bg-purple-600 text-white"
                class="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-gray-300 hover:bg-gray-700"
              >
                <i class="pi pi-cog mr-3"></i>
                Fee Configuration
              </a>
            </li>
          </ul>
        </nav>
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
           <button (click)="goBack()" class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
            <i class="pi pi-arrow-left mr-2"></i>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="ml-64 flex-1 p-6 md:p-8">
        <div *ngIf="error" class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <p class="text-red-400">{{ error }}</p>
        </div>
        <div *ngIf="!user && !error" class="text-center p-8">
          <i class="pi pi-spin pi-spinner text-4xl"></i>
          <p class="mt-2">Loading user data...</p>
        </div>
        <div *ngIf="user">
          <app-about-user [user]="user" *ngIf="isAboutPage()"></app-about-user>
          <router-outlet *ngIf="!isAboutPage()"></router-outlet>
        </div>
      </div>
    </div>
  `,
})
export class UserDetailsComponent implements OnInit {
  user: any;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private superadminService: SuperadminService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.superadminService.getUserById(userId).subscribe({
        next: (userData) => {
          this.user = userData;
        },
        error: (err) => {
          this.error = 'Failed to load user data.';
          console.error(err);
        },
      });
    }
  }

  isAboutPage(): boolean {
    return this.router.url.endsWith('/about');
  }

  goBack(): void {
    this.router.navigate(['/superadmin-dashboard']);
  }
} 