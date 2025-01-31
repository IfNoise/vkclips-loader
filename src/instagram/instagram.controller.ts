// src/instagram/instagram.controller.ts
import { Controller, Post, Body, Res } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { Response } from 'express';
import { Video } from 'src/video/entity/video.entity';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Post()
  async downloadVideo(@Body('url') url: string, @Res() res: Response) {
    try {
      const video: Video = await this.instagramService.fetchVideo(url);
      if (!video) {
        throw new Error('Failed to fetch video.');
      }
      res.status(200).contentType('video/mp4').json({
        message: 'Video downloaded successfully.',
        filePath: video.file_path,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: 'Failed to download video.', error: err.message });
    }
  }
}
