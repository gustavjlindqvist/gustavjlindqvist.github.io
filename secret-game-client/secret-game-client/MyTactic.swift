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
        //Returning nil will make the snake continue in the direction it was going
        return nil
    }
}

// MARK: - Helper functions

private extension GameState {
    
    func isTileEmpty(x: Int, y: Int) -> Bool {
        gameBoard[x][y] == .empty
    }
    
    func moveMyPlayer(inDirection direction: Direction) -> (x: Int, y: Int) {
        (x: myPlayer.x + direction.dx, y: myPlayer.y + direction.dy)
    }
    
    func gameObjectNextToMyPlayer(inDirection direction: Direction) -> GameBoardObject {
        let movedPosition = moveMyPlayer(inDirection: direction)
        return gameBoard[movedPosition.x][movedPosition.y]
    }
    
    func player(withId id: Int) -> PlayerState? {
        otherPlayers.first { $0.id ==  id }
    }
}
