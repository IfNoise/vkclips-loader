import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VkService } from '../vk/vk.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Timezone } from './entity/time-zone.entity';
import { UpdateTimezoneDto } from './dto/updatetimezone.dto';
import { CreateTimezoneDto } from './dto/createtimezone.dto';
import { VideoService } from 'src/video/video.service';
import { Video } from 'src/video/entity/video.entity';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);
  private readonly uploadDir: string;
  private readonly maxVideosPerDay: number;

  constructor(
    private configService: ConfigService,
    private vkService: VkService,
    private readonly videoService: VideoService,
    @InjectRepository(Timezone)
    private readonly timezoneRepository: Repository<Timezone>,
  ) {
    this.uploadDir = this.configService.get<string>(
      'UPLOAD_DIR',
      '/home/noise83/Загрузки/upload',
    );
    this.maxVideosPerDay = this.configService.get<number>(
      'MAX_VIDEOS_PER_DAY',
      5,
    );
  }

  // @Cron('30 4 * * *')
  // async handleCron() {
  //   this.logger.debug('Called when the current time is 4:30');
  //   try {
  //     await this.publishVideos();
  //   } catch (error) {
  //     this.logger.error('Failed to publish videos', error.stack);
  //   }
  // }

  async getVideos(videosNumber: number): Promise<Video[]> {
    try {
      this.logger.log('Reading video db');
      const { results: videos } = await this.videoService.findVideo({
        where: { status: 'pending' },
        skip: 0,
        take: videosNumber,
      });
      if (videos.length < this.maxVideosPerDay) {
        this.logger.log('Need more videos for publishing');
        const needMore = this.maxVideosPerDay - videos.length;
        const twoMonthsAgo =
          new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).getDate() / 1000;
        this.logger.log('Need more videos for publishing');
        const { results: additional, total } =
          await this.videoService.findVideo({
            where: {
              status: 'archived',
              publishDate: MoreThan(twoMonthsAgo),
            },
            skip: 0,
            take: needMore,
          });
        if (total < needMore) {
          this.logger.error('Houston,we have a problem');
          throw new Error('Need more videos for publishing');
        }
        videos.push(...additional);
      }
      this.logger.log(`Found ${videos.length} videos for publishing`);
      const ratedVideos = videos.sort((a, b) => {
        if (
          a.views === 0 &&
          b.views === 0 &&
          a.likes === 0 &&
          b.likes === 0 &&
          a.comments === 0 &&
          b.comments === 0
        ) {
          return b.rating - a.rating;
        } else {
          return (
            (b.likes + b.comments) / b.views - (a.likes + a.comments) / a.views
          );
        }
      });
      return ratedVideos;
    } catch (error) {
      this.logger.error('Failed to read upload directory', error.stack);
      throw new Error('No candidates for uploading');
    }
  }

  async createSchedule(): Promise<number[]> {
    const timezones = await this.timezoneRepository.find();
    const sortedTimezones = timezones.sort((a, b) => a.startHour - b.startHour);
    const minIntervalMinutes = Math.min(
      ...timezones.map((tz) => Math.floor(60 / tz.count)),
    );
    const minIntervalMs = minIntervalMinutes * 60 * 1000;
    const now = new Date();
    const nowMs = now.getTime();
    const endMs = nowMs + 24 * 60 * 60 * 1000; // 24 часа от текущего момента

    const timestamps: number[] = [];
    // Округляем значение миллисекунд до ближайшего минимального интервала
    const roundedNowMs =
      (Math.floor(nowMs / minIntervalMs) + 1) * minIntervalMs;

    for (let ms = roundedNowMs; ms < endMs; ) {
      const currentDate = new Date(ms);
      const currentHour = currentDate.getHours();

      // Находим зону, подходящую под текущий час/сутки
      const timezone = sortedTimezones.find((tz) => {
        // Если зона не переходит через полночь
        if (tz.startHour <= tz.endHour) {
          return currentHour >= tz.startHour && currentHour <= tz.endHour;
        }
        // Если зона перекрывает полночь (например: startHour=22, endHour=5)
        return currentHour >= tz.startHour || currentHour <= tz.endHour;
      });

      if (!timezone) {
        // Если зона не найдена — пропускаем эту минуту
        ms += 60 * 1000;
        continue;
      }

      // Считаем интервал (в минутах) на основе count
      const intervalMinutes = Math.floor(60 / timezone.count);
      // Добавляем текущий момент в расписание
      timestamps.push(Math.floor(ms / 1000));

      // Переходим к следующему слоту
      ms += intervalMinutes * 60 * 1000;
    }

    this.logger.log(`Schedule created: ${JSON.stringify(timestamps)}`);
    return timestamps;
  }

  async publishVideos(): Promise<Video[]> {
    this.logger.log('Publishing videos');
    const schedules = await this.createSchedule();
    this.logger.log(`Created ${schedules.length} schedules`);
    const videos = await this.getVideos(schedules.length);
    this.logger.log(`Found ${videos.length} videos`);

    const videosToPublish = videos.slice(
      0,
      Math.min(videos.length, schedules.length),
    );
    const publishedVideos = schedules.map(async (schedule, index) => {
      if (!videosToPublish[index]) return null;

      const video = videosToPublish[index];
      this.logger.log(
        `Publishing video ${video.id} at ${new Date(schedule * 1000).toLocaleString()}`,
      );

      const result = await this.vkService.uploadVideo(
        video.file_path,
        schedule,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (result) {
        this.logger.log(`Video ${video.id} published`);
        return await this.videoService.puplishVideo(video.id);
      }

      this.logger.error(`Failed to publish video ${video.id}`);
      return null;
    });

    return (await Promise.all(publishedVideos)).filter(
      (video): video is Video => video !== null,
    );
  }

  async createTimezone(
    createTimezoneDto: CreateTimezoneDto,
  ): Promise<Timezone> {
    await this.validateTimezone(createTimezoneDto);
    const timezone = this.timezoneRepository.create(createTimezoneDto);
    return this.timezoneRepository.save(timezone);
  }

  private async validateTimezone(
    createTimezoneDto: CreateTimezoneDto,
  ): Promise<void> {
    const { startHour, endHour, count } = createTimezoneDto;
    const timezones = await this.timezoneRepository.find();
    const sortedTimezones = timezones.sort((a, b) => a.zone - b.zone);

    let totalVideos = 0;
    for (const timezone of sortedTimezones) {
      const overlapStart = Math.max(startHour, timezone.startHour);
      const overlapEnd = Math.min(endHour, timezone.endHour);
      if (overlapStart < overlapEnd) {
        const overlapHours = overlapEnd - overlapStart;
        totalVideos += overlapHours * timezone.count;
      }
    }

    const newIntervalHours = endHour - startHour;
    totalVideos += newIntervalHours * count;

    if (totalVideos > this.maxVideosPerDay) {
      throw new Error(
        'Adding this timezone exceeds the maximum videos per day limit',
      );
    }
  }

  async updateTimezone(
    id: number,
    updateTimezoneDto: UpdateTimezoneDto,
  ): Promise<Timezone> {
    await this.validateTimezone(updateTimezoneDto);
    await this.timezoneRepository.update(id, updateTimezoneDto);
    return this.getTimezoneById(id);
  }

  async deleteTimezone(id: number): Promise<void> {
    await this.timezoneRepository.delete(id);
  }

  async getTimezones(): Promise<Timezone[]> {
    return this.timezoneRepository.find();
  }

  async getTimezoneById(id: number): Promise<Timezone> {
    return this.timezoneRepository.findOne({ where: { id } });
  }
}
