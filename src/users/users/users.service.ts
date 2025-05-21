import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole } from '../entities/user.entity';
// We will need to import the User model and Sequelize-related items later
// import { InjectModel } from '@nestjs/sequelize';
// import { User } from '../models/user.model'; // Adjust path as needed
// import { Op } from 'sequelize';
// For DTOs
import { CreateUserDto } from '../dto/create-user.dto';
// LoginUserDto is no longer used in this service
// import { LoginUserDto } from './dto/login-user.dto'; 
// JwtService is no longer used directly in this service for login/registration
// import { JwtService } from '@nestjs/jwt'; 
import * as bcrypt from 'bcrypt';
import { Op, FindOptions, Transaction as SequelizeTransaction } from 'sequelize';

type UserWithoutPassword = Omit<User, 'password' | 'correctPassword'>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    // private jwtService: JwtService, // Removed: Handled by AuthService
  ) {}

  /**
   * @jsdoc
   * Registers a new user.
   * @param createUserDto Data for creating the user.
   * @returns The created user object (without password hash).
   * @throws ConflictException if email or phone already exists.
   * @throws InternalServerErrorException for other errors.
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
    initialBalance?: number;
  }): Promise<UserWithoutPassword> {
    const existingUser = await this.userModel.findOne({ where: { email: data.email } });
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
    } as any);

    const { password, correctPassword, ...result } = newUser.get({ plain: true });
    return result as UserWithoutPassword;
  }

  // Login method is removed as it's now in AuthService
  /*
  async login(loginUserDto: LoginUserDto): Promise<{ message: string; token: string; user: Partial<User> }> {
    const { email, password } = loginUserDto;

    try {
      const user = await this.userModel.findOne({ where: { email } });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordMatching = await user.correctPassword(password);

      if (!isPasswordMatching) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const payload = { id: user.id, email: user.email, role: user.role };
      const token = this.jwtService.sign(payload);
      
      const { password_hash, ...userResult } = user.get({ plain: true });

      return { message: 'Login successful', token, user: userResult };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Error during user login: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not login user. ' + error.message);
    }
  }
  */

  /**
   * @jsdoc
   * Finds a single user by email or ID.
   * @param emailOrId User's email or ID.
   * @returns The user object or undefined if not found.
   */
  async findOne(emailOrId: string | number): Promise<User | null> {
    if (typeof emailOrId === 'string' && emailOrId.includes('@')) {
      // It's an email
      return this.userModel.findOne({ where: { email: emailOrId } });
    } else if (typeof emailOrId === 'number' || !isNaN(parseInt(emailOrId as string, 10))) {
      // It's an ID (either number or a string that can be parsed to a number)
      return this.userModel.findByPk(typeof emailOrId === 'number' ? emailOrId : parseInt(emailOrId as string, 10));
    }
    return null; // Or throw error if invalid input
  }

  /**
   * @jsdoc
   * Finds a single user by email.
   * @param email User's email.
   * @returns The user object or undefined if not found.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  /**
   * @jsdoc
   * Finds all users matching the given options.
   * @param options Sequelize find options.
   * @returns A list of users.
   */
  async findAll(options?: FindOptions): Promise<User[]> {
    return this.userModel.findAll(options);
  }

  /**
   * @jsdoc
   * Updates the balance for a given user.
   * @param userId The ID of the user to update.
   * @param newBalance The new balance.
   * @param dbTransaction Optional Sequelize transaction.
   */
  async updateBalance(userId: number, newBalance: number, dbTransaction?: SequelizeTransaction): Promise<[number]> {
    return this.userModel.update(
      { balance: newBalance },
      { where: { id: userId }, transaction: dbTransaction },
    );
  }

  /**
   * @jsdoc
   * Retrieves the profile of a user by their ID.
   * @param userId The ID of the user.
   * @returns The user profile (without password hash).
   * @throws NotFoundException if the user is not found.
   */
  async findProfile(userId: number): Promise<Omit<User, 'password' | 'correctPassword'> | null> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.get({ plain: true });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id);
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
