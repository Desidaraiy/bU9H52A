import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  HasMany,
  Unique,
} from "sequelize-typescript";
import { Decision } from "./decision.model";

@Table({ tableName: "assets" })
export class Asset extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @Column(DataType.STRING(20))
  symbol!: string;

  @HasMany(() => Decision)
  decisions!: Decision[];

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
