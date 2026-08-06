"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRegistry = void 0;
var chat_event_js_1 = require("./handlers/chat.event.js");
var EventRegistry = /** @class */ (function () {
    function EventRegistry() {
    }
    EventRegistry.handle = function (io, socket) {
        var chatHandler = new chat_event_js_1.ChatHandler(io, socket);
        chatHandler.register();
        socket.on("disconnect", function (reason) {
            console.log("Socket ".concat(socket.id, " quit: ").concat(reason));
        });
    };
    return EventRegistry;
}());
exports.EventRegistry = EventRegistry;
