//
//  main.swift
//  secret-game-client
//
//  Created by timas on 2023-05-12.
//

import Foundation

let serverUrl = "http://mrtims.local:3000"
let tactic = MyTactic()
let client = SnakesOnAPlaneClient(socketUrlString: serverUrl, tactic: tactic)

RunLoop.main.run()
