import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { VkService } from './vk.service';

@Controller('vk')
export class VkController {
  private logger = new Logger(VkController.name);
  constructor(private vkService: VkService) {}

  @Get('test')
  test() {
    return { success: true };
  }
  @Get('callback')
  async getAccessToken(
    @Query('code') code: string,
    @Query('device_id') deviceId: string,
    @Query('expires_in') expiresIn: string,
    @Req() req,
    @Res() res,
  ) {
    this.logger.log('Request query', req.query);
    this.logger.log('Request cookies', req.cookies);
    const success = await this.vkService.getAccessToken(
      code,
      deviceId,
      expiresIn,
    );
    if (success) {
      return res.redirect('http://localhost:3000'); // или куда нужно
    } else return { success: false }; // или куда нужно
  }

  @Get('redirect')
  async authenticate(@Res() res) {
    const url = 'localhost:3000'; // или куда нужно
    return res.redirect(url);
  }

  @Post('verifer')
  async setCodeVerifier(@Body() body) {
    const { codeVerifier } = body;
    this.vkService.setCodeVerifier(codeVerifier);
    return { success: true };
  }
}
