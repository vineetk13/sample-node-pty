const http = require("http")
const SocketService = require("./SocketService")

const server = http.createServer((req, res) => {
    console.log('---- REQUEST: ', req)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.write("Terminal Server Running.")
    res.end()
})

const port = process.env.PORT || 8080

server.listen(port, function () {
    console.log("Server listening on : ", port)
    console.log("Environment variable SOCKET_PATH : ", process.env)
    const socketService = new SocketService()
    socketService.attachServer(server)
})
