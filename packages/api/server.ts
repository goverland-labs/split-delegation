import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'

import {POST as addressPOST} from './api/v1/[space]/[tag]/[address]'
import {POST as topDelegatesPOST} from './api/v1/[space]/[tag]/top-delegates'
import {POST as votingPowerPOST} from './api/v1/[space]/[tag]/voting-power'

const {Request} = global

const app = express()
app.use(cors())
app.use(helmet())
app.use(bodyParser.json())

function toFetchRequest(req: express.Request, queryParams: Record<string, string> = {}) {
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const url = new URL(req.originalUrl, baseUrl)

    for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value)
    }

    return new Request(url.toString(), {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    })
}

async function handle(req: express.Request, res: express.Response, handler: (req: Request) => Promise<Response>, queryParams: Record<string, string>) {
    try {
        const request = toFetchRequest(req, queryParams)
        const response = await handler(request)
        const data = await response.json()
        res.status(response.status).json(data)
    } catch (err: any) {
        console.error('Error:', err)
        res.status(500).json({error: 'Internal Server Error', details: err.message})
    }
}

app.all('/api/v1/:space/:tag/top-delegates', (req, res) =>
    handle(req, res, topDelegatesPOST, req.params)
)

app.all('/api/v1/:space/:tag/voting-power', (req, res) =>
    handle(req, res, votingPowerPOST, req.params)
)

app.all('/api/v1/:space/:tag/:address', (req, res) =>
    handle(req, res, addressPOST, req.params)
)

const port = process.env.PORT ? Number(process.env.PORT) : 3000
const host = '0.0.0.0'

app.listen(port, host, () => {
    console.log(`🚀 Server running on http://${host}:${port}`)
})
