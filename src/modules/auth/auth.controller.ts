import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("login") async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto);
    if (!result)
      throw new UnauthorizedException("Email or password is incorrect");
    return result;
  }
}
