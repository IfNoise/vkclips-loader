import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class VideoUpdateDto {
  @ApiPropertyOptional({ description: 'Status of the video' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Number of views' })
  @IsOptional()
  @IsInt()
  @Min(0)
  views?: number;

  @ApiPropertyOptional({ description: 'Number of likes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  likes?: number;

  @ApiPropertyOptional({ description: 'Number of comments' })
  @IsOptional()
  @IsInt()
  @Min(0)
  comments?: number;

  @ApiPropertyOptional({ description: 'Number of comments' })
  @IsOptional()
  @IsInt()
  rating?: number;

  @ApiPropertyOptional({ description: 'Publish date in Unix timestamp' })
  @IsOptional()
  @IsNumber()
  publishDate?: number;
}
