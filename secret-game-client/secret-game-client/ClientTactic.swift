//
//  ClientTactic.swift
//  secret-game-client
//
//  Created by timas on 2023-05-15.
//

protocol ClientTactic {
    var name: String { get }
    func getNextMove(gameState: GameState) -> (dx: Int, dy: Int)
}
