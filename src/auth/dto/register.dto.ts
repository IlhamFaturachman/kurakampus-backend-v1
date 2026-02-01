import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';
import { Match } from '../../common/validators/match.validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  username: string;

  @IsString()
  @MinLength(4, { message: 'Password must be at least 4 characters long' })
  @IsStrongPassword()
  password: string;

  @IsString()
  @Match('password', { message: 'Password confirmation does not match' })
  passwordConfirmation: string;

  @IsString({ message: 'First name is required' })
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @IsString({ message: 'Last name is required' })
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @IsBoolean({ message: 'You must agree to the terms and conditions' })
  @Transform(({ value }) => value === true || value === 'true')
  agreeToTerms: boolean;
}
