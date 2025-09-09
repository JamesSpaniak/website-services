import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UpdateUserDto, UserDto, UserFull, UserSlim } from './types/user.dto';
import { UsersService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from './role.guard';
import { Roles } from './role.decorator';
import { Role } from './types/role.enum';

@Controller('users')
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
  @Roles(Role.Admin)
  async getUsers(): Promise<UserSlim[]> {
    const users = await this.userService.getUsers();
    const slimUsers = [];
    users.forEach((user) => {
        slimUsers.push({ username: user.username })
    });
    return slimUsers;
  }

  /**
   * Retrieves the full public profile for a specific user by username.
   * @param username The username of the user to retrieve.
   * @returns The full user profile.
   */
  @Get(':username')
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('username') username: string): Promise<UserFull> {
    let res = await this.userService.getUserByUsername(username);
    return res;
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
  @Roles(Role.Admin)
  async createUser(
    @Body() user: UserDto
  ): Promise<UserDto> {
    const userEntity = await this.userService.saveUser(user);

    return {
        ...userEntity,
        courses: userEntity.purchased_courses.map(course => course.toString())
    }
  }

  /**
   * Updates the profile of the currently authenticated user.
   * Users can only update their own profile.
   * @param userId The ID of the user to update (from URL parameter, must match authenticated user).
   * @param req The Express request object.
   * @param updateUserDto The data to update.
   * @returns The updated full user profile.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @Param('id', ParseIntPipe) userId: number,
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserFull> {
    if (req.user.userId !== userId) {
      throw new ForbiddenException('You can only update your own profile.');
    }
    const updatedUser = await this.userService.updateUser(req.user.userId, updateUserDto);
    return this.userService.getUserByUsername(updatedUser.username);
  }

  /**
   * Deletes a user by ID.
   * @param id The ID of the user to delete.
   * @requires Admin role.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
  }
}
