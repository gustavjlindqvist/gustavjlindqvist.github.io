//
//  client.swift
//  secret-game-client
//
//  Created by timas on 2023-05-12.
//
import Foundation
import SocketIO

enum ServerEvent: String {
    case updatedGameStateForClient
}

struct GameState: Decodable {
    let gameBoard: [[Int]]
}


private extension SocketIOClient {
    func onServerEvent(_ event: ServerEvent, callback: @escaping NormalCallback) {
        on(event.rawValue, callback: callback)
    }
}

final class SecretClient {
    private let manager: SocketManager
    private let socket: SocketIOClient
    
    init(socketUrlString: String) {
        manager = SocketManager(socketURL: URL(string: socketUrlString)!)
        socket = manager.socket(forNamespace: "/gameClient")
        
        setupHandlers()
        
        socket.connect()
    }
    
    func setupHandlers() {
        socket.onServerEvent(.updatedGameStateForClient) { [weak self] data, ack in
            if let gameState = data[0] as? GameState {
                print(gameState)
            }
        }
    }
    
    func handleGameState(gameState: String) -> String {
        return gameState
    }
}
