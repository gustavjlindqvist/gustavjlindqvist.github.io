//
//  Models.swift
//  secret-game-client
//
//  Created by timas on 2023-05-29.
//

import Foundation

struct GameState: Equatable {
    ///2D array representation of gameboard, 42x42 tiles
    let gameBoard: [[Int]]

    let myPlayer: PlayerState
    let otherPlayers: [PlayerState]
}

struct PlayerState: Equatable {
    ///Representation of the player on the board
    let id: Int
    
    ///The players display name
    let name: String
    
    let x: Int
    let y: Int
    let isAlive: Bool
    
    ///Direction of the player in last step
    let direction: Direction
}

enum Direction: Equatable, CaseIterable {
    typealias DxDy = (dx: Int, dy: Int)
    
    case up
    case down
    case right
    case left
    
    init?(dxDy: DxDy) {
        switch dxDy {
        case (0, -1):
            self = .up
        case (0, 1):
            self = .down
        case (1, 0):
            self = .right
        case (-1, 0):
            self = .left
        default:
            return nil
        }
    }
    
    var dxdy: DxDy {
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
