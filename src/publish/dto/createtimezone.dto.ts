import { IsString, IsInt, Min, Max, IsBase32, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimezoneDto {
  @ApiProperty({ description: 'Name of the timezone' })
  @IsString()
  readonly name: string;

  @ApiProperty({ description: 'Zone number', maximum: 5 })
  @IsInt()
  @Max(5)
  @Min(0)
  readonly zone: number;

  @ApiProperty({ description: 'Video per houre' })
  @IsNumber()
  readonly count: number;

  @ApiProperty({ description: 'Start hour', minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  readonly startHour: number;

  @ApiProperty({ description: 'End hour', minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  readonly endHour: number;
}
