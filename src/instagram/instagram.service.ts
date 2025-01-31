import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { VideoService } from 'src/video/video.service';
import * as fs from 'fs';
import * as path from 'path';
import { Video } from 'src/video/entity/video.entity';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private videoService: VideoService) {}

  async fetchVideo(url: string): Promise<Video> {
    url = url.replace(/\/reel\//, '/p/').split('?')[0];
    const { total } = await this.videoService.findVideo({
      where: { url },
      skip: 0,
      take: 1,
    });
    if (total > 0) {
      this.logger.error('Video already exists');
      throw new Error('Video already exists');
    }
    const apiUrl = `${url}?__a=1&__d=dis`;
    this.logger.log(`Fetching video metadata from: ${apiUrl}`);
    const response = await axios.get(apiUrl, {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'ru,en;q=0.9,en-US;q=0.8,hy;q=0.7,qu;q=0.6,th;q=0.5',
        'cache-control': 'no-cache',
        cookie:
          'datr=Jwa0ZqHprnNkmOjMUDoBKFtE; ig_did=D9F2A43C-2DA7-4D1E-B7F2-0256EDB6984F; mid=ZrQGKQAEAAGl8qunH9J3aOLwur95; ig_nrcb=1; ps_l=1; ps_n=1; fbm_124024574287414=base_domain=.instagram.com; wd=1368x641; csrftoken=WanykEBfmAWCbT0FwzqJH8mcsaQtWZpE; ds_user_id=5423881517; sessionid=5423881517%3AlvmxS6pc5V2HEK%3A3%3AAYdRsDJ-a48bNMiIk9huWT_okbq6iOur2i07IzVP1Q; rur="CCO\x2c5423881517\x2c1767337831:01f7a2db9752f03848a35bccd5991c9456f4e9c4d12ff61b0e886a0500f895821bab5deb"',
        dpr: '1',
        pragma: 'no-cache',
        priority: 'u=0, i',
        'sec-ch-prefers-color-scheme': 'light',
        'sec-ch-ua':
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-full-version-list':
          '"Google Chrome";v="131.0.6778.204", "Chromium";v="131.0.6778.204", "Not_A Brand";v="24.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"Linux"',
        'sec-ch-ua-platform-version': '"5.15.0"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'viewport-width': '604',
      },
    });
    if (response.status !== 200) {
      this.logger.error(
        `Failed to fetch video metadata: ${response.statusText}`,
      );
      throw new Error('Failed to fetch video metadata.');
    }

    const data = response.data;
    const videoUrl = data.items[0].video_versions[0].url;
    const previewUrl = data.items[0].image_versions2.candidates[0].url;
    const views = data.items[0].play_count;
    const likes = data.items[0].like_count;
    const comments = data.items[0].comment_count;

    this.logger.log(`Fetching video from: ${videoUrl}`);

    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
    });
    const previewResponse = await axios.get(previewUrl, {
      responseType: 'arraybuffer',
    });
    if (videoResponse.status !== 200) {
      this.logger.error(`Failed to fetch video: ${videoResponse.statusText}`);
      throw new Error('Failed to fetch video.');
    }
    if (previewResponse.status !== 200) {
      this.logger.error(
        `Failed to fetch video preview: ${previewResponse.statusText}`,
      );
      throw new Error('Failed to fetch video preview.');
    }

    this.logger.log('Video fetched successfully');
    const videoBuffer = Buffer.from(videoResponse.data);
    const previewBuffer = Buffer.from(previewResponse.data);
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const thumnailDir = path.join(uploadsDir, 'thumbnails');
    if (!fs.existsSync(thumnailDir)) {
      fs.mkdirSync(thumnailDir, { recursive: true });
    }
    const videoPath = path.join(uploadsDir, `${Date.now()}.mp4`);
    const previewFileName = `${Date.now()}.jpg`;
    const previewPath = path.join(thumnailDir, previewFileName);
    await fs.promises.writeFile(videoPath, videoBuffer);
    await fs.promises.writeFile(previewPath, previewBuffer);
    return await this.videoService.saveVideoInfo(
      url,
      videoPath,
      `thumbnails/${previewFileName}`,
      'pending',
      views,
      likes,
      comments,
    );
  }
}
