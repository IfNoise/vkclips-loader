import { Test, TestingModule } from '@nestjs/testing';
import { PublishService } from './publish.service';
import { VkService } from '../vk/vk.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Timezone } from './entity/time-zone.entity';
import { VideoService } from '../video/video.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Video } from 'src/video/entity/video.entity';

describe('PublishService', () => {
  let service: PublishService;
  let videoService: VideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishService,
        VkService,
        {
          provide: getRepositoryToken(Timezone),
          useValue: {}, // Mock repository
        },
        {
          provide: VideoService,
          useValue: {
            findVideo: jest.fn(),
          },
        },
        ConfigService,
        Logger,
      ],
    }).compile();

    service = module.get<PublishService>(PublishService);
    videoService = module.get<VideoService>(VideoService);
  });

  it('должен быть определен', () => {
    expect(service).toBeDefined();
  });

  describe('getVideos', () => {
    it('должен возвращать массив видео', async () => {
      const mockVideos = [{ id: 1 }, { id: 2 }] as Video[];
      jest
        .spyOn(videoService, 'findVideo')
        .mockResolvedValue({ results: mockVideos, total: 2, page_total: 1 });

      const videos = await service.getVideos();
      expect(videos).toEqual(mockVideos);
    });

    it('должен логировать и возвращать пустой массив, если видео не найдены', async () => {
      jest
        .spyOn(videoService, 'findVideo')
        .mockResolvedValue({ results: [], total: 0, page_total: 0 });
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      const videos = await service.getVideos();
      expect(videos).toEqual([]);
      expect(loggerSpy).toHaveBeenCalledWith('No videos found');
    });
  });
});
