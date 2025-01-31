import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile, stat } from 'fs/promises';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { CallbackService } from 'vk-io';
import { DirectAuthorization } from '@vk-io/authorization';

@Injectable()
export class VkService {
  private readonly vkApi: AxiosInstance;
  private token: string;
  private callbackService: CallbackService;
  private direct: DirectAuthorization;
  private twoFactorCode: string;
  private tokenRefreshTimeout: NodeJS.Timeout;
  private readonly logger = new Logger(VkService.name);
  constructor(private configService: ConfigService) {
    this.callbackService = new CallbackService();
    this.callbackService.onTwoFactor((payload, retry) => {
      this.logger.log(
        `Требуется двухфакторная аутентификация: ${JSON.stringify(payload)}`,
      );
      // Ожидаем получения кода двухфакторной аутентификации
      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (this.twoFactorCode) {
            clearInterval(interval);
            retry(this.twoFactorCode);
            resolve();
          }
        }, 1000);
      });
    });
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

      const response = await axios.get('https://oauth.vk.com/access_token', {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code,
        },
      });
      if (response.data.error instanceof AxiosError) {
        throw new AxiosError(response.data.error);
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

  async login(username: string, password: string): Promise<boolean> {
    try {
      const clientId = this.configService.get<string>('VK_CLIENT_ID');
      const clientSecret = this.configService.get<string>('VK_CLIENT_SECRET');

      if (!clientId || !clientSecret || !username || !password) {
        this.logger.error('Не указаны необходимые параметры VK');
        throw new Error('Не указаны необходимые параметры VK');
      }
      this.direct = new DirectAuthorization({
        callbackService: this.callbackService,
        clientId,
        clientSecret,
        scope: 'all',
        login: username,
        password,
        apiVersion: '5.199',
      });
      const response = await this.direct.run();
      this.logger.log('Успешная авторизация VK', response);
      this.token = response.token;
      this.vkApi.defaults.params['access_token'] = this.token;
      return true;
    } catch (error) {
      this.logger.error('Ошибка авторизации VK', error);
      throw new Error('Ошибка авторизации VK');
    }
  }
  setTwoFactorCode(code: string) {
    this.twoFactorCode = code;
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
