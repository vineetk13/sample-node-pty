// Manage Socket.IO server
const socketIO = require("socket.io")
const { Server } = require("socket.io")
const { exec, spawn } = require("child_process")
const readline = require('readline')

const PTYService = require("./PTYService")

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

        const initialize = () => {
            const deviceinitProcess = spawn("espercli", ["secureadb", "connect", "-d", "EPR-NZN-AAAWA"], { cwd: "/" })

            let deviceinitProcessOutput = ""
            let deviceinitProcessError = ""

            deviceinitProcess.on("exit", function (code, signal) {
                console.log(`deviceinitProcess process exited with code ${code} and signal ${signal}`)

                // On successfulExit
                if(code === 0 && signal === null) {
                    socket.emit("initialized", { 
                        success: true, 
                        message: "Success", 
                        data: deviceinitProcessOutput
                    })
                }
                else {
                    socket.emit("initialized", { 
                        success: false, 
                        message: `Failed`,
                        data: deviceinitProcessError
                    })
                }
            })

            deviceinitProcess.stdout.on("data", (data) => {
                preconfigProcessOutput = data.toString()
                console.log(`-------------init process stdout:\n${data}`)
            })
            deviceinitProcess.stderr.on("data", (data) => {
                preconfigProcessError = data.toString()
                console.error(`---------init process stderr:\n${data}`)
            })
        }

        io.on("connection", (socket) => {
            console.log("Client connect to socket.", socket.id)

            this.socket = socket

            this.socket.on("disconnect", () => {
                console.log("Disconnected Socket: ", socket.id)
                if (this.adbPty !== null) {
                    this.adbPty.killPtyProcess()
                }
            })

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
                    }, () => {
                        // Start device initiliation after client's ack'ment
                        initialize()
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
                // console.log(`-------------preconf process stdout:\n${data}`)
            })
            preconfigProcess.stderr.on("data", (data) => {
                preconfigProcessError = data.toString()
                // console.error(`---------preconf process stderr:\n${data}`)
            })

            


            // Create a new pty service for espercli when client connects.
            // this.espercliPty = new PTYService(this.socket, "espercli")

            const timeoutCommand = (command) => {
                return new Promise((res) => {
                    setTimeout(() => {
                        this.espercliPty.write(command)
                        res("Done")
                    }, 1000)
                })
            }

            // this.socket.on("preconfigure", async (callback) => {
            //     await timeoutCommand(`espercli configure -s\n`)
            //     await timeoutCommand(`gojek\n`)

            //     await timeoutCommand(`I5IbgZUHxBXqAiK7zsKnXeY3hm0bD5\n`)

            //     setTimeout(() => {
            //         callback(
            //             "Esper CLI configuration successful with your enterprise details"
            //         )
            //     }, 1000)
            // })

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
