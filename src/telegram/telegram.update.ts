import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Ctx, InjectBot, Start, On, Command, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { InstagramService } from '../instagram/instagram.service';
import { Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Video } from 'src/video/entity/video.entity';
//import { LinkPipe } from './link.pipe';

@Update()
@Injectable()
export class TelegramService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly configService = new ConfigService();
  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private readonly instagramService: InstagramService,
  ) {
    this.bot.use((ctx, next) => {
      this.logger.debug('Context', ctx.message);
      return next();
    });
    this.logger.log('Telegram service initialized');
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const name = (await this.bot.telegram.getMe()).username;
    await ctx.reply(`Hello! I'm ${name}.`);
  }

  @Command('setdescription')
  async onSetDescription(@Ctx() ctx: Context) {
    const description = (ctx.message as any).text.split(' ').slice(1).join(' ');
    if (!description) {
      return 'Please provide a description.';
    }

    this.configService.set('DESCRIPTION', description);
    this.logger.log(`Description updated to: ${description}`);
    await ctx.reply(`Description updated to: ${description}`);
  }

  @On('text')
  async onMessage(@Ctx() ctx: Context) {
    try {
      this.logger.debug(ctx.message);
      const url = (ctx.message as any).text;
      const instagramReelsPattern =
        /^(https?:\/\/)?(www\.)?instagram\.com\/reel\/[\w\-]+\/(\?.*)?$/;
      if (!instagramReelsPattern.test(url)) {
        await ctx.reply('Please provide a valid Instagram Reels URL.');
        return;
      }
      this.logger.debug(url);
      const video: Video = await this.instagramService.fetchVideo(url);
      this.logger.debug(video);
      if (video) {
        await ctx.reply('OK .Video fetched and added to the queue.');
        //await ctx.reply(`Video info: ${JSON.stringify(video)}`);
      } else
        await ctx.reply(
          'Failed to fetch video. Please check the URL and try again.',
        );
    } catch (error) {
      this.logger.error(error);
      await ctx.reply(`Error: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Stopping Telegram bot...');
    if (this.bot) {
      this.bot.stop('SIGINT');
      this.logger.log('Telegram bot stopped');
    }
  }
}
