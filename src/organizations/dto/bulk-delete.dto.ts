import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of organization UUIDs to delete',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
    type: [String],
  })
  @IsArray({ message: 'IDs harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal 1 ID harus disertakan' })
  @IsUUID('4', {
    each: true,
    message: 'Setiap ID harus berupa UUID yang valid',
  })
  ids: string[];
}
