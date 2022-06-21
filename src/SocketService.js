// Manage Socket.IO server
const socketIO = require("socket.io");
const { Server } = require("socket.io");

const PTYService = require("./PTYService");

class SocketService {
  constructor() {
    this.socket = null;
    this.pty = null;
  }

  attachServer(server) {
    if (!server) {
      throw new Error("Server not found...");
    }

    const io = new Server(server, {
      cors: {
        origin: "http://localhost:3000"
      }
    })
    console.log("Created socket server. Waiting for client connection.");
    // "connection" event happens when any client connects to this io instance.
    io.on("connection", socket => {
      console.log("Client connect to socket.", socket.id);

      this.socket = socket;

      this.socket.on("disconnect", () => {
        console.log("Disconnected Socket: ", socket.id);
      });

      // Create a new pty service when client connects.
      this.pty = new PTYService(this.socket);

      // Attach any event listeners which runs if any event is triggered from socket.io client
      // For now, we are only adding "input" event, where client sends the strings you type on terminal UI.
      this.socket.on("input", input => {
        //Runs this event function socket receives "input" events from socket.io client
        console.log('------ RECEIVED INPUT FROM CLIENT:   ', input)
        this.pty.write(input);
      });
    });
  }
}

module.exports = SocketService;
