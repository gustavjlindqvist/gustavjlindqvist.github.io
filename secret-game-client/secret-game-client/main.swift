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
    
    //Return an enum
    func getNextMove(gameState: GameState) -> Move {
        return .right
    }
}

var client: SnakesOnAPlaneClient<MyTactic>?

// Usage
let browser = Browser()
browser.start()

let cancellable = browser.$hostPort.sink { hostPort in
    guard let hostPort else {
        return
    }
    
    client = SnakesOnAPlaneClient<MyTactic>(socketUrlString: "http://\(String(hostPort.host.dropLast(4))):\(hostPort.port)", tactic: MyTactic())
}

RunLoop.main.run()
