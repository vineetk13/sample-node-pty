const os = require("os")
const pty = require("node-pty")
var pidusage = require("pidusage")

class PTY {
    constructor(socket, name) {
        this.shell = "bash"

        this.name = name
        this.ptyProcess = null
        this.socket = socket
        this.stopCondition = false

        // Initialize PTY process.
        this.startPtyProcess()
    }

    //Spawn an instance of pty with a selected shell.
    startPtyProcess() {
        this.ptyProcess = pty.spawn(this.shell, [], {
            name: `process-${this.name}`,
            cwd: "/", // Which path should terminal start - HOME
            env: process.env, // Pass environment variables
            cols: 150,
            rows: 25,
        })

        this.ptyProcess.onExit((exitcode, signal) => {
            console.log('------ ON EXIT PTY PROCESS CODE: ', exitcode)
            console.log('------ ON EXIT PTY PROCESS signal: ', signal)

        })

        // Add a "data" event listener.
        this.ptyProcess.onData((data) => {
            // Whenever terminal generates any data, send that output to socket.io client to display on UI
            this.stopCondition = Buffer.byteLength(data) > 1000
            console.log('------ stop condition on pty data:', this.stopCondition)
            if(this.stopCondition){
                this.ptyProcess.pause()
            }
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

        if(this.name === 'adb')
            interval(3000)
    }

    getPid() {
        return this.ptyProcess.pid
    }

    killPtyProcess() {
        this.ptyProcess.kill('SIGINT')
    }

    // Use this function to send in the input to Pseudo Terminal process.
    //  @param {*} data Input from user like command sent from terminal UI

    write(data) {
        this.ptyProcess.write(data)
    }

    sendToClient(data) {
        // Emit data to socket.io client in an event "output"
        this.socket.emit(`${this.name}output`, data, (ackResponse) => {
            if(ackResponse === true){
                this.stopCondition = false
                this.ptyProcess.resume()
            }
        })
    }
}

module.exports = PTY
