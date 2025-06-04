import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoLogger } from 'nestjs-pino';
import { join } from 'path';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as compression from 'compression';
import { rateLimit } from 'express-rate-limit';

/**
 * Bootstrap the NestJS application with comprehensive configuration
 */
async function bootstrap() {
  // Create Winston logger for application-level logging
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('MarineAI', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new DailyRotateFile({
        level: 'error',
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  });

  // Create the NestJS application
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logger,
    bufferLogs: true,
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const environment = configService.get<string>('NODE_ENV', 'development');
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const enableSwagger = configService.get<boolean>('ENABLE_SWAGGER', true);
  const enableRequestLogging = configService.get<boolean>('ENABLE_REQUEST_LOGGING', true);
  
  // Use Pino logger for HTTP request logging if enabled
  if (enableRequestLogging) {
    app.useLogger(app.get(PinoLogger));
  }

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Configure CORS
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Security middleware (helmet)
  app.use(helmet());
  
  // Enable compression
  app.use(compression());
  
  // Cookie parser middleware
  app.use(cookieParser());
  
  // Rate limiting for API endpoints
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again later',
      skip: (req) => req.path.startsWith('/api/health'), // Don't rate limit health checks
    }),
  );

  // Set up static file serving for uploads preview
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public',
    maxAge: 86400000, // 1 day
  });

  // Configure file uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // Set up global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not defined in DTOs
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw errors when non-whitelisted properties are present
      transformOptions: {
        enableImplicitConversion: true, // Automatically convert primitive types
      },
      validationError: {
        target: false, // Don't expose the target object
        value: false, // Don't expose the value that failed validation
      },
    }),
  );

  // Set up Swagger/OpenAPI documentation if enabled
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('MarineAI API')
      .setDescription('API documentation for the MarineAI vessel manual system')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('vessels', 'Vessel management endpoints')
      .addTag('manuals', 'Manual management endpoints')
      .addTag('ai', 'AI assistant endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    
    Logger.log(
      `Swagger documentation available at http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }

  // Graceful shutdown handling
  const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'] as const;
  
  for (const signal of signals) {
    process.on(signal, async () => {
      Logger.log(`Received ${signal}, gracefully shutting down`, 'Bootstrap');
      
      // Close the application
      await app.close();
      Logger.log('Application shutdown complete', 'Bootstrap');
      process.exit(0);
    });
  }

  // Start the application
  await app.listen(port);
  
  Logger.log(
    `🚀 MarineAI API server running on http://localhost:${port}/api in ${environment} mode`,
    'Bootstrap',
  );
  Logger.log(
    `Health check endpoint available at http://localhost:${port}/api/health`,
    'Bootstrap',
  );
}

// Execute the bootstrap function
bootstrap().catch((error) => {
  Logger.error(`Error during bootstrap: ${error.message}`, error.stack, 'Bootstrap');
  process.exit(1);
});
