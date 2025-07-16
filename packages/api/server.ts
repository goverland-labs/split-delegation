import express, {Request as ExpressRequest, Response as ExpressResponse} from 'express'
import {readdirSync} from 'fs'
import {extname, join} from 'path'

class SimpleRequest {
    url: string
    method: string
    headers: Headers
    body: any

    constructor(url: string, method: string, headers: any, body: any) {
        this.url = url
        this.method = method
        this.headers = new Headers()
        Object.entries(headers).forEach(([k, v]) => {
            if (typeof v === 'string') this.headers.set(k, v)
        })
        this.body = body
    }

    async json() {
        return this.body
    }

    async text() {
        if (typeof this.body === 'string') return this.body
        return JSON.stringify(this.body)
    }
}


const app = express()
app.use(express.json())

function loadRoutesFrom(dir: string, baseRoute = '/api') {
    const entries = readdirSync(dir, {withFileTypes: true})

    // Файлы без [param] — фиксированные роуты
    const fixedFiles = entries.filter(e => e.isFile() && !e.name.includes('['))
    // Файлы с [param] — динамические
    const paramFiles = entries.filter(e => e.isFile() && e.name.includes('['))
    // Поддиректории
    const dirs = entries.filter(e => e.isDirectory())

    for (const file of fixedFiles) {
        registerRoute(join(dir, file.name), `${baseRoute}/${file.name}`)
    }
    for (const file of paramFiles) {
        registerRoute(join(dir, file.name), `${baseRoute}/${file.name}`)
    }
    for (const d of dirs) {
        loadRoutesFrom(join(dir, d.name), `${baseRoute}/${d.name}`)
    }
}

function registerRoute(fullPath: string, routePath: string) {
    if (!['.ts', '.js'].includes(extname(fullPath))) return

    const handlerModule = require(fullPath)
    const handler = handlerModule.POST || handlerModule.default

    if (typeof handler !== 'function') {
        console.warn(`[warn] No POST export (handler function) in ${fullPath}`)
        return
    }

    const expressRoute = routePath
        .replace(/\.(ts|js)$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1')

    app.post(expressRoute, async (req: ExpressRequest, res: ExpressResponse) => {
        try {
            const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`
            const apiReq = new SimpleRequest(fullUrl, req.method, req.headers, req.body)

            const apiRes = await handler(apiReq)

            // Обработка стандартного Response
            if (apiRes instanceof Response || ('status' in apiRes && 'headers' in apiRes)) {
                const status = apiRes.status ?? 200
                apiRes.headers.forEach((value: string, key: string) => {
                    res.setHeader(key, value)
                })
                const body = await apiRes.text()
                res.status(status).send(body)
            } else {
                // Если возвращен простой объект — отдаём json
                res.json(apiRes)
            }
        } catch (err: any) {
            console.error('API handler error:', err)
            res.status(500).json({error: err.message || String(err)})
        }
    })

    console.log(`✅ Loaded route: ${expressRoute}`)
}

loadRoutesFrom(join(__dirname, 'api'))

const port = process.env.PORT ? Number(process.env.PORT) : 3000
const host = '0.0.0.0'

app.listen(port, host, () => {
    console.log(`🚀 Server running on http://${host}:${port}`)
})
