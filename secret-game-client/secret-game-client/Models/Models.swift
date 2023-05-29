//
//  Models.swift
//  secret-game-client
//
//  Created by timas on 2023-05-29.
//

import Foundation

struct GameState: Equatable {
    let gameBoard: [[Int]]
    let myPlayer: PlayerState
    let otherPlayers: [PlayerState]
}

struct PlayerState: Equatable {
    let x: Int
    let y: Int
    let dx: Int
    let dy: Int
    let id: Int
    let name: String
}

enum Direction: Equatable  {
    case up
    case down
    case right
    case left
    
    var dxdy: (dx: Int, dy: Int) {
        switch self {
        case .up:
            return (0, -1)
        case .down:
            return (0, 1)
        case .right:
            return (1, 0)
        case .left:
            return (-1 ,0)
        }
    }
}

enum GameBoardObject: Equatable {
    case player(id: Int)
    case empty
    case wall
    
    init(from objectRepresentation: Int) {
        switch objectRepresentation {
        case 0:
            self = .empty
        case -1:
            self = .wall
        default:
            self = .player(id: objectRepresentation)
        }
    }
}
