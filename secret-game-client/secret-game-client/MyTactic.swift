//
//  MyTactic.swift
//  secret-game-client
//
//  Created by timas on 2023-05-27.
//

import Foundation

struct MyTactic: ClientTactic {
    //TODO: Settle on a name
    let name = "My Snake"
    
    //TODO: Implement next move tactic
    func getNextMove(gameState: GameState) -> Direction? {
        return nil
    }
}

// MARK: - Helper functions

private extension GameState {
    func isTileEmpty(x: Int, y: Int) -> Bool {
        gameObjectAt(x: x, y: y) == .empty
    }
    
    func gameObjectAt(x: Int, y: Int) -> GameBoardObject {
        let objectRepresenation = gameBoard[x][y]
        
        return GameBoardObject(from: objectRepresenation)
    }
    
    func player(withId id: Int) -> PlayerState? {
        otherPlayers.first { $0.id ==  id }
    }
}
