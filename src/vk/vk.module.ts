import { Module } from '@nestjs/common';
import { VkService } from './vk.service';
import { ConfigModule } from '@nestjs/config';
import { VkController } from './vk.controller';

@Module({
  imports: [ConfigModule],
  providers: [VkService],
  exports: [VkService],
  controllers: [VkController],
})
export class VkModule {}
