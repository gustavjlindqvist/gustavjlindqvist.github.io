//
//  BoardPowerUpState.swift
//  secret-game-client
//
//  Created by timas on 2023-05-15.
//

struct BoardPowerUpState {
    let name: String
    let x: Int
    let y: Int
    
    init?(_ json: Json) {
        guard let name = json["name"] as? String,
        let x = json["x"] as? Int,
        let y = json["y"] as? Int
        else {
            return nil
        }
        
        self.name = name
        self.x = x
        self.y = y
    }
}
