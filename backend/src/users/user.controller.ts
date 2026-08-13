import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UpdateUserDto, UserDto, UserFull, UserSlim } from './types/user.dto';
import {
  AdminUserRow,
  CreateSignupLinkDto,
  GrantCourseDto,
  SignupLinkInfo,
  SignupLinkRow,
} from './types/admin-users.dto';
import { UsersService } from './user.service';
import { SignupLinkService } from './signup-link.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from './role.guard';
import { Roles } from './role.decorator';
import { Role } from './types/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

@ApiTags('Users') // Groups all endpoints from this controller under "Users" in the Swagger UI
@ApiBearerAuth() // Indicates that all endpoints in this controller may require authentication
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly signupLinkService: SignupLinkService,
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
  @ApiResponse({
    status: 200,
    description: 'A list of slim user profiles.',
    type: [UserSlim],
  })
  @Roles(Role.Admin)
  async getUsers(): Promise<UserSlim[]> {
    const users = await this.userService.getUsers();
    return plainToInstance(UserSlim, users, { excludeExtraneousValues: true });
  }

  // NOTE: literal routes below must stay above `@Get(':username')`, otherwise
  // Nest matches them as usernames.

  /**
   * Full user list for the admin dashboard: role, verification status, org
   * membership, and per-course access with provenance (purchase/gift/promo).
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Get the detailed user list for the admin dashboard (Admin only)',
  })
  async getUsersAdmin(): Promise<AdminUserRow[]> {
    return this.userService.getUsersAdmin();
  }

  @Get('admin/signup-links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List all signup/promo links (Admin only)' })
  async listSignupLinks(): Promise<SignupLinkRow[]> {
    return this.signupLinkService.list();
  }

  @Post('admin/signup-links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({
    summary:
      'Create a one-time signup link granting course access (Admin only)',
  })
  async createSignupLink(
    @Request() req,
    @Body() dto: CreateSignupLinkDto,
  ): Promise<SignupLinkRow> {
    return this.signupLinkService.create(req.user.userId, dto);
  }

  @Delete('admin/signup-links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Delete an unused signup link (Admin only)' })
  async deleteSignupLink(@Param('id', ParseIntPipe) id: number) {
    await this.signupLinkService.delete(id);
    return { message: 'Signup link deleted.' };
  }

  /**
   * Public lookup used by the register page to describe a `?signup=` link.
   * Returns { valid: false, reason } instead of throwing for bad codes.
   */
  @Get('signup-link-info')
  @ApiOperation({ summary: 'Describe a signup link code (public)' })
  async getSignupLinkInfo(
    @Query('code') code: string,
  ): Promise<SignupLinkInfo> {
    if (!code) return { valid: false, reason: 'not_found' };
    return this.signupLinkService.getInfo(code);
  }

  /** Gift a course to a user; recorded as an admin grant, not a purchase. */
  @Post(':id/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Grant a user access to a course (Admin only)' })
  async grantCourse(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GrantCourseDto,
  ) {
    await this.userService.grantCourseAccess(
      req.user.userId,
      id,
      dto.course_id,
    );
    return { message: 'Course access granted.' };
  }

  @Delete(':id/courses/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiOperation({ summary: "Revoke a user's course access (Admin only)" })
  async revokeCourse(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    await this.userService.revokeCourseAccess(req.user.userId, id, courseId);
    return { message: 'Course access revoked.' };
  }

  /**
   * Retrieves the full public profile for a specific user by username.
   * @param username The username of the user to retrieve.
   * @returns The full user profile.
   */
  @Get(':username')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a user profile by username' })
  @ApiParam({
    name: 'username',
    description: 'The username of the user to retrieve.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The full public user profile.',
    type: UserFull,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUser(@Param('username') username: string): Promise<UserFull> {
    const user = await this.userService.getUserByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found.`);
    }
    return plainToInstance(UserFull, user, { excludeExtraneousValues: true });
  }

  /**
   * Creates a new user.
   * @param user The user data for creation.
   * @returns The created user DTO.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
    type: UserFull,
  })
  @Roles(Role.Admin)
  async createUser(@Body() user: UserDto): Promise<UserFull> {
    const userEntity = await this.userService.saveUser(user);
    const fullUser = await this.userService.getUserByUsername(
      userEntity.username,
    );
    return plainToInstance(UserFull, fullUser, {
      excludeExtraneousValues: true,
    });
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
  @ApiOperation({ summary: "Update the current user's profile" })
  @ApiResponse({
    status: 200,
    description: 'The user profile has been successfully updated.',
    type: UserFull,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. You can only update your own profile.',
  })
  async updateCurrentUser(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserFull> {
    const updatedUser = await this.userService.updateUser(
      req.user.userId,
      updateUserDto,
    );
    const fullUser = await this.userService.getUserByUsername(
      updatedUser.username,
    );
    return plainToInstance(UserFull, fullUser, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Deletes a user by ID. Refuses self-deletion and admin accounts, and
   * cleans up rows without FK cascades (exam_attempts).
   * @param id The ID of the user to delete.
   * @requires Admin role.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
  })
  @Roles(Role.Admin)
  async deleteUser(@Request() req, @Param('id', ParseIntPipe) id: number) {
    await this.userService.deleteUserAsAdmin(id, req.user.userId);
    return { message: 'User deleted.' };
  }
}
