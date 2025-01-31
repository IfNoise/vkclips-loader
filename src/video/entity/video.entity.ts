import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Video {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    example: 1,
    description: 'The unique identifier of the video',
  })
  id: number;

  @Column()
  @ApiProperty({ example: 'published', description: 'The status of the video' })
  status: string;

  @Column()
  @ApiProperty({
    example: 'http://example.com/video.mp4',
    description: 'The URL of the video',
  })
  url: string;

  @Column()
  @ApiProperty({
    example: '/path/to/video.mp4',
    description: 'The file path of the video',
  })
  file_path: string;

  @Column()
  @ApiProperty({
    example: '/path/to/preview.jpg',
    description: 'The preview image path of the video',
  })
  preview_path: string;

  @Column()
  @ApiProperty({
    example: 100,
    description: 'The number of views the video has',
  })
  views: number;

  @Column()
  @ApiProperty({
    example: 10,
    description: 'The number of likes the video has',
  })
  likes: number;

  @Column()
  @ApiProperty({
    example: 5,
    description: 'The number of comments the video has',
  })
  comments: number;

  @Column()
  @ApiProperty({
    example: 5,
    description: 'User rating of the video 0-5',
  })
  rating: number;

  @Column()
  @ApiProperty({
    example: 1627849200,
    description: 'The date the video was added (timestamp)',
  })
  addedDate: number;

  @Column()
  @ApiProperty({
    example: 1627935600,
    description: 'The date the video was published (timestamp)',
  })
  publishDate: number;
}
