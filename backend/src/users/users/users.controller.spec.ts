import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/sequelize';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from '../../dto/create-user.dto';
import { ConflictException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    phone: '1234567890',
    role: 'user',
    get: () => ({
      plain: true,
    }),
  };

  const mockUsersService = {
    register: jest.fn(),
    findOneByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getModelToken(User),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890',
      address: 'Test Address',
      dob: '1990-01-01',
    };

    it('should register a new user successfully', async () => {
      const expectedResponse = {
        message: 'User registered successfully',
        user: mockUser,
      };

      mockUsersService.register.mockResolvedValue(mockUser);

      const result = await controller.registerUser(createUserDto);

      expect(result).toEqual(expectedResponse);
      expect(mockUsersService.register).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUsersService.register.mockRejectedValue(
        new ConflictException('Email already exists'),
      );

      await expect(controller.registerUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.register).toHaveBeenCalledWith(createUserDto);
    });
  });
}); 