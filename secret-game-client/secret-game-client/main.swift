//
//  main.swift
//  secret-game-client
//
//  Created by timas on 2023-05-12.
//

import Foundation

struct MyTactic: ClientTactic {
    //TODO: Settle on a name
    let name = "Timas"
    
    
    func getNextMove(gameState: GameState) -> (dx: Int, dy: Int) {
        //TODO: Implement a tactic
        return (1, 1)
    }
}

let client = SnakesOnAPlaneClient<MyTactic>(socketUrlString: "http://localhost:3000", tactic: MyTactic())

RunLoop.main.run()




