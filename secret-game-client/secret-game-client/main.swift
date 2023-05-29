//
//  main.swift
//  secret-game-client
//
//  Created by timas on 2023-05-12.
//

import Foundation

let tactic = MyTactic()
let client = SnakesOnAPlaneClient(server: .remote, tactic: tactic)

RunLoop.main.run()
