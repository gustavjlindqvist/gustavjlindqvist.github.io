//
//  Models.swift
//  secret-game-client
//
//  Created by timas on 2023-05-29.
//

import Foundation

struct GameState {
    let gameBoard: [[Int]]
    let myPlayer: PlayerState
    let otherPlayers: [PlayerState]
}

struct PlayerState {
    let x: Int
    let y: Int
    let dx: Int
    let dy: Int
    let id: Int
    let name: String
}
