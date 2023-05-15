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
}
typealias Json = [String: Any]

struct ActivePower {
    let name: String
    let duration: Int
    
    init?(_ json: Json) {
        guard let name = json["name"] as? String,
              let duration = json["step"] as? Int else {
            return nil
        }
        
        self.name = name
        self.duration = duration
    }
}

struct Player {
    let x: Int
    let y: Int
    let dx: Int
    let dy: Int
    let activePower: ActivePower?
    
    init?(_ json: Json) {
        guard let x = json["x"] as? Int,
        let y = json["y"] as? Int,
            let dx = json["dx"] as? Int,
            let dy = json["dx"] as? Int,
            let activePower = json["activePower"] as? Json else {
                return nil
            }
        
        self.x = x
        self.y = y
        self.dx = dx
        self.dy = dy
        self.activePower = ActivePower(activePower)
    }
}

struct BoardPowerUp {
    let name: String
    let x: Int
    let y: Int
    
    init?(_ json: Json) {
        guard let name = json["name"] as? String,
        let x = json["x"] as? Int,
        let y = json["y"] as? Int
        else {
            return nil
        }
        
        self.name = name
        self.x = x
        self.y = y
    }
}

extension [Player] {
    init?(_ json: [Json]) {
        var players: [Player] = []
        for playerJson in json {
            guard let player = Player(playerJson) else {
                return nil
            }
            
            players.append(player)
        }
        
        self = players
    }
}

struct GameState {
    let gameBoard: [[Int]]
    let myPlayer: Player
    let otherPlayers: [Player]
    let boardPowerUp: BoardPowerUp?
    
    init?(_ json: Json) {
        guard let gameBoard = json["gameBoard"] as? [[Int]],
              let myPlayerJson = json["myState"] as? Json,
              let otherPlayersJson = json["otherPlayersState"] as? [Json],
              let myPlayer = Player(myPlayerJson),
              let otherPlayers = [Player].init(otherPlayersJson) else {
            return nil
        }
        
        self.gameBoard = gameBoard
        self.myPlayer = myPlayer
        self.otherPlayers = otherPlayers
        self.boardPowerUp = nil
//        self.boardPowerUp = (json["boardPowerUp"] as? Json).map { (powerUp: Json) -> BoardPowerUp? inreturn BoardPowerUp(powerUp)
//        }
    }
}


private extension SocketIOClient {
    func onServerEvent(_ event: ServerEvent, callback: @escaping NormalCallback) {
        on(event.rawValue, callback: callback)
    }
}

struct Move {
    let dx: Int
    let dy: Int
    
    var json: Json {
        [
            "move": [
                "dx": dx,
                "dy": dy
            ]
        ]
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
        socket.onServerEvent(.clientMove) { [weak self] data, ack in
            guard let self,
                  let gameStateDict = data[0] as? Json,
                  let parsedGameState = GameState(gameStateDict) else {
                return
            }
            
            let move = self.tactic(gameState: parsedGameState)
            ack.with(move.json)
        }
    }
    
    func tactic(gameState: GameState) -> Move {
        return Move(dx: 1, dy: 1)
    }
}
