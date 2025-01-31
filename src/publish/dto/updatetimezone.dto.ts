import { IsInt, IsString, Min, Max, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating a Timezone entity
 */
export class UpdateTimezoneDto {
  @ApiProperty({ description: 'Name of the timezone' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Zone popularity' })
  @IsNumber()
  @Min(0)
  @Max(4)
  zone: number;

  @ApiProperty({ description: 'Video per hour' })
  @IsInt()
  count: number;

  @ApiProperty({ description: 'Start hour of the timezone' })
  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @ApiProperty({ description: 'End hour of the timezone' })
  @IsInt()
  @Min(0)
  @Max(23)
  endHour: number;
}
