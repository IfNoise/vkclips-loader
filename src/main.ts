import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  app.setGlobalPrefix('api');
  const options = new DocumentBuilder()
    .setTitle('VK Publish Service')
    .setDescription('Short video VK publishing Restful API service')
    .setVersion('1.0')
    .addTag('vkpublish')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document, {
    jsonDocumentUrl: 'swagger/json',
  });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log('Application is running on: http://localhost:3000');
}
bootstrap();
