//
//  GameState.swift
//  secret-game-client
//
//  Created by timas on 2023-05-15.
//

struct GameState {
    let gameBoard: [[Int]]
    let myPlayer: PlayerState
    let otherPlayers: [PlayerState]
    let boardPowerUp: BoardPowerUpState?
    
    init?(_ json: Json, name: String) {
        guard let gameBoard = json["gameBoard"] as? [[Int]],
              let playerStatesJson = json["playerStates"] as? [Json],
              let playerStates = [PlayerState].init(playerStatesJson),
              let myState = playerStates.first(where: { $0.name == name }) else {
            return nil
        }
        
        self.gameBoard = gameBoard
        self.myPlayer = myState
        self.otherPlayers = playerStates.filter { $0.name != name }
        self.boardPowerUp = nil
//        self.boardPowerUp = (json["boardPowerUp"] as? Json).map { (powerUp: Json) -> BoardPowerUp? inreturn BoardPowerUp(powerUp)
//        }
    }
}
