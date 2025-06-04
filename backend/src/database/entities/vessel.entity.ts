import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
  Unique,
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
  Matches,
  IsLatitude,
  IsLongitude,
  IsPositive,
  IsDate,
} from 'class-validator';
import { User } from './user.entity';
import { Manual } from './manual.entity';
import { Expose, Transform } from 'class-transformer';

/**
 * Vessel status enum for tracking operational state
 */
export enum VesselStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  IN_SERVICE = 'in_service',
  IN_MAINTENANCE = 'in_maintenance',
  DECOMMISSIONED = 'decommissioned',
}

/**
 * Vessel type enum for categorizing vessel purposes
 */
export enum VesselType {
  CARGO = 'cargo',
  TANKER = 'tanker',
  PASSENGER = 'passenger',
  FISHING = 'fishing',
  SERVICE = 'service',
  OFFSHORE = 'offshore',
  SPECIAL_PURPOSE = 'special_purpose',
  OTHER = 'other',
}

/**
 * Vessel entity representing maritime vessels in the MarineAI system
 * Includes identification, specifications, ownership, and operational data
 */
@Entity('vessels')
@Unique(['imoNumber'])
@Unique(['mmsi'])
@Check(`"imoNumber" ~ '^[0-9]{7}$'`)
export class Vessel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Vessel identification
  @Column({ length: 255 })
  @IsNotEmpty()
  @IsString()
  @Length(2, 255)
  @Index()
  name: string;

  @Column({ nullable: true, length: 7 })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{7}$/, {
    message: 'IMO number must be exactly 7 digits',
  })
  @Index()
  imoNumber?: string;

  @Column({ nullable: true, length: 9 })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{9}$/, {
    message: 'MMSI must be exactly 9 digits',
  })
  mmsi?: string;

  @Column({ nullable: true, length: 10 })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  callSign?: string;

  // Vessel specifications
  @Column({
    type: 'enum',
    enum: VesselType,
    default: VesselType.OTHER,
  })
  @IsEnum(VesselType)
  type: VesselType;

  @Column({ nullable: true, length: 100 })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  flag?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  yearBuilt?: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  grossTonnage?: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  deadweightTonnage?: number;

  @Column({ nullable: true, type: 'decimal', precision: 8, scale: 2 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  lengthOverall?: number;

  @Column({ nullable: true, type: 'decimal', precision: 8, scale: 2 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  beam?: number;

  @Column({ nullable: true, type: 'decimal', precision: 8, scale: 2 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  draft?: number;

  // Ownership and management information
  @ManyToOne(() => User, (user) => user.vessels, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  operatorName?: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  classificationSociety?: string;

  // Geographic information
  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  homePort?: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  @IsOptional()
  @IsLatitude()
  currentLatitude?: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
  @IsOptional()
  @IsLongitude()
  currentLongitude?: number;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  positionLastUpdated?: Date;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  currentPort?: string;

  // Status tracking
  @Column({
    type: 'enum',
    enum: VesselStatus,
    default: VesselStatus.ACTIVE,
  })
  @IsEnum(VesselStatus)
  status: VesselStatus;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  statusLastUpdated?: Date;

  @Column({ nullable: true, length: 1000 })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  statusNotes?: string;

  // Additional information
  @Column({ nullable: true, length: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  imageUrl?: string;

  @Column({ nullable: true, type: 'jsonb' })
  @IsOptional()
  additionalDetails?: Record<string, any>;

  // Relationships
  @OneToMany(() => Manual, (manual) => manual.vessel)
  manuals: Manual[];

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

  /**
   * Get vessel's age in years
   */
  @Expose()
  get age(): number | null {
    if (!this.yearBuilt) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - this.yearBuilt;
  }

  /**
   * Check if vessel has valid identification
   * @returns Boolean indicating if vessel has at least one valid identifier
   */
  hasValidIdentification(): boolean {
    return !!(this.imoNumber || this.mmsi || this.callSign);
  }

  /**
   * Get vessel's current position as GeoJSON
   * @returns GeoJSON point object or null if position is not available
   */
  getCurrentPositionGeoJson(): { type: string; coordinates: number[] } | null {
    if (!this.currentLatitude || !this.currentLongitude) {
      return null;
    }
    
    return {
      type: 'Point',
      coordinates: [this.currentLongitude, this.currentLatitude]
    };
  }

  /**
   * Check if vessel is currently at sea (not in port)
   * @returns Boolean indicating if vessel is at sea
   */
  isAtSea(): boolean {
    return !this.currentPort && !!this.currentLatitude && !!this.currentLongitude;
  }

  /**
   * Update vessel position
   * @param latitude New latitude
   * @param longitude New longitude
   * @param port Optional port name if vessel is in port
   */
  updatePosition(latitude: number, longitude: number, port?: string): void {
    this.currentLatitude = latitude;
    this.currentLongitude = longitude;
    this.currentPort = port || null;
    this.positionLastUpdated = new Date();
  }

  /**
   * Update vessel status
   * @param status New vessel status
   * @param notes Optional notes about status change
   */
  updateStatus(status: VesselStatus, notes?: string): void {
    this.status = status;
    this.statusNotes = notes || null;
    this.statusLastUpdated = new Date();
  }

  /**
   * Get vessel summary for display purposes
   * @returns Object with key vessel information
   */
  getSummary(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      imoNumber: this.imoNumber,
      type: this.type,
      flag: this.flag,
      status: this.status,
      yearBuilt: this.yearBuilt,
      age: this.age,
      currentPort: this.currentPort || (this.isAtSea() ? 'At Sea' : 'Unknown'),
      manualCount: this.manuals?.length || 0
    };
  }
}
