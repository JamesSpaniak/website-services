import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserDto, UserSlim } from './types/user.dto';
import { UsersService } from './user.service';

@Controller('users')
export class UsersController {
  constructor(
      private readonly userService: UsersService
  ) {}
  
  // DO NOT RETURN PASSWORD

  @Get()
  async getUsers(): Promise<UserSlim[]> {
    const users = await this.userService.getUsers();
    const slimUsers = [];
    users.forEach((user) => {
        slimUsers.push({ username: user.username })
    });
    return slimUsers;
  }

  @Get(':username')
  async getUser(@Param('username') username: string): Promise<UserDto> {
    let res = await this.userService.getUserByUsername(username);
    return res;
  }

  @Post()
  async createUser(
    @Body() user: UserDto
  ): Promise<UserDto> {
    return this.userService.saveUser(user)
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
  }
}
