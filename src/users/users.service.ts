import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

type UserWithoutPassword = Omit<User, 'password' | 'correctPassword'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    initialBalance?: number;
  }): Promise<UserWithoutPassword> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = await this.userModel.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: UserRole.USER,
      balance: data.initialBalance || 0
    } as any); // Using type assertion here since we know the shape is correct

    const { password, correctPassword, ...result } = newUser.get({ plain: true });
    return result as UserWithoutPassword;
  }

  async updateRole(userId: number, newRole: UserRole): Promise<UserWithoutPassword> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await user.update({ role: newRole });
    const { password, correctPassword, ...result } = user.get({ plain: true });
    return result as UserWithoutPassword;
  }
} 