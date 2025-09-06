import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UpdateUserDto, UserDto, UserFull, UserSlim } from './types/user.dto';
import { UsersService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
      private readonly userService: UsersService
  ) {}
  
  // DO NOT RETURN PASSWORD

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUsers(): Promise<UserSlim[]> {
    const users = await this.userService.getUsers();
    const slimUsers = [];
    users.forEach((user) => {
        slimUsers.push({ username: user.username })
    });
    return slimUsers;
  }

  @Get(':username')
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('username') username: string): Promise<UserFull> {
    let res = await this.userService.getUserByUsername(username);
    return res;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createUser(
    @Body() user: UserDto
  ): Promise<UserDto> {
    const userEntity = await this.userService.saveUser(user);

    return {
        ...userEntity,
        courses: userEntity.purchased_courses.map(course => course.toString())
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @Param('id') userId: string,
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserFull> {
    console.log("req.user=" + JSON.stringify(req.user));
    console.log("userId="  + userId);
        if(req.user.userId!=userId) {
            throw new ForbiddenException('Can only update own user');
        }
        const updatedUser = await this.userService.updateUser(req.user.userId, updateUserDto);
        return this.userService.getUserByUsername(updatedUser.username);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
  }
}
