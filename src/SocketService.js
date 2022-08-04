// Manage Socket.IO server
const socketIO = require("socket.io")
const { Server } = require("socket.io")

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

        io.on("connection", (socket) => {
            console.log("Client connect to socket.", socket.id)

            this.socket = socket

            this.socket.on("disconnect", () => {
                console.log("Disconnected Socket: ", socket.id)
            })

            // Create a new pty service for espercli when client connects.
            this.espercliPty = new PTYService(this.socket, "espercli")

            const timeoutCommand = (command) => {
                return new Promise((res) => {
                    setTimeout(() => {
                        this.espercliPty.write(command)
                        res("Done")
                    }, 1000)
                })
            }

            this.socket.on("preconfigure", async (callback) => {
                await timeoutCommand(`espercli configure -s\n`)
                await timeoutCommand(`gojek\n`)
                
                await timeoutCommand(`I5IbgZUHxBXqAiK7zsKnXeY3hm0bD5\n`)
                
                setTimeout(() => {
                    callback("Esper CLI configuration successful with your enterprise details")
                    setSessionReady()
                }, 1000)
            })


            this.socket.on("initialize", async (deviceName, callback) => {
                await timeoutCommand(`espercli secureadb connect -d ${deviceName}\n`)
                callback(
                    "Esper CLI initialized with device name for secureadb connect"
                )
                setSessionReady()
            })

            const setSessionReady = () => {
                this.adbPty = new PTYService(this.socket)
                this.socket.emit("sessionReady")
                // Listen to input after sessionReady and adbPty is started
                this.socket.on("adbinput", (input) => {
                    this.adbPty.write(input)
                })
            }

            
        })
    }
}

module.exports = SocketService
