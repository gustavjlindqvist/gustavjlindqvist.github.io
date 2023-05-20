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
        return nil
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
