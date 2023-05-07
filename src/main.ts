import 'dotenv/load.ts'
import {
    Configuration,
    Pup,
    Process,
} from 'https://deno.land/x/pup@1.0.0-beta.21/mod.ts'
import { oakCors } from 'cors'
import { Application, Router } from 'oak'
import { ApiError, apiError, apiResponse } from '@src/utils/response.ts'
import { z } from 'zod'
import { validateBody } from '@src/utils/validate.ts'
import { generateCmd } from '@src/utils/cmd.ts'

// crea la carpeta ./logs
await Deno.mkdir('./logs', { recursive: true })

const app = new Application()

app.use(oakCors({ origin: '*' }))
app.use(async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        const status = typeof err.status === 'number' ? err.status : 500
        apiError(ctx, err?.message || 'Internal server error', Number(status), {
            fields: err?.options?.fields || [],
        })
    }
})

const configuration: Configuration = {
    logger: {},
    processes: [],
}
const pup = new Pup(configuration)
pup.init()

const getProcesses = () => {
    return pup.allProcesses().map((process) => {
        return process.config
    })
}

const router = new Router()
router.get('/v1/processes', (ctx) => {
    const processes = getProcesses()
    apiResponse(ctx, processes)
})

router.post('/v1/processes/start', async (ctx) => {
    const data = await validateBody(
        ctx,
        z.object({
            id: z.number(),
            cmd: z.string(),
            cwd: z.string().optional(),
        })
    )
    const cmd = generateCmd(data.cmd)
    const id = String(data.id)

    // verificamos de que no exista un proceso con el mismo id
    const processes = pup.allProcesses()
    const exists = processes.find((process) => process.config.id === id)
    if (exists) {
        // si existe lo detiene y lo elimina de los procesos
        pup.stop(id, 'api')
        pup.processes.splice(pup.processes.indexOf(exists), 1)
    }

    const process = new Process(pup, {
        id: id,
        cmd,
        cwd: data?.cwd,
        logger: {
            stderr: `./logs/${data.id}.log`,
            stdout: `./logs/${data.id}.log`,
            console: false,
        },
    })
    pup.processes.push(process)
    pup.start(id, 'api')

    apiResponse(ctx, process.config)
})

router.put('/v1/processes/:id/stop', (ctx) => {
    const id = ctx.params.id
    const process = pup
        .allProcesses()
        .find((process) => process.config.id === id)
    if (!process) {
        throw new ApiError('Process not found', 404)
    }
    pup.stop(id, 'api')
    apiResponse(ctx, process.config)
})

router.put('/v1/processes/:id/restart', (ctx) => {
    const id = ctx.params.id
    const process = pup
        .allProcesses()
        .find((process) => process.config.id === id)
    if (!process) {
        throw new ApiError('Process not found', 404)
    }
    pup.restart(id, 'api')
    apiResponse(ctx, process.config)
})

// delete process
router.delete('/v1/processes/:id', (ctx) => {
    const id = ctx.params.id
    const process = pup
        .allProcesses()
        .find((process) => process.config.id === id)
    if (!process) {
        throw new ApiError('Process not found', 404)
    }
    pup.stop(id, 'api')
    pup.processes.splice(pup.processes.indexOf(process), 1)
    apiResponse(ctx, process.config)
})

// api para obtener los logs de un proceso
router.get('/v1/processes/:id/logs', async (ctx) => {
    const id = ctx.params.id
    const process = pup
        .allProcesses()
        .find((process) => process.config.id === id)
    if (!process) {
        throw new ApiError('Process not found', 404)
    }

    try {
        const log = await Deno.readTextFile(`./logs/${id}.log`)
        apiResponse(ctx, log)
    } catch (error) {
        const message = error?.message || 'Log not found'
        throw new ApiError(message, 404)
    }
})

app.use(router.routes())

const port = Number(Deno.env.get('PORT')) || 5566
app.addEventListener('listen', () => {
    console.log(`Server listening on port http://localhost:${port}`)
})

await app.listen({ port })
