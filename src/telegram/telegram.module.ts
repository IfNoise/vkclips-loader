import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.update';
import { InstagramService } from '../instagram/instagram.service';
import { InstagramModule } from 'src/instagram/instagram.module';
import { VideoModule } from 'src/video/video.module';
import { ConfigModule } from '@nestjs/config';
//import { TelegrafModule } from 'nestjs-telegraf';

@Module({
  imports: [InstagramModule, VideoModule, ConfigModule.forRoot()],
  providers: [TelegramService, InstagramService],
})
export class TelegramModule {}
