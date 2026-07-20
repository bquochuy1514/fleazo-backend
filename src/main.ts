import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['/'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        return new BadRequestException(
          errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        );
      },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Fleazo API')
    .setDescription('Backend API for Fleazo — student secondhand marketplace')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalFilters(new ValidationExceptionFilter());

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
