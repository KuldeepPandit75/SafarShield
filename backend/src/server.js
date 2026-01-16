import http from 'http'
import app from './app.js'
import 'dotenv/config'
import { startAllJobs } from './jobs/scheduler.js'

const port = process.env.PORT || 2000;

const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
    console.log(`Server is listening on port ${port}`)

    // Start background jobs for Tourist Safety System
    startAllJobs();
})

