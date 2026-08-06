"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHandler = void 0;
var ChatHandler = /** @class */ (function () {
    function ChatHandler(io, socket) {
        this.io = io;
        this.socket = socket;
    }
    ChatHandler.prototype.register = function () {
        // TODO: implement chat event handlers
    };
    return ChatHandler;
}());
exports.ChatHandler = ChatHandler;
