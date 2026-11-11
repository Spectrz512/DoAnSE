import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend API running on http://0.0.0.0:${port}/api`);
  console.log(`📚 Swagger documentation ready at http://localhost:${port}/docs`);
  console.log(`💓 Health check ready at http://localhost:${port}/health`);
}
void bootstrap();
