import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { VkService } from './vk.service';

@Controller('vk')
export class VkController {
  constructor(private vkService: VkService) {}

  @Get('test')
  test() {
    return { success: true };
  }
  @Get('callback')
  async getAccessToken(@Query('code') code: string, @Res() res) {
    const success = await this.vkService.getAccessToken(code);
    if (success) {
      return res.redirect('http://localhost:3001'); // или куда нужно
    } else return res.redirect('/'); // или куда нужно
  }
  @Post('login')
  async login(@Body() body) {
    const { username, password } = body;
    if (this.vkService.login(username, password))
      return { twoFactorRequired: true };
  }
  @Post('twofactor')
  async checkTwoFactor(@Body() body) {
    const { twoFactorCode } = body;
    this.vkService.setTwoFactorCode(twoFactorCode);
    return { success: true };
    // Если код верный, возвращай:
    // return { success: true };
    // Если нет:
    // return { success: false };
  }
}
