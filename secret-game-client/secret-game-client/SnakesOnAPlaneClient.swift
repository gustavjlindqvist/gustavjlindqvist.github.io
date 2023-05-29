//
//  client.swift
//  secret-game-client
//
//  Created by timas on 2023-05-12.
//
import Foundation
import SocketIO

enum ServerEvent: String {
    case clientMove
    case connect
}

enum ClientEvent: String {
    case playerJoined
}

private extension SocketIOClient {
    func onServerEvent(_ event: ServerEvent, callback: @escaping NormalCallback) {
        on(event.rawValue, callback: callback)
    }
    
    func emitClientEvent(_ event: ClientEvent, items: SocketData...) {
        emit(event.rawValue, items)
    }
}

final class SnakesOnAPlaneClient<T: ClientTactic> {
    private let manager: SocketManager
    private let socket: SocketIOClient
    private let tactic: ClientTactic
    
    init(server: Server, tactic: T) {
        manager = SocketManager(socketURL: server.url)
        socket = manager.socket(forNamespace: "/gameClient")
        self.tactic = tactic
        
        setupHandlers()
        
        socket.connect()
    }
    
    func setupHandlers() {
        socket.onServerEvent(.connect) { [weak self] _, _ in
            guard let self else {
                return
            }
            
            self.socket.emitClientEvent(.playerJoined, items: [ "name": self.tactic.name ])
        }
        
        socket.onServerEvent(.clientMove) { [weak self] data, ack in
            guard let self,
                  let gameStateDict = data[0] as? Json,
                  let parsedGameState = GameState(gameStateDict, name: self.tactic.name),
                  let move = self.tactic.getNextMove(gameState: parsedGameState) else {
                ack.with([])
                return
            }
            
            let (dx, dy) = move.dxdy
            
            let response: Json = [
                "name": self.tactic.name,
                "dx": dx,
                "dy": dy
            ]
            
            ack.with(response)
        }
    }
}
