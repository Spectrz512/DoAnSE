import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      return null;
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        role: user.role,
        email: user.email,
      }),
    };
  }
}
