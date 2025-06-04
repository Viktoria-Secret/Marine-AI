import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { RedisHealthIndicator } from './indicators/redis.health';
import { S3HealthIndicator } from './indicators/s3.health';
import { WeaviateHealthIndicator } from './indicators/weaviate.health';
import { Public } from '../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { promisify } from 'util';
import * as os from 'os';

/**
 * Health Controller
 * 
 * Provides endpoints for monitoring service health, database connectivity,
 * and overall system status.
 */
@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private startTime: number;

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
    private redis: RedisHealthIndicator,
    private s3: S3HealthIndicator,
    private weaviate: WeaviateHealthIndicator,
    private configService: ConfigService,
    @InjectConnection() private connection: Connection,
  ) {
    this.startTime = Date.now();
  }

  /**
   * Basic health check endpoint
   * Returns a simple status check for load balancers and monitoring tools
   */
  @Get()
  @Public()
  @Version(VERSION_NEUTRAL)
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-06-04T12:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service is unhealthy',
  })
  basicCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Comprehensive health check
   * Checks all critical dependencies and services
   */
  @Get('check')
  @Public()
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: 'Comprehensive health check of all services' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All services are healthy',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'One or more services are unhealthy',
  })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database connection check
      async () => this.db.pingCheck('database', { timeout: 3000 }),

      // Redis connection check
      async () => this.redis.isHealthy('redis'),

      // S3/MinIO connection check
      async () => this.s3.isHealthy('storage'),

      // Weaviate connection check
      async () => this.weaviate.isHealthy('vector_db'),

      // AI Service connection check
      async () => this.http.pingCheck('ai_service', this.configService.get<string>('AI_SERVICE_URL') + '/health'),

      // Disk space check
      async () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9, // 90% threshold
      }),

      // Memory usage check
      async () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
    ]);
  }

  /**
   * Database-specific health check
   */
  @Get('db')
  @Public()
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: 'Database health check' })
  async dbCheck(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }

  /**
   * Redis-specific health check
   */
  @Get('redis')
  @Public()
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: 'Redis health check' })
  async redisCheck(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => this.redis.isHealthy('redis'),
    ]);
  }

  /**
   * Storage-specific health check
   */
  @Get('storage')
  @Public()
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: 'S3/MinIO storage health check' })
  async storageCheck(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => this.s3.isHealthy('storage'),
    ]);
  }

  /**
   * Vector database health check
   */
  @Get('vector-db')
  @Public()
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: 'Weaviate vector database health check' })
  async vectorDbCheck(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => this.weaviate.isHealthy('vector_db'),
    ]);
  }

  /**
   * AI service health check
   */
  @Get('ai-service')
  @Public()
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: 'AI service health check' })
  async aiServiceCheck(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => this.http.pingCheck('ai_service', this.configService.get<string>('AI_SERVICE_URL') + '/health'),
    ]);
  }

  /**
   * System information endpoint
   * Returns detailed information about the system and service
   */
  @Get('info')
  @Public()
  @Version(VERSION_NEUTRAL)
  @ApiOperation({ summary: 'System information' })
  async getSystemInfo(): Promise<Record<string, any>> {
    const uptime = Date.now() - this.startTime;
    const loadAvg = os.loadavg();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();

    // Get database info
    let dbInfo: Record<string, any> = {};
    try {
      const dbResult = await this.connection.query('SELECT version()');
      dbInfo = {
        version: dbResult[0].version,
        connected: true,
        type: this.connection.options.type,
      };
    } catch (error) {
      this.logger.error(`Failed to get database info: ${error.message}`);
      dbInfo = {
        connected: false,
        error: error.message,
      };
    }

    // Get active connections
    let connectionCount = 0;
    try {
      const result = await this.connection.query('SELECT count(*) as count FROM pg_stat_activity');
      connectionCount = parseInt(result[0].count, 10);
    } catch (error) {
      this.logger.error(`Failed to get connection count: ${error.message}`);
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: {
        name: 'MarineAI Backend',
        version: this.configService.get<string>('npm_package_version', '1.0.0'),
        nodeVersion: process.version,
        environment: this.configService.get<string>('NODE_ENV', 'development'),
        uptime: {
          ms: uptime,
          formatted: this.formatUptime(uptime),
        },
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadAvg: {
          '1m': loadAvg[0],
          '5m': loadAvg[1],
          '15m': loadAvg[2],
        },
        memory: {
          free: freeMemory,
          total: totalMemory,
          usedPercent: ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2) + '%',
        },
      },
      database: {
        ...dbInfo,
        activeConnections: connectionCount,
      },
    };
  }

  /**
   * Live readiness probe for Kubernetes
   */
  @Get('live')
  @Public()
  @Version(VERSION_NEUTRAL)
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  async liveness(): Promise<Record<string, any>> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Ready readiness probe for Kubernetes
   */
  @Get('ready')
  @Public()
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => this.db.pingCheck('database', { timeout: 1500 }),
      async () => this.redis.isHealthy('redis'),
    ]);
  }

  /**
   * Format uptime in a human-readable format
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  }
}
