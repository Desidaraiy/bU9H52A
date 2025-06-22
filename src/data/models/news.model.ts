import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
} from "sequelize-typescript";

@Table({ tableName: "news", timestamps: true, underscored: true })
export class NewsItem extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  source!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  url!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  summary!: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  publishedAt!: Date;

  @Column({
    type: DataType.DECIMAL(5, 4),
    allowNull: true,
  })
  sentimentScore!: number | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  symbol!: string | null;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata!: Record<string, unknown> | null;
}
