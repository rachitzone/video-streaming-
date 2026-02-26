import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { StreamsService } from './streams.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/stream')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  /* ======================
     CREATE STREAM (ADMIN)
  ====================== */
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createStream(
    @Body() body: { title: string },
    @Req() req: any,
  ) {
    const user = req.user;

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only admin can create streams',
      );
    }

    return this.streamsService.createStream(
      user.sub,
      body.title,
    );
  }

  /* ======================
     ADMIN STREAM LIST
  ====================== */
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyStreams(@Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only admin can view own streams',
      );
    }

    return this.streamsService.getStreamsByHost(
      req.user.sub,
    );
  }

  /* ======================
     START STREAM
  ====================== */
  @UseGuards(JwtAuthGuard)
  @Post('start/:id')
  start(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only admin can start stream',
      );
    }

    return this.streamsService.startStream(
      id,
      req.user,
    );
  }

  /* ======================
     STOP STREAM
  ====================== */
  @UseGuards(JwtAuthGuard)
  @Post('stop/:id')
  stop(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only admin can stop stream',
      );
    }

    return this.streamsService.endStream(
      id,
      req.user,
    );
  }

  /* ======================
     PUBLIC – LIVE STREAMS
  ====================== */
  @Get()
  getLiveStreams() {
    return this.streamsService.getLiveStreams();
  }

  /* ======================
     PUBLIC – STREAM BY ID
  ====================== */
  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.streamsService.getStream(id);
  }
}