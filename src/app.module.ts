import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './modules/upload/upload.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { ChatModule } from './modules/chat/chat.module';
import { UniversitiesModule } from './modules/universities/universities.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import jwtConfig from './config/jwt.config';
import googleConfig from './config/google.config';
import mailConfig from './config/mail.config';
import cloudinaryConfig from './config/cloudinary.config';
import fleazoAiConfig from './config/fleazo-ai.config';

@Module({
  imports: [
    UploadModule,
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        jwtConfig,
        googleConfig,
        mailConfig,
        cloudinaryConfig,
        fleazoAiConfig,
      ],
    }),
    CategoriesModule,
    ProductsModule,
    ChatModule,
    UniversitiesModule,
    LocationsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
