import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, FindManyOptions, Repository } from 'typeorm';
import { Video } from './entity/video.entity';
import { VideoUpdateDto } from './dto/video_update.dto';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { Pagination, PaginationOptionsInterface } from 'src/pagination';
import { ConfigService } from 'src/config/config.service';
@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly configService: ConfigService;
  private readonly archiveDir: string;
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
  ) {
    this.configService = new ConfigService();
    this.archiveDir = this.configService.get<string>(
      'ARCHIVE_DIR',
      '/home/noise83/Загрузки/archive',
    );
  }

  async saveVideoInfo(
    url: string,
    file_path: string,
    preview_path: string,
    status: string = 'pending',
    views: number = 0,
    likes: number = 0,
    comments: number,
    addedDate: number = Math.floor(new Date().getTime() / 1000),
    publishDate: number = 0,
  ): Promise<Video> {
    const video = new Video();
    video.url = url;
    video.file_path = file_path;
    video.preview_path = preview_path;
    video.status = status;
    video.views = views || 0;
    video.likes = likes || 0;
    video.comments = comments || 0;
    video.rating = 0;
    video.addedDate = addedDate;
    video.publishDate = publishDate;
    return this.videoRepository.save(video);
  }

  async getTopVideos(skip: number, take: number): Promise<Video[]> {
    return this.videoRepository.find({
      order: {
        views: 'DESC',
        likes: 'DESC',
        comments: 'DESC',
      },
      skip,
      take,
    });
  }

  async getAllVideos({ page = 0, limit = 10 }): Promise<Pagination<Video>> {
    const [results, total] = await this.videoRepository.findAndCount({
      skip: page * limit,
      take: limit,
    });

    return new Pagination<Video>({
      results,
      total,
    });
  }

  async getVideoById(id: number): Promise<Video> {
    return this.videoRepository.findOne({ where: { id } });
  }

  async puplishVideo(id: number): Promise<Video> {
    const video = await this.getVideoById(id);
    if (!video) {
      throw new Error('Video not found');
    }
    video.status = 'archived';
    video.publishDate = Math.floor(new Date().getTime() / 1000);
    return this.videoRepository.save(video);
  }

  async findVideo(options: FindManyOptions<Video>): Promise<Pagination<Video>> {
    this.logger.log(`Finding videos with filter: ${JSON.stringify(options)}`);
    const [results, total] = await this.videoRepository.findAndCount(options);

    return new Pagination<Video>({
      results,
      total,
    });
  }

  async findAndUpdate(id: number, updates: VideoUpdateDto): Promise<Video> {
    await this.videoRepository.update({ id }, updates);
    return this.getVideoById(id);
  }

  async deleteVideo(id: number): Promise<DeleteResult> {
    this.logger.log(`Deleting video with id: ${id}`);
    const video = await this.getVideoById(id);
    if (!video) {
      throw new Error('Video not found');
    }
    fs.rm(video.file_path, () => {
      this.logger.log(`Deleted video file: ${video.file_path}`);
    });
    return await this.videoRepository.delete(id);
  }

  async scanArchive(): Promise<void> {
    this.logger.log(`Scanning archive directory: ${this.archiveDir}`);
    const files = fs.readdirSync(this.archiveDir);
    this.logger.log(`Found ${files.length} files`);
    for (const file of files) {
      if (file.endsWith('.mp4')) {
        const fileStat = fs.statSync(`${this.archiveDir}/${file}`);
        const fileName = file.replace('.mp4', '');
        if (!fs.existsSync(`${this.archiveDir}/thumbnails/${fileName}.jpg`)) {
          child_process.exec(
            `
            ffmpeg -itsoffset -1 -i "${this.archiveDir}/${file}" -vframes 1  -qscale:v 5 -filter:v scale='min(720\\, iw):-1' "${process.cwd()}/uploads/thumbnails/${fileName}.jpg"
            `,
            (err, stdout) => {
              if (err) {
                this.logger.error(err);
              }
              this.logger.log(`Thumbnail created for ${stdout}`);
            },
          );
        }
        await this.saveVideoInfo(
          `file://${this.archiveDir}/${file}`,
          `${this.archiveDir}/${file}`,
          `thumbnails/${fileName}.jpg`,
          'archived',
          0,
          0,
          0,
          Math.floor(fileStat.birthtimeMs / 1000),
          Math.floor(fileStat.birthtimeMs / 1000),
        );
      }
    }
  }
  async deleteArcvedVideos(): Promise<void> {
    this.logger.log('Deleting archived videos');
    await this.videoRepository.delete({ status: 'archived' });
  }
  async deleteAllVideos(): Promise<void> {
    this.logger.log('Deleting all videos');
    await this.videoRepository.delete({});
  }
}
