import { ValidationPipe } from '@nestjs/common';
import { ForgotPasswordDto } from './forgot-password.dto';
import { RegisterDto } from './register.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true });
const validate = (metatype: new () => object, value: object) =>
  pipe.transform(value, { type: 'body', metatype });

describe('auth DTOs', () => {
  // Regression: a required `username` here 400'd every forgot-password request.
  it('accepts an email-only forgot-password body', async () => {
    await expect(
      validate(ForgotPasswordDto, { email: 'a@school.org' }),
    ).resolves.toMatchObject({ email: 'a@school.org' });
  });

  it('rejects registration passwords under 8 characters', async () => {
    await expect(
      validate(RegisterDto, {
        username: 'pilot',
        email: 'p@school.org',
        password: 'short',
      }),
    ).rejects.toThrow();
  });
});
