import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../entities/user.entity';
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
  async register(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const { name, email, password, phone, address, dob, initialBalance } = createUserDto;

    const existingUser = await this.userModel.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const newUser = await this.userModel.create({
        name,
        email,
        password_hash: hashedPassword,
        phone,
        address,
        dob,
        role: 'user', // Default role
        balance: initialBalance || 0, // Use initialBalance if provided, otherwise default to 0
      } as any);

      const { password_hash, ...result } = newUser.get({ plain: true });
      return result;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(`Error during user registration: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not register user. ' + error.message);
    }
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
  async findProfile(userId: number): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.get({ plain: true });
  }
}
