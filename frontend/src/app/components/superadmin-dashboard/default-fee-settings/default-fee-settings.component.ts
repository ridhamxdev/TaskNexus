import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-default-fee-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './default-fee-settings.component.html',
  styleUrls: ['./default-fee-settings.component.css']
})
export class DefaultFeeSettingsComponent implements OnInit {
  userId!: number;
  
  defaultFeeConfig: any = null;
  userDefaultFeeEnabled: boolean = false;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private superadminService: SuperadminService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.userId = +id;
        this.loadDefaultFeeConfiguration();
        this.loadUserDefaultFeeStatus();
      } else {
        this.errorMessage = 'User ID could not be found in the route.';
      }
    });
  }

  async loadDefaultFeeConfiguration() {
    try {
      this.defaultFeeConfig = await this.superadminService.getDefaultFeeConfiguration();
    } catch (error: any) {
      this.errorMessage = 'Failed to load default fee configuration';
      console.error('Error loading default fee config:', error);
    }
  }

  async loadUserDefaultFeeStatus() {
    try {
      const response = await this.superadminService.getUserDefaultFeeStatus(this.userId);
      this.userDefaultFeeEnabled = response.defaultFeeEnabled;
    } catch (error: any) {
      this.errorMessage = 'Failed to load user default fee status';
      console.error('Error loading user fee status:', error);
    }
  }

  async toggleDefaultFee(event: any) {
    const newStatus = event.target.checked;
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      await this.superadminService.toggleUserDefaultFee(this.userId, { defaultFeeEnabled: newStatus });
      this.userDefaultFeeEnabled = newStatus;
      this.successMessage = `Default fee ${newStatus ? 'enabled' : 'disabled'} successfully for this user.`;
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error: any) {
      this.errorMessage = 'Failed to update default fee setting';
      // Revert the toggle
      event.target.checked = !newStatus;
      console.error('Error toggling default fee:', error);
    } finally {
      this.isLoading = false;
    }
  }
} 