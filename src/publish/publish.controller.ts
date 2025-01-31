import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PublishService } from './publish.service';
import { CreateTimezoneDto } from './dto/createtimezone.dto';
import { UpdateTimezoneDto } from './dto/updatetimezone.dto';
import { Timezone } from './entity/time-zone.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Video } from 'src/video/entity/video.entity';

/**
 * Контроллер для управления временными зонами.
 */
@ApiTags('timezones')
@Controller('timezones')
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Get('test')
  test(): Promise<Video[]> {
    return this.publishService.publishVideos();
  }
  /**
   * Создание новой временной зоны.
   * @param createTimezoneDto Данные для создания временной зоны.
   * @returns Созданная временная зона.
   */
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Создание новой временной зоны' })
  @ApiResponse({
    status: 201,
    description: 'Временная зона успешно создана.',
    type: Timezone,
  })
  createTimezone(
    @Body() createTimezoneDto: CreateTimezoneDto,
  ): Promise<Timezone> {
    return this.publishService.createTimezone(createTimezoneDto);
  }

  /**
   * Обновление временной зоны.
   * @param id Идентификатор временной зоны.
   * @param updateTimezoneDto Данные для обновления временной зоны.
   * @returns Обновленная временная зона.
   */
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Обновление временной зоны' })
  @ApiResponse({
    status: 200,
    description: 'Временная зона успешно обновлена.',
    type: Timezone,
  })
  updateTimezone(
    @Param('id') id: number,
    @Body() updateTimezoneDto: UpdateTimezoneDto,
  ): Promise<Timezone> {
    return this.publishService.updateTimezone(id, updateTimezoneDto);
  }

  /**
   * Удаление временной зоны.
   * @param id Идентификатор временной зоны.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Удаление временной зоны' })
  @ApiResponse({ status: 200, description: 'Временная зона успешно удалена.' })
  deleteTimezone(@Param('id') id: number): Promise<void> {
    return this.publishService.deleteTimezone(id);
  }

  /**
   * Получение всех временных зон.
   * @returns Список всех временных зон.
   */
  @Get()
  @ApiOperation({ summary: 'Получение всех временных зон' })
  @ApiResponse({
    status: 200,
    description: 'Список всех временных зон.',
    type: [Timezone],
  })
  getTimezones(): Promise<Timezone[]> {
    return this.publishService.getTimezones();
  }

  /**
   * Получение временной зоны по идентификатору.
   * @param id Идентификатор временной зоны.
   * @returns Временная зона.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Получение временной зоны по идентификатору' })
  @ApiResponse({ status: 200, description: 'Временная зона.', type: Timezone })
  getTimezoneById(@Param('id') id: number): Promise<Timezone> {
    return this.publishService.getTimezoneById(id);
  }
}
