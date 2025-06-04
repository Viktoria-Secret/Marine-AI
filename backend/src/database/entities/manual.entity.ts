import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsPositive,
  IsUUID,
  IsDate,
  IsUrl,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { User } from './user.entity';
import { Vessel } from './vessel.entity';
import { Expose, Transform } from 'class-transformer';

/**
 * Manual category enum for organizing vessel documentation
 */
export enum ManualCategory {
  OPERATION = 'operation',
  MAINTENANCE = 'maintenance',
  SAFETY = 'safety',
  TECHNICAL = 'technical',
  COMPLIANCE = 'compliance',
  EMERGENCY = 'emergency',
  TRAINING = 'training',
  OTHER = 'other',
}

/**
 * Manual processing status enum for tracking document processing workflow
 */
export enum ManualProcessingStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NEEDS_REVIEW = 'needs_review',
}

/**
 * Manual visibility enum for access control
 */
export enum ManualVisibility {
  PRIVATE = 'private',
  VESSEL_ONLY = 'vessel_only',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

/**
 * Manual entity representing vessel documentation in the MarineAI system
 * Includes metadata, file information, processing status, and relationships
 */
@Entity('manuals')
@Index(['vesselId', 'title'])
@Index(['processingStatus'])
@Check(`"ocrConfidenceScore" >= 0 AND "ocrConfidenceScore" <= 100`)
export class Manual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Manual identification and metadata
  @Column({ length: 255 })
  @IsNotEmpty()
  @IsString()
  @Length(2, 255)
  @Index()
  title: string;

  @Column({ nullable: true, length: 100 })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  version?: string;

  @Column({
    type: 'enum',
    enum: ManualCategory,
    default: ManualCategory.OTHER,
  })
  @IsEnum(ManualCategory)
  category: ManualCategory;

  @Column({ nullable: true, length: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @Column({ type: 'simple-array', nullable: true })
  @IsOptional()
  tags?: string[];

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  manufacturer?: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  modelNumber?: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  serialNumber?: string;

  @Column({ nullable: true, type: 'date' })
  @IsOptional()
  @IsDate()
  publicationDate?: Date;

  @Column({ nullable: true, type: 'date' })
  @IsOptional()
  @IsDate()
  expirationDate?: Date;

  // File information
  @Column({ length: 255 })
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  filename: string;

  @Column({ type: 'bigint' })
  @IsInt()
  @IsPositive()
  fileSize: number;

  @Column({ length: 255 })
  @IsNotEmpty()
  @IsString()
  s3Key: string;

  @Column({ length: 100, default: 'application/pdf' })
  @IsString()
  @Length(1, 100)
  mimeType: string;

  @Column({ length: 64, nullable: true })
  @IsOptional()
  @IsString()
  @Length(64, 64)
  checksum?: string;

  @Column({ length: 10, default: 'pdf' })
  @IsString()
  @Length(1, 10)
  fileFormat: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @IsUrl()
  thumbnailUrl?: string;

  // Processing status
  @Column({
    type: 'enum',
    enum: ManualProcessingStatus,
    default: ManualProcessingStatus.UPLOADED,
  })
  @IsEnum(ManualProcessingStatus)
  processingStatus: ManualProcessingStatus;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  processingStartedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  processingCompletedAt?: Date;

  @Column({ nullable: true, length: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  processingError?: string;

  @Column({ nullable: true, type: 'int' })
  @IsOptional()
  @IsInt()
  @Min(0)
  processingRetries?: number;

  // OCR and quality metrics
  @Column({ type: 'int', default: 0 })
  @IsInt()
  @Min(0)
  pageCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ocrConfidenceScore?: number;

  @Column({ default: false })
  @IsBoolean()
  hasLowQualityPages: boolean;

  @Column({ type: 'simple-array', nullable: true })
  @IsOptional()
  lowQualityPages?: string[];

  @Column({ default: false })
  @IsBoolean()
  textExtracted: boolean;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  extractedTextPath?: string;

  // AI processing metadata
  @Column({ default: false })
  @IsBoolean()
  embeddingsGenerated: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  lastIndexedAt?: Date;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  vectorDbIndexId?: string;

  @Column({ type: 'int', default: 0 })
  @IsInt()
  @Min(0)
  chunkCount: number;

  @Column({ nullable: true, type: 'jsonb' })
  @IsOptional()
  embeddingMetadata?: Record<string, any>;

  // Access control and permissions
  @Column({
    type: 'enum',
    enum: ManualVisibility,
    default: ManualVisibility.VESSEL_ONLY,
  })
  @IsEnum(ManualVisibility)
  visibility: ManualVisibility;

  @Column({ default: false })
  @IsBoolean()
  isArchived: boolean;

  @Column({ default: false })
  @IsBoolean()
  isStarred: boolean;

  @Column({ default: 0 })
  @IsInt()
  @Min(0)
  viewCount: number;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  lastViewedAt?: Date;

  // Relationships
  @ManyToOne(() => Vessel, (vessel) => vessel.manuals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vesselId' })
  vessel: Vessel;

  @Column()
  @IsUUID()
  vesselId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column({ nullable: true })
  @IsOptional()
  @IsUUID()
  uploadedById?: string;

  // Audit fields
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: Date;

  @Column({ nullable: true, length: 36 })
  createdBy?: string;

  @Column({ nullable: true, length: 36 })
  updatedBy?: string;

  @Column({ nullable: true, length: 36 })
  deletedBy?: string;

  // Computed properties
  private _downloadUrl?: string;
  private _previewUrl?: string;

  @AfterLoad()
  computeUrls() {
    // These will be populated by the service layer
    this._downloadUrl = null;
    this._previewUrl = null;
  }

  @Expose()
  get downloadUrl(): string {
    return this._downloadUrl;
  }

  set downloadUrl(url: string) {
    this._downloadUrl = url;
  }

  @Expose()
  get previewUrl(): string {
    return this._previewUrl;
  }

  set previewUrl(url: string) {
    this._previewUrl = url;
  }

  @Expose()
  get processingDuration(): number | null {
    if (!this.processingStartedAt || !this.processingCompletedAt) {
      return null;
    }
    return (this.processingCompletedAt.getTime() - this.processingStartedAt.getTime()) / 1000;
  }

  @Expose()
  get isProcessingComplete(): boolean {
    return this.processingStatus === ManualProcessingStatus.COMPLETED;
  }

  @Expose()
  get isSearchable(): boolean {
    return this.isProcessingComplete && this.textExtracted && this.embeddingsGenerated;
  }

  @Expose()
  get formattedFileSize(): string {
    const bytes = Number(this.fileSize);
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Start processing workflow
   */
  startProcessing(): void {
    this.processingStatus = ManualProcessingStatus.PROCESSING;
    this.processingStartedAt = new Date();
    this.processingRetries = (this.processingRetries || 0) + 1;
  }

  /**
   * Complete processing workflow
   * @param pageCount Number of pages in the document
   * @param ocrConfidenceScore Average OCR confidence score
   * @param lowQualityPages Array of page numbers with low quality
   */
  completeProcessing(pageCount: number, ocrConfidenceScore?: number, lowQualityPages?: string[]): void {
    this.processingStatus = ManualProcessingStatus.COMPLETED;
    this.processingCompletedAt = new Date();
    this.pageCount = pageCount;
    
    if (ocrConfidenceScore !== undefined) {
      this.ocrConfidenceScore = ocrConfidenceScore;
    }
    
    if (lowQualityPages && lowQualityPages.length > 0) {
      this.hasLowQualityPages = true;
      this.lowQualityPages = lowQualityPages;
      
      // If OCR quality is very poor overall, mark for human review
      if (ocrConfidenceScore && ocrConfidenceScore < 60) {
        this.processingStatus = ManualProcessingStatus.NEEDS_REVIEW;
      }
    }
  }

  /**
   * Mark processing as failed
   * @param error Error message
   */
  failProcessing(error: string): void {
    this.processingStatus = ManualProcessingStatus.FAILED;
    this.processingCompletedAt = new Date();
    this.processingError = error;
  }

  /**
   * Update text extraction status
   * @param extracted Whether text was successfully extracted
   * @param path Path to extracted text file
   */
  updateTextExtractionStatus(extracted: boolean, path?: string): void {
    this.textExtracted = extracted;
    this.extractedTextPath = path;
  }

  /**
   * Update embeddings status
   * @param generated Whether embeddings were successfully generated
   * @param indexId Vector DB index ID
   * @param chunkCount Number of text chunks embedded
   * @param metadata Additional metadata about embeddings
   */
  updateEmbeddingsStatus(
    generated: boolean,
    indexId?: string,
    chunkCount?: number,
    metadata?: Record<string, any>
  ): void {
    this.embeddingsGenerated = generated;
    this.lastIndexedAt = new Date();
    
    if (indexId) {
      this.vectorDbIndexId = indexId;
    }
    
    if (chunkCount !== undefined) {
      this.chunkCount = chunkCount;
    }
    
    if (metadata) {
      this.embeddingMetadata = metadata;
    }
  }

  /**
   * Record a view of this manual
   */
  recordView(): void {
    this.viewCount += 1;
    this.lastViewedAt = new Date();
  }

  /**
   * Check if manual needs reprocessing
   * @returns Boolean indicating if manual should be reprocessed
   */
  needsReprocessing(): boolean {
    return (
      this.processingStatus === ManualProcessingStatus.FAILED ||
      (this.processingStatus === ManualProcessingStatus.PROCESSING &&
        this.processingStartedAt &&
        new Date().getTime() - this.processingStartedAt.getTime() > 3600000) // 1 hour timeout
    );
  }

  /**
   * Get manual summary for display purposes
   * @returns Object with key manual information
   */
  getSummary(): Record<string, any> {
    return {
      id: this.id,
      title: this.title,
      version: this.version,
      category: this.category,
      vesselId: this.vesselId,
      pageCount: this.pageCount,
      processingStatus: this.processingStatus,
      isSearchable: this.isSearchable,
      thumbnailUrl: this.thumbnailUrl,
      createdAt: this.createdAt,
    };
  }
}
