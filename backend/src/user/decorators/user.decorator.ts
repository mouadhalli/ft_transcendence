import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (keyName: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const { user } = request
    if (keyName)
      return user[keyName]
    return user
  }
)