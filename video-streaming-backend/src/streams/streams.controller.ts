import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  Param,
} from '@nestjs/common';

import { StreamsService } from './streams.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/stream')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  // 🔐 CREATE STREAM (ADMIN ONLY)
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createStream(@Body() body: { title: string }, @Req() req: any) {
    const user = req.user;

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can create streams');
    }

    return this.streamsService.createStream(user.sub, body.title);
  }

  // 🔐 LIST ADMIN STREAMS
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyStreams(@Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can view own streams');
    }

    return this.streamsService.getStreamsByHost(req.user.sub);
  }

  // 🔐 START STREAM (ADMIN ONLY)
  @UseGuards(JwtAuthGuard)
  @Post('start/:id')
  start(@Req() req: any, @Param('id') id: number) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can start stream');
    }

    return this.streamsService.startStream(id, req.user);
  }

  // 🔐 END STREAM (ADMIN ONLY)
  @UseGuards(JwtAuthGuard)
  @Post('stop/:id')
  stop(@Req() req: any, @Param('id') id: number) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can stop stream');
    }

    return this.streamsService.endStream(id, req.user);
  }

  // 🌍 PUBLIC – LIST LIVE STREAMS
  @Get()
  getLiveStreams() {
    return this.streamsService.getLiveStreams();
  }

  // 🌍 PUBLIC – GET STREAM INFO
  @Get(':id')
  get(@Param('id') id: number) {
    return this.streamsService.getStream(id);
  }
}
