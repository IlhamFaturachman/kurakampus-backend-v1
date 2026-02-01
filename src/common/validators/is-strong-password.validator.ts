import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Strong Password Validator (2025 OWASP Standards)
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // In development, allow simple passwords (min 4 chars)
    if (process.env.NODE_ENV !== 'production') {
      return password.length >= 4;
    }

    // Production: Check minimum length
    if (password.length < 8) {
      return false;
    }

    // Check for uppercase
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Check for lowercase
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      return false;
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
