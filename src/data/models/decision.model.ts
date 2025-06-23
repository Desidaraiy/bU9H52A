import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Asset } from "./asset.model";
import { TradeDecisionAction } from "../../types";

@Table({ tableName: "decisions", timestamps: true, underscored: true })
export class Decision extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => Asset)
  @Column(DataType.INTEGER) // ТОЧНО INTEGER!
  asset_id!: number;

  @BelongsTo(() => Asset)
  asset!: Asset;

  @Column({
    type: DataType.ENUM("BUY", "SELL", "HOLD"),
    allowNull: false,
  })
  action!: TradeDecisionAction;

  @Column({
    type: DataType.DECIMAL(20, 8),
    allowNull: true,
  })
  amount!: number | null;

  @Column({
    type: DataType.DECIMAL(20, 8),
    allowNull: true,
  })
  price!: number | null;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 0,
  })
  confidence!: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 0,
  })
  potentialProfit!: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: "NORMAL",
  })
  riskLevel!: string; // 'NORMAL', 'AGGRESSIVE', 'SAFETY'

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  executed!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  requiresConfirmation!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason!: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  executedAt!: Date | null;
}
