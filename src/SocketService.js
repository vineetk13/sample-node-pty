// Manage Socket.IO server
const socketIO = require("socket.io")
const { Server } = require("socket.io")
const { exec, spawn } = require("child_process")
const readline = require("readline")
const concat = require('concat-stream');

const PTYService = require("./PTYService")
// const {  } = require("process")

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
            const deviceinitProcess = spawn(
                "espercli",
                ["-D", "secureadb", "connect", "-d", deviceName],
                { cwd: "/", stdio: [stdin, 'pipe', 'pipe'], shell: true }
            )
            // const deviceinitProcess = spawn("espercli", ["token", "show"], {cwd: '/'})
            // deviceinitProcess.stdout.pipe(process.stdout)

            let deviceinitProcessOutput = ""
            let deviceinitProcessError = ""

            deviceinitProcess.stdout.pipe(concat(function(data) {
                // all your data ready to be used.
                console.log('----- concat data: ', data.toString())
            }))

            deviceinitProcess.stdout.on('end', () => {
                console.log('----- STDOUT ON END -----')
            })

            // deviceinitProcess.on('message', (msg) => {
            //     console.log('deviceinitProcess PARENT got message:', msg);
            // })

            // deviceinitProcess.stdout.on('readable', ())

            // deviceinitProcess.stdout.on("data", (data) => {
            //     // deviceinitProcessOutput = data.toString()
            //     // if(!data.toString().includes('ERROR'))
            //     // io.emit("initialized", {
            //     //     success: true,
            //     //     message: "Success",
            //     //     data: deviceinitProcessOutput
            //     // })
            //     console.log("------- CALLED STDOUT-----")

            //     console.log(
            //         `-------------init process stdout:\n${ab2str(data)}`
            //     )
            // })

            // deviceinitProcess.stdout.prependListener("data", (data) => {
            //     console.log("------- CALLED STDOUT FROM PREPENDLISTENER-----")

            //     console.log(
            //         `-------------init process stdout FROM PREPENDLISTENER:\n${ab2str(
            //             data
            //         )}`
            //     )
            // })
            deviceinitProcess.stderr.on("data", (data) => {
                // fs.readFile("./out.log", "utf8", (err, data) => {
                //     if (err) {
                //         console.error(err)
                //         return
                //     }
                //     console.log("------ STDOUT FROM FILE", data)
                // })
                // console.log(
                //     "-- STD OUT: ",
                //     deviceinitProcess.stdout.listenerCount("data")
                // )
                // console.log(
                //     "-- STD OUT: ",
                //     deviceinitProcess.stdout.readableDidRead
                // )
                // console.log("-- STD OUT: ", deviceinitProcess.stdout.readable)
                // console.log(
                //     "-- STD OUT: ",
                //     deviceinitProcess.stdout.listeners("data")
                // )

                // console.log('---- IS STDOUT PAUSED AFTER STDERR: ',deviceinitProcess.stdout.prependListener('data'))
                deviceinitProcess.stdout.resume()

                deviceinitProcessError = data.toString()
                console.error(`---------init process stderr:\n${data}`)
            })

            // deviceinitProcess.on("exit", function (code, signal) {
            //     console.log('-----init exit: ', code, signal)
            //     // const anotherProcess = spawn("espercli", ["enterprise", "show"], {cwd: '/'})
            //     // anotherProcess.stdout.on("data", (data) => {
            //     //     console.log(`-------------init process stdout:\n${data}`)
            //     // })
            //     // anotherProcess.stderr.on("data", (data) => {
            //     //     console.error(`---------init process stderr:\n${data}`)
            //     // })
            // })

            // close happens after process exit and all attached stdio streams have been closed
            deviceinitProcess.on("exit", function (code, signal) {
                console.log(
                    `deviceinitProcess process exited with code ${code} and signal ${signal}`
                )
                console.log("----- ERrror mesg: ", deviceinitProcessError)

                // On successfulExit
                if (code === 0 && signal === null) {
                    if (deviceinitProcessError === "") {
                        io.emit("initialized", {
                            success: true,
                            message: "Success",
                            data: deviceinitProcessOutput,
                        })
                    } else {
                        io.emit("initialized", {
                            success: false,
                            message: `Failed`,
                            data: deviceinitProcessError,
                        })
                    }
                } else {
                    io.emit("initialized", {
                        success: false,
                        message: `Failed`,
                        data: deviceinitProcessError,
                    })
                }
            })
        }

        const execInitialize = (deviceName) => {
            io.emit("startingInit")
            exec(
                `espercli secureadb connect -d ${deviceName}`,
                (err, stdout, stderr) => {
                    if (err) {
                        io.emit("initialized", {
                            success: false,
                            message: `Failed`,
                            data: err,
                        })
                        console.log("-----exec error: ", err)
                    }

                    console.log("----exec stdout: ", stdout)
                    console.log("----exec stderr: ", stderr)
                }
            )
        }

        const deviceInitialize = (devicename, socket) => {
            io.emit("startingInit")
            this.espercliPty = new PTYService(socket, "espercli")

            this.espercliPty.write(`espercli secureadb connect -d ${devicename}\n`)
        }

        const preconfigure = (socket) => {
            const preconfigProcess = spawn("espercli", ["configure", "-s"], {
                cwd: "/",
            })
            preconfigProcess.stdin.setEncoding("utf-8")
            preconfigProcess.stdout.pipe(process.stdout)

            preconfigProcess.stdin.write("olpcj\n")
            preconfigProcess.stdin.write("f6hpTc8nnRgo6WrAanTCnGgE9gcMWD\n")
            preconfigProcess.stdin.end()

            let preconfigProcessOutput = ""
            let preconfigProcessError = ""

            preconfigProcess.on("exit", function (code, signal) {
                console.log(
                    `preconfigProcess process exited with code ${code} and signal ${signal}`
                )
                // On successfulExit
                if (code === 0 && signal === null) {
                    socket.emit(
                        "preconfigured",
                        {
                            success: true,
                            message:
                                "Successfully configured espercli with your credentials",
                            data: preconfigProcessOutput,
                        },
                        (deviceName, connected) => {
                            if (connected) {
                                // initialize(deviceName) // Start device initiliation after client's ack'ment
                                // execInitialize(deviceName)
                                deviceInitialize(deviceName, socket)
                            }
                        }
                    )
                } else {
                    socket.emit("preconfigured", {
                        success: false,
                        message: `preconfigProcess process exited with code ${code} and signal ${signal}`,
                        data: preconfigProcessError,
                    })
                }
            })

            preconfigProcess.stdout.on("data", (data) => {
                preconfigProcessOutput = data.toString()
                console.log(
                    `-------------preconf process stdout:\n${ab2str(data)}`
                )
            })
            preconfigProcess.stderr.on("data", (data) => {
                preconfigProcessError = data.toString()
                console.error(`---------preconf process stderr:\n${data}`)
            })
        }

        

        io.on("connection", (socket) => {
            console.log("Client connect to socket.", socket.id)

            this.socket = socket
            console.log("--------- SERVER SOCKET: ", socket.connected)

            socket.on("disconnect", () => {
                console.log("Disconnected Socket: ", socket.id)
                console.log('----- ESPERCLI PROCESS', this.espercliPty.getPid())
                console.log('----- ADB PROCESS', this.espercliPty.getPid())
                // if (this.adbPty !== null) {
                //     this.adbPty.killPtyProcess()
                // }
                // if (this.espercliPty !== null) {
                //     this.espercliPty.killPtyProcess()
                // }
            })

            socket.on("startadb", (ipport) => {
                console.log('------- startadb event received ----')
                console.log('------- DEVICE IP:PORT: ', ipport)
                this.adbPty = new PTYService(socket, "adb")
    
                this.adbPty.write(`adb connect ${ipport}`) 

                socket.on("adbinput", (input) => {
                    this.adbPty.write(input) 
                })
            })

            // this.socket.on("deviceInitialize", (devicename) => {
            //     deviceInitialize(devicename)
            // })

            if (socket.connected) preconfigure(this.socket)

            
        })
    }
}

module.exports = SocketService
