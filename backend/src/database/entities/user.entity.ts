import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  Index,
  Check,
  Unique,
} from 'typeorm';
import { Exclude, Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
  IsBoolean,
  IsDate,
  ValidateIf,
} from 'class-validator';
import * as bcrypt from 'bcrypt';
import { Vessel } from './vessel.entity';

/**
 * User role enum for role-based access control
 */
export enum UserRole {
  ADMIN = 'admin',
  ENGINEER = 'engineer',
  VIEWER = 'viewer',
}

/**
 * User entity representing users in the MarineAI system
 * Includes authentication, profile data, and role-based access control
 */
@Entity('users')
@Unique(['email'])
@Check(`"email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  firstName: string;

  @Column({ length: 100 })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  lastName: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  @IsEmail()
  @Index()
  email: string;

  @Column({ select: false })
  @Exclude({ toPlainOnly: true })
  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ default: false })
  @IsBoolean()
  isActive: boolean;

  @Column({ default: false })
  @IsBoolean()
  isEmailVerified: boolean;

  // Profile information
  @Column({ nullable: true, length: 20 })
  @IsOptional()
  @IsPhoneNumber(null)
  phoneNumber?: string;

  @Column({ nullable: true, length: 100 })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  company?: string;

  @Column({ nullable: true, length: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  bio?: string;

  @Column({ nullable: true, length: 255 })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Column({ nullable: true, length: 50 })
  @IsOptional()
  @IsString()
  timezone?: string;

  @Column({ nullable: true, length: 10 })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  // Email verification
  @Column({ nullable: true, length: 64 })
  @Exclude({ toPlainOnly: true })
  emailVerificationToken?: string;

  @Column({ nullable: true, type: 'timestamp' })
  @Exclude({ toPlainOnly: true })
  emailVerificationTokenExpiresAt?: Date;

  // Password reset
  @Column({ nullable: true, length: 64 })
  @Exclude({ toPlainOnly: true })
  passwordResetToken?: string;

  @Column({ nullable: true, type: 'timestamp' })
  @Exclude({ toPlainOnly: true })
  passwordResetTokenExpiresAt?: Date;

  // Security and access control
  @Column({ default: 0 })
  @Exclude({ toPlainOnly: true })
  failedLoginAttempts: number;

  @Column({ nullable: true, type: 'timestamp' })
  @Exclude({ toPlainOnly: true })
  lastLoginAt?: Date;

  @Column({ nullable: true, length: 45 })
  @Exclude({ toPlainOnly: true })
  lastLoginIp?: string;

  @Column({ nullable: true, type: 'jsonb' })
  @Exclude({ toPlainOnly: true })
  settings?: Record<string, any>;

  // Refresh token for JWT authentication
  @Column({ nullable: true, length: 255 })
  @Exclude({ toPlainOnly: true })
  refreshToken?: string;

  @Column({ nullable: true, type: 'timestamp' })
  @Exclude({ toPlainOnly: true })
  refreshTokenExpiresAt?: Date;

  // Relationships
  @OneToMany(() => Vessel, (vessel) => vessel.owner)
  vessels: Vessel[];

  // Audit fields
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: Date;

  @Column({ nullable: true, length: 36 })
  @Exclude({ toPlainOnly: true })
  createdBy?: string;

  @Column({ nullable: true, length: 36 })
  @Exclude({ toPlainOnly: true })
  updatedBy?: string;

  @Column({ nullable: true, length: 36 })
  @Exclude({ toPlainOnly: true })
  deletedBy?: string;

  /**
   * Hash password before inserting or updating
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash the password if it has been modified
    if (this.password && this.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  /**
   * Compare password with stored hash
   * @param password Plain text password to compare
   * @returns Boolean indicating if password matches
   */
  async comparePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  /**
   * Generate a secure random token for email verification or password reset
   * @returns Random token string
   */
  static generateSecureToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Get full name by combining first and last name
   */
  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Get user's initials for avatar placeholder
   */
  @Expose()
  get initials(): string {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Check if user has a specific role
   * @param role Role to check
   * @returns Boolean indicating if user has the role
   */
  hasRole(role: UserRole): boolean {
    if (this.role === UserRole.ADMIN) return true; // Admin has all roles
    return this.role === role;
  }

  /**
   * Check if user's email verification token is valid
   * @param token Token to verify
   * @returns Boolean indicating if token is valid and not expired
   */
  isEmailVerificationTokenValid(token: string): boolean {
    if (!this.emailVerificationToken || !this.emailVerificationTokenExpiresAt) {
      return false;
    }
    
    const now = new Date();
    return (
      this.emailVerificationToken === token && 
      this.emailVerificationTokenExpiresAt > now
    );
  }

  /**
   * Check if user's password reset token is valid
   * @param token Token to verify
   * @returns Boolean indicating if token is valid and not expired
   */
  isPasswordResetTokenValid(token: string): boolean {
    if (!this.passwordResetToken || !this.passwordResetTokenExpiresAt) {
      return false;
    }
    
    const now = new Date();
    return (
      this.passwordResetToken === token && 
      this.passwordResetTokenExpiresAt > now
    );
  }
}
