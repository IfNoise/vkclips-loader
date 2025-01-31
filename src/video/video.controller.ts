import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { Video } from './entity/video.entity';
import { VideoUpdateDto } from './dto/video_update.dto';
import { DeleteResult, FindManyOptions } from 'typeorm';
import { Pagination } from 'src/pagination';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

/**
 * Контроллер для управления видео.
 */
@ApiTags('videos')
@Controller('videos')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);
  constructor(private readonly videoService: VideoService) {}

  @Get('scan-archive')
  async scanArchive(): Promise<void> {
    this.videoService.scanArchive();
    return Promise.resolve();
  }

  @Get('delete-archive')
  async deleteArchive(): Promise<void> {
    this.videoService.deleteArcvedVideos();
    return Promise.resolve();
  }

  // @Get()
  // @ApiOperation({ summary: 'Get all videos' })
  // @ApiResponse({ status: 200, description: 'Return all videos.' })
  // @ApiQuery({ name: 'page', required: false, type: Number })
  // @ApiQuery({ name: 'limit', required: false, type: Number })
  // async getAll(
  //   @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number = 0,
  //   @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  // ): Promise<Pagination<Video>> {
  //   return this.videoService.getAllVideos({ page, limit });
  // }

  @ApiOperation({ summary: 'Get video by ID' })
  @ApiResponse({ status: 200, description: 'Return video by ID.' })
  @Get(':id')
  async getOne(@Param('id') id: number): Promise<Video> {
    return this.videoService.getVideoById(id);
  }

  @ApiOperation({ summary: 'Get videos by filter' })
  @ApiResponse({ status: 200, description: 'Return videos by filter.' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get()
  async getByFilter(
    @Query('status') status: string,
    @Query('page') page: number = 0,
    @Query('limit') limit: number = 10,
  ): Promise<Pagination<Video>> {
    this.logger.log(`Filter: ${status}`);
    const options: FindManyOptions<Video> = {
      where: { status },
      skip: page * limit,
      take: limit,
    };
    return this.videoService.findVideo(options);
  }

  @ApiOperation({ summary: 'Update video by ID' })
  @ApiResponse({ status: 200, description: 'Update video by ID.' })
  @Patch(':id')
  async updateOne(
    @Param('id') id: number,
    @Body() updates: VideoUpdateDto,
  ): Promise<Video> {
    return this.videoService.findAndUpdate(id, updates);
  }

  @ApiOperation({ summary: 'Delete video by ID' })
  @ApiResponse({ status: 200, description: 'Delete video by ID.' })
  @Delete(':id')
  async deleteOne(@Param('id') id: number): Promise<DeleteResult> {
    return this.videoService.deleteVideo(id);
  }
}
