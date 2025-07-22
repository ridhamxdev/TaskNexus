# Bulk Tenant Management Guide

## Overview

The bulk tenant management feature allows superadmins to efficiently manage tenants in bulk operations:
- **Clear All Tenants**: Remove all existing tenants and their data
- **Bulk Create Tenants**: Create multiple tenants at once using form input or CSV format

## Features Implemented

### Backend (NestJS)

1. **New API Endpoints**:
   - `DELETE /tenants/bulk/clear-all` - Clear all tenants
   - `POST /tenants/bulk/create` - Create multiple tenants

2. **Service Methods**:
   - `TenantsService.clearAllTenants()` - Safely removes all tenants
   - `TenantsService.createMultipleTenants()` - Creates multiple tenants with error handling
   - Corresponding methods in `SuperadminService`

3. **Safety Features**:
   - Only accessible by SuperAdmin users
   - Soft deletes with proper cleanup
   - Database connection management
   - Individual error handling for each tenant

### Frontend (Angular)

1. **New Component**: `BulkTenantManagementComponent`
   - Modal interface with tabbed design
   - Form-based and text-based input modes
   - Real-time validation and error handling

2. **Integration**:
   - Added to superadmin dashboard
   - Accessible via "Bulk Management" buttons
   - Automatic data refresh after operations

## How to Use

### Accessing Bulk Management

1. Log in as a superadmin user
2. Navigate to the superadmin dashboard
3. Go to the "Tenants" tab
4. Click the "Bulk Management" button (orange button in the header or Quick Actions section)

### Clear All Tenants

⚠️ **WARNING**: This action permanently deletes ALL tenants and their data!

1. In the bulk management modal, stay on the "Clear All Tenants" tab
2. Click "Clear All Tenants" button
3. Type "DELETE ALL TENANTS" in the confirmation field
4. Click "Confirm Delete All"
5. Wait for the operation to complete

**What gets deleted**:
- All tenant records
- All tenant-specific databases
- All user-tenant associations
- All tenant-related data

### Bulk Create Tenants

#### Method 1: Form Input
1. Switch to the "Bulk Create Tenants" tab
2. Select "Form Input" mode
3. Fill in tenant information:
   - **Name** (required): Company/Organization name
   - **Email** (required): Contact email
   - **Phone** (optional): Contact phone number
   - **Age** (optional): Organization age in years
   - **Address** (optional): Physical address
   - **Description** (optional): Brief description
4. Click "Add Row" to add more tenants
5. Click "Create Tenants" to submit

#### Method 2: Text Input (CSV)
1. Switch to the "Bulk Create Tenants" tab
2. Select "Text Input" mode
3. Enter tenant data in CSV format (one per line):
   ```
   Company Name, Email, Phone, Age, Address, Description
   ```
4. Example:
   ```
   Acme Corp, contact@acme.com, +1234567890, 10, 123 Main St, Software company
   Tech Solutions, info@techsol.com, +0987654321, 5, 456 Oak Ave, IT services
   Global Industries, hello@global.com, +1122334455, 15, 789 Pine Rd, Manufacturing
   ```
5. Click "Create Tenants" to submit

## Sample Test Data

Here's sample data you can use to test the bulk create functionality:

### CSV Format (copy and paste):
```
Acme Corporation, contact@acme.com, +1-555-0101, 15, 123 Business Plaza, Leading software solutions
TechStart Inc, info@techstart.com, +1-555-0102, 3, 456 Innovation Drive, Startup accelerator
Global Manufacturing, admin@globalmfg.com, +1-555-0103, 25, 789 Industrial Blvd, Manufacturing excellence
Digital Dynamics, hello@digitaldyn.com, +1-555-0104, 8, 321 Tech Center, Digital transformation
Creative Studios, studio@creative.com, +1-555-0105, 12, 654 Art District, Creative design services
```

### Form Data Example:
1. **Acme Corporation**
   - Email: contact@acme.com
   - Phone: +1-555-0101
   - Age: 15
   - Address: 123 Business Plaza
   - Description: Leading software solutions

2. **TechStart Inc**
   - Email: info@techstart.com
   - Phone: +1-555-0102
   - Age: 3
   - Address: 456 Innovation Drive
   - Description: Startup accelerator

## API Testing with cURL

### Clear All Tenants
```bash
curl -X DELETE http://localhost:3000/tenants/bulk/clear-all \
  -H "Authorization: Bearer YOUR_SUPERADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Bulk Create Tenants
```bash
curl -X POST http://localhost:3000/tenants/bulk/create \
  -H "Authorization: Bearer YOUR_SUPERADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenants": [
      {
        "name": "Test Company 1",
        "email": "test1@company.com",
        "phone": "+1234567890",
        "age": 5,
        "address": "123 Test St",
        "description": "Test company 1"
      },
      {
        "name": "Test Company 2",
        "email": "test2@company.com",
        "phone": "+0987654321",
        "age": 10,
        "address": "456 Test Ave",
        "description": "Test company 2"
      }
    ]
  }'
```

## Error Handling

The system includes comprehensive error handling:

### Frontend
- Form validation for required fields
- Real-time error messages
- Loading states during operations
- Success/failure notifications

### Backend
- Individual tenant validation
- Graceful error handling for failed operations
- Detailed error messages
- Transaction rollback on critical failures

## Security Considerations

1. **Role-based Access**: Only superadmin users can access bulk operations
2. **Confirmation Required**: Clear all operation requires explicit confirmation
3. **Audit Logging**: All operations are logged for security tracking
4. **Rate Limiting**: Bulk create limited to 50 tenants per operation

## Database Impact

### Clear All Operation
- Performs soft deletes (records marked as deleted, not physically removed)
- Closes all tenant database connections
- Updates tenant status to inactive before deletion

### Bulk Create Operation
- Creates tenant databases for each new tenant
- Generates unique tenant keys and subdomains
- Validates uniqueness of names and emails

## Troubleshooting

### Common Issues

1. **"Access denied" errors**: Ensure you're logged in as a superadmin
2. **Database creation failures**: Check MySQL permissions and connectivity
3. **Validation errors**: Ensure all required fields (name, email) are provided
4. **Duplicate tenant names**: Each tenant name must be unique

### Logs Location
- Backend logs: Console output when running `npm run start:dev`
- Check browser console for frontend errors

## Testing Workflow

1. **Preparation**:
   - Start backend: `cd backend && npm run start:dev`
   - Start frontend: `cd frontend && npm start`
   - Log in as superadmin user

2. **Test Bulk Create**:
   - Use the sample data provided above
   - Try both form input and CSV methods
   - Verify tenants appear in the tenant list

3. **Test Clear All**:
   - Navigate to bulk management modal
   - Follow the confirmation process
   - Verify all tenants are removed

4. **Verify Data Integrity**:
   - Check database for proper soft deletes
   - Ensure user-tenant associations are cleaned up
   - Verify tenant databases are properly managed

## Best Practices

1. **Backup Before Clear**: Always backup your database before using clear all
2. **Test Data First**: Use test data before running on production
3. **Monitor Logs**: Check both frontend and backend logs during operations
4. **Verify Results**: Always verify operations completed successfully
5. **User Communication**: Inform users before performing bulk operations

This bulk tenant management system provides powerful tools for efficiently managing multi-tenant applications while maintaining data integrity and security. 