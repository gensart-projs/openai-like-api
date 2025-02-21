const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

class WebSocketService {
    constructor(server) {
        this.io = socketIo(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        // Map to store user sessions
        this.userSessions = new Map();

        this.setupAuthentication();
        this.setupEventHandlers();
    }

    setupAuthentication() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = decoded;
                next();
            } catch (err) {
                next(new Error('Authentication error'));
            }
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.user.id}`);
            
            // Add user to sessions map
            this.userSessions.set(socket.user.id, socket);

            // Join user's room
            socket.join(`user:${socket.user.id}`);

            // Handle session updates
            socket.on('join:session', (sessionId) => {
                // Leave previous session rooms
                socket.rooms.forEach(room => {
                    if (room.startsWith('session:')) {
                        socket.leave(room);
                    }
                });
                
                // Join new session room
                socket.join(`session:${sessionId}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.user.id}`);
                this.userSessions.delete(socket.user.id);
            });
        });
    }

    // Emit events to clients
    emitToUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, data);
    }

    emitToSession(sessionId, event, data) {
        this.io.to(`session:${sessionId}`).emit(event, data);
    }

    // Event emission helpers
    notifySessionUpdate(sessionId, data) {
        this.emitToSession(sessionId, 'session:updated', data);
    }

    notifyNewMessage(sessionId, message) {
        this.emitToSession(sessionId, 'message:new', message);
    }

    notifyTyping(sessionId, userId, isTyping) {
        this.emitToSession(sessionId, 'user:typing', { userId, isTyping });
    }

    notifySessionCreated(userId, session) {
        this.emitToUser(userId, 'session:created', session);
    }

    notifySessionDeleted(userId, sessionId) {
        this.emitToUser(userId, 'session:deleted', { sessionId });
    }

    notifySessionArchived(userId, sessionId) {
        this.emitToUser(userId, 'session:archived', { sessionId });
    }

    notifyError(userId, error) {
        this.emitToUser(userId, 'error', error);
    }
}

let instance = null;

module.exports = {
    initialize: (server) => {
        instance = new WebSocketService(server);
        return instance;
    },
    getInstance: () => {
        if (!instance) {
            throw new Error('WebSocketService not initialized');
        }
        return instance;
    }
};