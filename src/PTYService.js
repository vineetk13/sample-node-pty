const os = require("os")
const pty = require("node-pty")
var pidusage = require("pidusage")

class PTY {
    constructor(socket, name) {
        this.shell = "bash"

        this.ptyProcess = null
        this.socket = socket

        // Initialize PTY process.
        this.startPtyProcess()
    }

    //Spawn an instance of pty with a selected shell.
    startPtyProcess() {
        this.ptyProcess = pty.spawn(this.shell, [], {
            name: `process-${this.name}`,
            cwd: "/", // Which path should terminal start - HOME
            env: process.env, // Pass environment variables
            cols: 250,
            // rows: 25,
        })

        // Add a "data" event listener.
        this.ptyProcess.onData((data) => {
            // Whenever terminal generates any data, send that output to socket.io client to display on UI
            this.sendToClient(data)
        })

        const compute = async () => {
            const stats = await pidusage(this.ptyProcess.pid)
            this.socket.emit("resourceStats", stats)
        }

        // Compute resource statistics every 3 seconds:
        const interval = async (time) => {
            setTimeout(async () => {
                await compute()
                interval(time)
            }, time)
        }

        interval(3000)
    }

    killPtyProcess() {
        this.ptyProcess.kill()
    }

    // Use this function to send in the input to Pseudo Terminal process.
    //  @param {*} data Input from user like command sent from terminal UI

    write(data) {
        this.ptyProcess.write(data)
    }

    sendToClient(data) {
        // Emit data to socket.io client in an event "output"
        this.socket.emit("output", data)
    }
}

module.exports = PTY
