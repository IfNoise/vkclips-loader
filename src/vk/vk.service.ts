import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile, stat } from 'fs/promises';
import axios, { AxiosError, AxiosInstance } from 'axios';

@Injectable()
export class VkService {
  private readonly vkApi: AxiosInstance;
  private token: string;
  private twoFactorCode: string;
  private tokenRefreshTimeout: NodeJS.Timeout;
  private readonly logger = new Logger(VkService.name);
  constructor(private configService: ConfigService) {
    this.token = this.configService.get<string>('VK_TOKEN');

    // this.checkTokenValidity().then((isValid) => {
    //   if (!isValid) {
    //     this.authenticate();
    //   }
    // });
    this.vkApi = axios.create({
      baseURL: 'https://api.vk.com/method',
      params: {
        access_token: this.token,
        v: '5.131',
      },
    });
  }
  async getAccessToken(code: string): Promise<boolean> {
    try {
      const clientId = this.configService.get<string>('VK_CLIENT_ID');
      const clientSecret = this.configService.get<string>('VK_CLIENT_SECRET');
      const redirectUri = 'http://localhost:3001';

      const response = await axios.post('https://id.vk.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      });
      if (response.data.error instanceof AxiosError) {
        this.logger.error('Ошибка получения токена VK', response.data);
        throw new AxiosError(response.data.error.message);
      }
      this.token = response.data.access_token;
      // Сохрани accessToken для использования
      // ...
      this.logger.log('Получен токен VK', response.data);

      return true;
    } catch (error) {
      this.logger.error('Ошибка получения токена VK', error);
      return false;
    }
  }

  private async checkTokenValidity(): Promise<boolean> {
    try {
      const response = await this.vkApi.get('/users.get');
      if (response.data.error) {
        this.logger.error('Токен VK устарел');
        return false;
      }
      this.logger.log('Токен VK валиден');
      return true;
    } catch (error) {
      this.logger.error('Ошибка проверки токена VK', error);
      return false;
    }
  }

  async testAuth(): Promise<boolean> {
    try {
      // await this.checkTokenValidity().then((isValid) => {
      //   if (!isValid) {
      //   }
      // });
      const response = await this.vkApi.get('/users.get');
      if (response.data.error) {
        this.logger.error('Ошибка авторизации VK', response.data.error);
        return false;
      } else {
        this.logger.log('Успешная авторизация VK', response.data);
        return true;
      }
    } catch (error) {
      this.logger.error('Ошибка авторизации VK', error);
      return false;
    }
  }

  async uploadVideo(filename: string, publishDate: number): Promise<boolean> {
    try {
      if (!filename) {
        this.logger.error('Не указан файл клипа');
        throw new Error('Не указан файл клипа');
      }
      const groupId = this.configService.get<number>('VK_GROUP_ID');
      const description = this.configService.get<string>('VK_DESCRIPTION');
      const wallpost = this.configService.get<number>('VK_WALLPOST');
      const fileStat = await stat(filename);
      if (!fileStat.isFile()) {
        this.logger.error('Указанный файл не является файлом');
        throw new Error('Указанный файл не является файлом');
      }
      if (!description) {
        this.logger.error('Не указано описание клипа');
        throw new Error('Не указано описание клипа');
      }
      const fileSize = fileStat.size;

      this.logger.log(
        `Загружаю клип: ${JSON.stringify({
          file_size: fileSize,
          wallpost,
          description,
          group_id: groupId,
          publish_date: publishDate || new Date().getMilliseconds() / 1000,
        })}`,
      );
      const response = await this.vkApi.post('/shortVideo.create', null, {
        params: {
          file_size: fileSize,
          wallpost,
          description,
          group_id: groupId,
          publish_date: publishDate,
        },
      });
      this.logger.log('Ответ от VK:', response.data);

      const uploadUrl = response.data.response.upload_url;
      const fileData = await readFile(filename);

      const uploadResponse = await axios.post(uploadUrl, fileData, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'attachment; filename=video.mp4',
          'Content-Range': `bytes 0-${fileData.length - 1}/${fileData.length}`,
          'X-Uploading-Mode': 'parallel',
        },
      });

      if (uploadResponse.status === 200) {
        this.logger.log(`Загружен клип: ${filename}`);
        return true;
      } else {
        this.logger.error(
          `Не удалось загрузить клип ${filename}`,
          uploadResponse.data,
        );
        return false;
      }
    } catch (error) {
      this.logger.error('Ошибка:', error);
      return false;
    }
  }
}
