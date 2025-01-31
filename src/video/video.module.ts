import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoService } from './video.service';
import { Video } from './entity/video.entity';
import { VideoController } from './video.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Video])],
  providers: [VideoService],
  exports: [VideoService],
  controllers: [VideoController],
})
export class VideoModule {}
