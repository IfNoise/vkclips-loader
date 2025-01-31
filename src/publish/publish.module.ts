import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublishService } from './publish.service';
import { VkService } from '../vk/vk.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Timezone } from './entity/time-zone.entity';
import { PublishController } from './publish.controller';
import { VideoModule } from 'src/video/video.module';

@Module({
  imports: [ConfigModule, VideoModule, TypeOrmModule.forFeature([Timezone])],
  providers: [PublishService, VkService],
  exports: [PublishService],
  controllers: [PublishController],
})
export class PublishModule {}
