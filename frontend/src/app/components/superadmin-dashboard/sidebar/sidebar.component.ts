import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() activeTab: string = 'dashboard';
  @Output() tabChange = new EventEmitter<string>();

  constructor(
    public auth: AuthService,
    private router: Router
  ) {}

  setActiveTab(tab: string) {
    this.tabChange.emit(tab);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
} 