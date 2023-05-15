//
//  ActivePowerUp.swift
//  secret-game-client
//
//  Created by timas on 2023-05-15.
//

struct ActivePower {
    let name: String
    let duration: Int
    
    init?(_ json: Json) {
        guard let name = json["name"] as? String,
              let duration = json["step"] as? Int else {
            return nil
        }
        
        self.name = name
        self.duration = duration
    }
}
