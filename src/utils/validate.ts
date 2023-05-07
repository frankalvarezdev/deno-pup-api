import { Context } from 'oak'
import { ZodType } from 'zod'
import { ApiError } from '@src/utils/response.ts'

export const validateBody = async (ctx: Context, validator: ZodType) => {
    const body = ctx.request.body()
    const value = await body.value

    try {
        return validator.parse(value)
    } catch (error) {
        const issues = error.issues
        throw new ApiError('Validation error', 400, {
            // deno-lint-ignore no-explicit-any
            fields: issues.map((issue: any) => ({
                name: issue.path.join('.'),
                message: issue.message,
            })),
        })
    }
}
