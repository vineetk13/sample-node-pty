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

            this.socket.on("preconfigure", (callback) => {
                this.espercliPty.write(`espercli configure -s\n`)
                this.espercliPty.write(`gojek\n`)
                this.espercliPty.write(`I5IbgZUHxBXqAiK7zsKnXeY3hm0bD5\n`)
                callback(
                    "Esper CLI configuration successful with your enterprise details"
                )
            })


            this.socket.on("initialize", (deviceName, callback) => {
                this.espercliPty.write(`espercli secureadb connect -d ${deviceName}`)
                callback(
                    "Esper CLI initialized with device name for secureadb connect"
                )
                setSessionReady()
            })

            const setSessionReady = () => {
                this.adbPty = new PTYService(this.socket)
                this.socket.emit("sessionReady")
            }

            // Listen to input after sessionReady and adbPty is started
            this.socket.on("adbinput", (input) => {
                this.adbPty.write(input)
            })
        })
    }
}

module.exports = SocketService
