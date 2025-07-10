import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';

@Table({ 
  tableName: 'global_fee_versions', 
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    }
  ]
})
export class GlobalFeeVersion extends Model<GlobalFeeVersion> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'user_id',
  })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: '1.0.0',
  })
  declare version: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'major_version',
  })
  declare majorVersion: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'minor_version',
  })
  declare minorVersion: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'patch_version',
  })
  declare patchVersion: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'change_description',
  })
  declare changeDescription?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'changed_by_user_id',
  })
  declare changedByUserId?: number;

  @BelongsTo(() => User, { foreignKey: 'changedByUserId' })
  declare changedByUser?: User;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    field: 'affected_fee_types',
  })
  declare affectedFeeTypes?: string[];

  /**
   * Increments the minor version (e.g., 1.0.0 -> 1.1.0)
   */
  incrementMinorVersion(): void {
    this.minorVersion += 1;
    this.patchVersion = 0; // Reset patch version
    this.updateVersionString();
  }

  /**
   * Increments the major version (e.g., 1.0.0 -> 2.0.0)
   */
  incrementMajorVersion(): void {
    this.majorVersion += 1;
    this.minorVersion = 0; // Reset minor version
    this.patchVersion = 0; // Reset patch version
    this.updateVersionString();
  }

  /**
   * Increments the patch version (e.g., 1.0.0 -> 1.0.1)
   */
  incrementPatchVersion(): void {
    this.patchVersion += 1;
    this.updateVersionString();
  }

  /**
   * Updates the version string based on individual version numbers
   */
  private updateVersionString(): void {
    this.version = `${this.majorVersion}.${this.minorVersion}.${this.patchVersion}`;
  }

  /**
   * Sets version from string (e.g., "1.2.3")
   */
  setVersionFromString(versionString: string): void {
    const parts = versionString.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid version format. Expected format: x.y.z');
    }

    this.majorVersion = parseInt(parts[0], 10);
    this.minorVersion = parseInt(parts[1], 10);
    this.patchVersion = parseInt(parts[2], 10);
    this.version = versionString;
  }

  /**
   * Adds a fee type to the affected fee types list
   */
  addAffectedFeeType(feeType: string): void {
    if (!this.affectedFeeTypes) {
      this.affectedFeeTypes = [];
    }
    if (!this.affectedFeeTypes.includes(feeType)) {
      this.affectedFeeTypes.push(feeType);
    }
  }

  /**
   * Resets the affected fee types list
   */
  resetAffectedFeeTypes(): void {
    this.affectedFeeTypes = [];
  }
} 