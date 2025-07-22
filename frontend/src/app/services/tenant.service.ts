import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

interface CreateTenantDto {
  name: string;
  email: string;
  phone?: string;
  age?: number;
  address?: string;
  description?: string;
}

interface SendInvitationDto {
  email: string;
  phone?: string;
  invitationType?: string;
  message?: string;
  metadata?: {
    userRole?: string;
    permissions?: string[];
    welcomeMessage?: string;
    redirectUrl?: string;
  };
}

interface BulkInvitationDto {
  emails: string[];
  invitationType?: string;
  message?: string;
  metadata?: {
    userRole?: string;
    permissions?: string[];
    welcomeMessage?: string;
    redirectUrl?: string;
  };
}

interface AcceptInvitationDto {
  invitationToken: string;
  userName?: string;
  password?: string;
}

interface RejectInvitationDto {
  invitationToken: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TENANTS}`;
  private invitationApiUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TENANT_INVITATIONS}`;

  constructor(private http: HttpClient) {}

  // Tenant Management
  getAllTenants(page: number = 1, limit: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    return this.http.get<any>(this.apiUrl, { params });
  }

  getTenants(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  getMyTenants(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-tenants`);
  }

  getTenantById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getTenantBySubdomain(subdomain: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-subdomain/${subdomain}`);
  }

  createTenant(tenantData: CreateTenantDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, tenantData);
  }

  updateTenant(id: number, updateData: Partial<CreateTenantDto>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, updateData);
  }

  deleteTenant(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  assignTenantAdmin(tenantId: number, userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tenantId}/assign-admin`, { userId });
  }

  activateTenant(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/activate`, {});
  }

  // Tenant Users Management
  getTenantUsers(tenantId: number, page: number = 1, limit: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    return this.http.get<any>(`${this.apiUrl}/${tenantId}/users`, { params });
  }

  addUserToTenant(tenantId: number, userId: number, role: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tenantId}/users/${userId}`, { role });
  }

  removeUserFromTenant(tenantId: number, userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${tenantId}/users/${userId}`);
  }

  updateUserRole(tenantId: number, userId: number, role: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${tenantId}/users/${userId}/role`, { role });
  }

  getTenantStats(tenantId?: number): Observable<any> {
    if (tenantId) {
      return this.http.get<any>(`${this.apiUrl}/${tenantId}/stats`);
    } else {
      // Get overall tenant statistics (for superadmin)
      return this.http.get<any>(`${this.apiUrl}/stats`);
    }
  }

  updateTenantStatus(tenantId: number, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${tenantId}`, { isActive });
  }

  checkUserPermissions(tenantId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${tenantId}/permissions`);
  }

  // Invitation Management
  sendInvitation(tenantId: number, invitationData: SendInvitationDto): Observable<any> {
    return this.http.post<any>(`${this.invitationApiUrl}/tenant/${tenantId}/invite`, invitationData);
  }

  sendBulkInvitations(tenantId: number, invitationData: BulkInvitationDto): Observable<any> {
    return this.http.post<any>(`${this.invitationApiUrl}/tenant/${tenantId}/bulk-invite`, invitationData);
  }

  getTenantInvitations(tenantId: number, page: number = 1, limit: number = 100): Observable<any> {
    return this.http.get<any>(`${this.invitationApiUrl}/tenant/${tenantId}?page=${page}&limit=${limit}`);
  }

  deleteAllInvitationsForTenant(tenantId: number): Observable<any> {
    return this.http.delete<any>(`${this.invitationApiUrl}/tenant/${tenantId}/all`);
  }

  getInvitationByToken(token: string): Observable<any> {
    return this.http.get<any>(`${this.invitationApiUrl}/token/${token}`);
  }

  acceptInvitation(data: any): Observable<any> {
    return this.http.post<any>(`${this.invitationApiUrl}/accept`, data);
  }

  rejectInvitation(data: any): Observable<any> {
    return this.http.post<any>(`${this.invitationApiUrl}/reject`, data);
  }

  cancelInvitation(invitationId: number): Observable<any> {
    return this.http.delete<any>(`${this.invitationApiUrl}/${invitationId}`);
  }

  resendInvitation(invitationId: number, message?: string): Observable<any> {
    return this.http.post<any>(`${this.invitationApiUrl}/resend`, {
      invitationId,
      message
    });
  }

  getInvitationStats(tenantId: number): Observable<any> {
    return this.http.get<any>(`${this.invitationApiUrl}/tenant/${tenantId}/stats`);
  }

  // Utility methods
  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Bulk operations
  clearAllTenants(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/bulk/clear-all`);
  }

  createMultipleTenants(tenants: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk/create`, { tenants });
  }
} 