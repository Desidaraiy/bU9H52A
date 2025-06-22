import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
} from "sequelize-typescript";

@Table({ tableName: "assets" })
export class Asset extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    unique: true,
  })
  symbol!: string;

  @Column({
    type: DataType.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0,
  })
  amount!: number;

  @Column({
    type: DataType.DECIMAL(20, 8),
    allowNull: false,
    field: "entry_price",
  })
  entryPrice!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: "entry_time",
  })
  entryTime!: Date;

  @Column({
    type: DataType.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0,
    field: "current_value",
  })
  currentValue!: number;
}
