import { Request } from 'express';
import { UserRole } from '../../users/entities/user.entity'; // Adjust path

export interface AuthenticatedRequest extends Request {
  user: {
    id: number; // or string, depending on your user ID type
    email: string;
    role: UserRole; // Using the UserRole enum for strong typing
    // Add other properties from your JWT payload if needed (e.g., name)
  };
}