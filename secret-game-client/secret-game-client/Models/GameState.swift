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
    
    init?(_ json: Json) {
        guard let gameBoard = json["gameBoard"] as? [[Int]],
              let myPlayerJson = json["myState"] as? Json,
              let otherPlayersJson = json["otherPlayersState"] as? [Json],
              let myPlayer = PlayerState(myPlayerJson),
              let otherPlayers = [PlayerState].init(otherPlayersJson) else {
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
