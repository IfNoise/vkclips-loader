import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Timezone {
  @ApiProperty({
    example: 1,
    description: 'The unique identifier of the timezone',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 'Morning Timezone',
    description: 'The name of the timezone',
  })
  @Column()
  name: string;

  @ApiProperty({ example: 1, description: 'Zone priority number' })
  @Column({ unique: true })
  zone: number;

  @ApiProperty({
    example: 0.5,
    description: 'Video count per hour',
  })
  @Column('real')
  count: number;

  @ApiProperty({ example: 9, description: 'The start hour of the timezone' })
  @Column()
  startHour: number;

  @ApiProperty({ example: 17, description: 'The end hour of the timezone' })
  @Column()
  endHour: number;
}
