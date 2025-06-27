import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SuperadminService } from '../../../services/superadmin.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
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



  goBack(): void {
    this.router.navigate(['/superadmin-dashboard']);
  }
} 