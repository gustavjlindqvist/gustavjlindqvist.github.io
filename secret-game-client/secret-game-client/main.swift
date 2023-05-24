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
    
    //TODO: Implement next move tactic
    func getNextMove(gameState: GameState) -> Move? {
        let move: Move? = {
            if gameState.myPlayer.dx == 1 {
                return .down
            } else if gameState.myPlayer.dy == 1 {
                return .left
            } else if gameState.myPlayer.dx == -1 {
                return .up
            } else if gameState.myPlayer.dy == -1 {
                return .right
            }
            
            return nil
        }()
        
        let me = gameState.myPlayer
        
        if gameState.gameBoard[me.x + me.dx][me.y + me.dy] == 0 {
            return nil
        }
        
        return move
    }
}

var client: SnakesOnAPlaneClient<MyTactic>?
let browser = ServiceBrowser()

let cancellable = browser.$hostPort.sink { hostPort in
    guard let hostPort else {
        return
    }
    
    let hostPortString = "http://\(String(hostPort.host.dropLast(4))):\(hostPort.port)"
    
    client = SnakesOnAPlaneClient<MyTactic>(socketUrlString: hostPortString, tactic: MyTactic())
}

RunLoop.main.run()
