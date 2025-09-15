import { Body, ClassSerializerInterceptor, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { UpdateUserDto, UserDto, UserFull, UserSlim } from './types/user.dto';
import { UsersService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from './role.guard';
import { Roles } from './role.decorator';
import { Role } from './types/role.enum';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

@ApiTags('Users') // Groups all endpoints from this controller under "Users" in the Swagger UI
@ApiBearerAuth() // Indicates that all endpoints in this controller may require authentication
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
      private readonly userService: UsersService
  ) {}
  
  // DO NOT RETURN PASSWORD
  
  /**
   * Retrieves a slim list of all users.
   * @returns A list of users with minimal information.
   * @requires Admin role.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a list of all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'A list of slim user profiles.', type: [UserSlim] })
  @Roles(Role.Admin)
  async getUsers(): Promise<UserSlim[]> {
    const users = await this.userService.getUsers();
    return plainToInstance(UserSlim, users);
  }

  /**
   * Retrieves the full public profile for a specific user by username.
   * @param username The username of the user to retrieve.
   * @returns The full user profile.
   */
  @Get(':username')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a user profile by username' })
  @ApiParam({ name: 'username', description: 'The username of the user to retrieve.', type: String })
  @ApiResponse({ status: 200, description: 'The full public user profile.', type: UserFull })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUser(@Param('username') username: string): Promise<UserFull> {
    const user = await this.userService.getUserByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found.`);
    }
    return plainToInstance(UserFull, user);
  }
  
  /**
   * Creates a new user.
   * Note: This endpoint is currently configured to only allow Admins to create users.
   * For public registration, this guard should be removed.
   * @param user The user data for creation.
   * @returns The created user DTO.
   * @requires Admin role.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.', type: UserFull })
  @Roles(Role.Admin)
  async createUser(
    @Body() user: UserDto
  ): Promise<UserFull> {
    const userEntity = await this.userService.saveUser(user);
    const fullUser = await this.userService.getUserByUsername(userEntity.username);
    return plainToInstance(UserFull, fullUser);
  }

  /**
   * Updates the profile of the currently authenticated user.
   * Users can only update their own profile.
   * @param userId The ID of the user to update (from URL parameter, must match authenticated user).
   * @param req The Express request object.
   * @param updateUserDto The data to update.
   * @returns The updated full user profile.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update the current user\'s profile' })
  @ApiResponse({ status: 200, description: 'The user profile has been successfully updated.', type: UserFull })
  @ApiResponse({ status: 403, description: 'Forbidden. You can only update your own profile.' })
  async updateCurrentUser(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserFull> {
    const updatedUser = await this.userService.updateUser(req.user.userId, updateUserDto);
    const fullUser = await this.userService.getUserByUsername(updatedUser.username);
    return plainToInstance(UserFull, fullUser);
  }

  /**
   * Deletes a user by ID.
   * @param id The ID of the user to delete.
   * @requires Admin role.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deleted.' })
  @Roles(Role.Admin)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.userService.deleteUser(id);
  }
}
