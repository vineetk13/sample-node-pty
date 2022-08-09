// Manage Socket.IO server
const socketIO = require("socket.io")
const { Server } = require("socket.io")
const { exec, spawn } = require("child_process")
const readline = require('readline')

const PTYService = require("./PTYService")

const ab2str = (buf) => {
      return String.fromCharCode.apply(null, new Uint8Array(buf))
}
class SocketService {
    constructor() {
        this.socket = null
        this.espercliPty = null
        this.adbPty = null
    }

    attachServer(server) {
        if (!server) {
            throw new Error("Server not found...")
        }

        const io = new Server(server, {
            cors: {
                origin: "http://localhost:3000",
            },
        })
        console.log("Created socket server. Waiting for client connection.")

        const initialize = (deviceName) => {
            io.emit("startingInit")
            const deviceinitProcess = spawn("espercli", ["secureadb", "connect", "-d", deviceName], { cwd: "/" })

            let deviceinitProcessOutput = ""
            let deviceinitProcessError = ""

            // close happens after process exit and all attached stdio streams have been closed
            deviceinitProcess.on("close", function (code, signal) {
                console.log(`deviceinitProcess process exited with code ${code} and signal ${signal}`)
                console.log('----- ERrror mesg: ', deviceinitProcessError)

                // On successfulExit
                if(code === 0 && signal === null) {
                    if(deviceinitProcessError === '') {
                        io.emit("initialized", { 
                            success: true, 
                            message: "Success", 
                            data: deviceinitProcessOutput
                        })
                    } else {
                        io.emit("initialized", { 
                            success: false, 
                            message: `Failed`,
                            data: deviceinitProcessError
                        })
                    }
                        
                }
                else {
                    io.emit("initialized", { 
                        success: false, 
                        message: `Failed`,
                        data: deviceinitProcessError
                    })
                }
            })

            deviceinitProcess.stdout.on("data", (data) => {
                deviceinitProcessOutput = data.toString()
                // io.emit("output", data.toString())
                console.log(`-------------init process stdout:\n${data}`)
            })
            deviceinitProcess.stderr.on("data", (data) => {
                if(deviceinitProcessError === ''){
                    deviceinitProcessError = data.toString()
                    deviceinitProcess.kill()
                }
                console.error(`---------init process stderr:\n${data}`)
            })
        }

        const preconfigure = (socket) => {
            const preconfigProcess = spawn("espercli", ["configure", "-s"], { cwd: "/" })
            preconfigProcess.stdin.setEncoding('utf-8')
            preconfigProcess.stdout.pipe(process.stdout);

            preconfigProcess.stdin.write("sbipl\n")
            preconfigProcess.stdin.write("7R8Ke5SNyOYx0N2NzC9XcPlbqTQJuG\n")
            preconfigProcess.stdin.end()

            let preconfigProcessOutput = ""
            let preconfigProcessError = ""

            preconfigProcess.on("exit", function (code, signal) {
                console.log(`preconfigProcess process exited with code ${code} and signal ${signal}`)
                
                // On successfulExit
                if(code === 0 && signal === null) {
                    socket.emit("preconfigured", { 
                        success: true, 
                        message: "Successfully configured espercli with your credentials",
                        data: preconfigProcessOutput
                    }, (deviceName, connected) => {
                        if(connected)
                            // Start device initiliation after client's ack'ment
                            initialize(deviceName)
                    })
                }
                else {
                    socket.emit("preconfigured", { 
                        success: false, 
                        message: `preconfigProcess process exited with code ${code} and signal ${signal}`,
                        data: preconfigProcessError
                    })
                }
            })

            preconfigProcess.stdout.on("data", (data) => {
                preconfigProcessOutput = data.toString()
                console.log(`-------------preconf process stdout:\n${ab2str(data)}`)
            })
            preconfigProcess.stderr.on("data", (data) => {
                preconfigProcessError = data.toString()
                // console.error(`---------preconf process stderr:\n${data}`)
            })
        }

        io.on("connection", (socket) => {
            console.log("Client connect to socket.", socket.id)

            this.socket = socket
            console.log('--------- SERVER SOCKET: ', socket.connected)

            this.socket.on("disconnect", () => {
                console.log("Disconnected Socket: ", socket.id)
                if (this.adbPty !== null) {
                    this.adbPty.killPtyProcess()
                }
            })

            if(socket.connected)
                preconfigure(this.socket)

            const timeoutCommand = (command) => {
                return new Promise((res) => {
                    setTimeout(() => {
                        this.espercliPty.write(command)
                        res("Done")
                    }, 1000)
                })
            }

            this.socket.on("initialize", async (deviceName, callback) => {
                await timeoutCommand(
                    `espercli secureadb connect -d ${deviceName}\n`
                )
                callback(
                    "Esper CLI initialized with device name for secureadb connect"
                )
                setSessionReady()
            })

            this.socket.on("adbinput", (input) => {
                console.log("-----adb pty input: ", input)
                if (this.adbPty !== null) this.adbPty.write(input)
            })

            const setSessionReady = () => {
                this.adbPty = new PTYService(this.socket)
                this.socket.emit("sessionReady")
                // Listen to input after sessionReady and adbPty is started
            }
        })
    }
}

module.exports = SocketService
