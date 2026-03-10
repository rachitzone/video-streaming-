import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/users.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(name: string, email: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      name,
      email,
      password: hashed,
      role: 'USER', // 👈 default role
    });

    return this.userRepo.save(user);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 🔑 INCLUDE ROLE IN JWT
    const payload = {
      name: user.name,
      sub: user.id,
      role: user.role, // 👈 THIS UNLOCKS ADMIN FEATURES
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}