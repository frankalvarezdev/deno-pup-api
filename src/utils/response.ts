import { Context } from 'oak'

// deno-lint-ignore no-explicit-any
export const apiResponse = (ctx: Context, data: any) => {
    ctx.response.headers.set('Content-Type', 'application/json')
    ctx.response.body = {
        data: data,
        error: null,
    }
}

export class ApiError extends Error {
    status: number
    options: ApiErrorOptions

    constructor(
        message: string,
        public code = 500,
        options: ApiErrorOptions = {}
    ) {
        super(message)
        this.status = code
        this.options = options
    }
}

interface ApiErrorField {
    name: string
    message: string
}

interface ApiErrorOptions {
    fields?: ApiErrorField[]
}

export const apiError = (
    ctx: Context,
    error: string,
    code = 500,
    options: ApiErrorOptions = {}
) => {
    ctx.response.headers.set('Content-Type', 'application/json')
    ctx.response.status = code

    ctx.response.body = {
        data: null,
        error: {
            code: code,
            message: error,
            fields: options.fields,
        },
    }
}
