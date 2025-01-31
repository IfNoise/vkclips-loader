import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile, stat } from 'fs/promises';
import axios, { AxiosError, AxiosInstance } from 'axios';

@Injectable()
export class VkService {
  private readonly vkApi: AxiosInstance;
  private access_token: string;
  private refresh_token: string;
  private deviceId: string;
  private twoFactorCode: string;
  private tokenRefreshTimeout: NodeJS.Timeout;
  private readonly logger = new Logger(VkService.name);
  constructor(private configService: ConfigService) {
    this.access_token = this.configService.get<string>('VK_TOKEN');

    // this.checkTokenValidity().then((isValid) => {
    //   if (!isValid) {
    //     this.authenticate();
    //   }
    // });
    this.vkApi = axios.create({
      baseURL: 'https://api.vk.com/method',
      params: {
        access_token: this.access_token,
        v: '5.131',
      },
    });
  }
  async getAccessToken(
    code: string,
    deviceId: string,
    expiresIn: string,
    codeVerifier: string,
  ): Promise<boolean> {
    try {
      this.logger.log('Получаю токен VK');
      const clientId = this.configService.get<string>('VK_CLIENT_ID');
      const clientSecret = this.configService.get<string>('VK_CLIENT_SECRET');
      const redirectUri = 'https://ddweed.org/vkloader/api/vk/redirect';

      const response = await axios.post('https://id.vk.com/oauth2/auth', {
        grant_type: 'authorization_code',
        client_id: clientId,
        device_id: deviceId,
        code_verifier: codeVerifier,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      });
      if (response.data.error instanceof AxiosError) {
        this.logger.error('Ошибка получения токена VK', response.data);
        this.logger.error(
          'Ошибка получения токена VK',
          response.data.error.message,
        );
        throw new AxiosError(response.data.error.message);
      }
      this.access_token = response.data.access_token;
      this.refresh_token = response.data.refresh_token;
      // Сохрани accessToken для использования
      // ...
      this.logger.log('Получен токен VK', response.data);
      this.tokenRefreshTimeout = setTimeout(
        () => {
          this.refreshToken();
        },
        parseInt(response.data.expires_in) * 1000,
      );
      return true;
    } catch (error) {
      this.logger.error('Ошибка получения токена VK', error);
      return false;
    }
  }
  private async refreshToken(): Promise<boolean> {
    try {
      this.logger.log('Обновляю токен VK');
      const clientId = this.configService.get<string>('VK_CLIENT_ID');
      const clientSecret = this.configService.get<string>('VK_CLIENT_SECRET');
      const redirectUri = 'http://localhost:3001';

      const response = await axios.post('https://id.vk.com/oauth2/token', {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        refresh_token: this.refreshToken,
      });
      if (response.data.error) {
        this.logger.error('Ошибка обновления токена VK', response.data.error);
        return false;
      }
      this.access_token = response.data.access_token;
      // Сохрани accessToken для использования
      // ...
      this.logger.log('Обновлен токен VK', response.data);
      this.tokenRefreshTimeout = setTimeout(
        () => {
          this.refreshToken();
        },
        parseInt(response.data.expires_in) * 1000,
      );
      return true;
    } catch (error) {
      this.logger.error('Ошибка обновления токена VK', error);
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
