//
//  Models.swift
//  secret-game-client
//
//  Created by timas on 2023-05-29.
//

import Foundation

struct GameState: Equatable {
    ///2D array representation of gameboard, 42x42 tiles
    let gameBoard: [[GameBoardObject]]

    let myPlayer: PlayerState
    let otherPlayers: [PlayerState]
}

enum GameBoardObject: Equatable {
    case player(id: Int)
    case empty
    case wall
}

struct PlayerState: Equatable {
    ///Representation of the player on the board
    let id: Int
    
    ///The players display name
    let name: String
    
    let x: Int
    let y: Int
    
    let isAlive: Bool
    
    ///Current direction of the player from last step
    let direction: Direction
}

enum Direction: Equatable, CaseIterable {
    
    case up
    case down
    case right
    case left
}
